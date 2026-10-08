// AI providers behind one call: generateJson(config, request) returns schema-validated JSON from
//   • Lượm (Free): free models through OpenRouter on the key built into the app (./builtInKey.ts), named by tier
//     in the UI (./fallback.ts maps tiers to models);
//   • ChatGPT on the user's own account, through a hidden chatgpt.com window (../chatgptWeb.ts);
//   • Custom API: any OpenAI-compatible API (address, key and model chosen by the user).
// The custom key is stored encrypted with safeStorage and never reaches the renderer.
import { app, ipcMain, safeStorage } from 'electron'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { isLuomModel, normalizeBaseUrl, type AiConfig, type AiModelOption, type AiStatus, type LuomModel } from '../../shared/ai'
import { httpFetch } from '../dictionary'
import { extractJson, hasForeignScript, luomTierModels, parseModelList } from './parse'
import { FatalAiError, luomChain, tryInOrder, type LuomTier } from './fallback'
import { builtInOpenRouterKey } from './builtInKey'
import { askChatGpt, chatGptAccount, isSignedIn } from '../chatgptWeb'

// ─────────────────────────── secrets ───────────────────────────

const CUSTOM_KEY_FILE = 'custom-key.bin'
/** Saved by older versions: the Claude key (now a Custom API key) and an own OpenRouter key. */
const OLD_ANTHROPIC_KEY_FILE = 'anthropic-key.bin'
const OLD_OPENROUTER_KEY_FILE = 'openrouter-key.bin'
const secretPath = (file: string): string => join(app.getPath('userData'), file)

function readSecret(file: string): string | null {
  try {
    if (!existsSync(secretPath(file)) || !safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(readFileSync(secretPath(file))) || null
  } catch {
    return null
  }
}

/** The Custom API key (a Claude key saved by an older version counts). */
export const readCustomKey = (): string | null => readSecret(CUSTOM_KEY_FILE) ?? readSecret(OLD_ANTHROPIC_KEY_FILE)

/** Lượm (Free) key: the one built into the app (an older own OpenRouter key only in builds without one). */
const luomKey = (): string | null => builtInOpenRouterKey() ?? readSecret(OLD_OPENROUTER_KEY_FILE)

/** Save the Custom API key; an empty key removes it. */
export function writeCustomKey(key: string): void {
  const trimmed = key.trim()
  rmSync(secretPath(OLD_ANTHROPIC_KEY_FILE), { force: true })
  if (!trimmed) {
    rmSync(secretPath(CUSTOM_KEY_FILE), { force: true })
    return
  }
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is not available on this Mac.')
  writeFileSync(secretPath(CUSTOM_KEY_FILE), safeStorage.encryptString(trimmed))
}

// ─────────────────────────── providers ───────────────────────────

const OPENROUTER_URL = 'https://openrouter.ai/api/v1'
const TIMEOUT_MS = 180_000

export interface JsonRequest<S extends z.ZodType> {
  system: string
  user: string
  schema: S
  /** What is being made, for error messages ("an entry", "a story"). */
  what: string
  /** Someone is waiting (Write back): on Lượm (Free) Auto, try the quick model first. */
  fast?: boolean
}

/** Prompt suffix asking for JSON (answers come as free text). */
function jsonInstructions(schema: z.ZodType): string {
  return `\n\nReply with ONLY one JSON object (no markdown, no commentary) that matches this JSON Schema:\n${JSON.stringify(
    z.toJSONSchema(schema),
  )}`
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    return body.error?.message ?? res.statusText
  } catch {
    return res.statusText
  }
}

interface ChatTarget {
  url: string
  headers: Record<string, string>
  model: string
}

/** The request never got an answer (offline, wrong address, timeout). */
class UnreachableError extends Error {}

/** One OpenAI-style chat completion → the answer text. Throws with `label` naming the service in messages. */
async function chatText(target: ChatTarget, system: string, user: string, label: string): Promise<string> {
  const res = await httpFetch(`${target.url}/chat/completions`, {
    method: 'POST',
    headers: { ...target.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: target.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((e: unknown) => {
    throw new UnreachableError(`${label} could not be reached: ${(e as Error).message}`)
  })
  if (res.status === 401 || res.status === 403) throw new FatalAiError(`${label} rejected the API key.`)
  if (res.status === 429) throw new Error(`${label} is busy right now.`)
  if (!res.ok) throw new Error(`${label} error ${res.status}: ${await errorMessage(res)}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
  if (data.error?.message) throw new Error(`${label}: ${data.error.message}`)
  return data.choices?.[0]?.message?.content ?? ''
}

/** Ask a free-text model for JSON matching `req.schema`; `attempts` > 1 re-asks after an unusable answer. */
async function jsonFrom<S extends z.ZodType>(
  ask: (user: string) => Promise<string>,
  req: JsonRequest<S>,
  attempts: number,
): Promise<z.infer<S>> {
  let user = req.user + jsonInstructions(req.schema)
  for (let attempt = 0; attempt < attempts; attempt++) {
    const parsed = req.schema.safeParse(extractJson(await ask(user)))
    // Words from a third language (Thai, Korean, Chinese…) inside the answer make it unusable too.
    if (parsed.success && !hasForeignScript(JSON.stringify(parsed.data))) return parsed.data
    user = `${req.user}${jsonInstructions(req.schema)}\n\n${
      parsed.success
        ? 'Your previous answer mixed in words from another language. Use only English and Vietnamese.'
        : 'Your previous answer was not valid JSON for this schema.'
    } Answer again with only the JSON object.`
  }
  throw new Error(`The model did not return a usable answer for ${req.what}.`)
}

// ── Lượm (Free) ──

/** The free catalogue, read at most every 6 hours, to use the newest model of each tier. */
let catalogue: { at: number; tiers: Partial<Record<LuomTier, string>> } | null = null
async function liveTiers(): Promise<Partial<Record<LuomTier, string>>> {
  if (catalogue && Date.now() - catalogue.at < 6 * 3600_000) return catalogue.tiers
  try {
    const res = await httpFetch(`${OPENROUTER_URL}/models`, { signal: AbortSignal.timeout(10_000) })
    if (res.ok) catalogue = { at: Date.now(), tiers: luomTierModels(await res.json()) }
  } catch {
    // offline or slow: the known models will do
  }
  return catalogue?.tiers ?? {}
}

/** Lượm's free models in order (the chosen one first); a model that fails or answers badly hands over. Messages
 *  never name the models or the service behind them. */
async function viaLuom<S extends z.ZodType>(req: JsonRequest<S>, model: LuomModel): Promise<z.infer<S>> {
  const key = luomKey()
  if (!key) throw new Error('Lượm (Free) is not available in this copy of the app. Use ChatGPT or a Custom API in Settings → AI.')
  // HTTP header: Latin-1 only, so the plain spelling.
  const headers = { Authorization: `Bearer ${key}`, 'X-Title': 'Luom' }
  try {
    return await tryInOrder(luomChain(model, await liveTiers()), (id) =>
      jsonFrom((user) => chatText({ url: OPENROUTER_URL, headers, model: id }, req.system, user, id), req, 1).catch(
        (e: unknown) => {
          console.warn(`[ai] ${(e as Error).message}`)
          throw e
        },
      ),
    )
  } catch (e) {
    if (e instanceof FatalAiError)
      throw new Error('Lượm (Free) is not available right now. Use ChatGPT or a Custom API in Settings → AI.')
    throw new Error('Lượm (Free) is busy right now. Try again in a minute, or pick another model in Settings → AI.')
  }
}

// ── Custom API ──

/** Request target for a Custom API (null when the address is not set). */
function customTarget(cfg: AiConfig): Omit<ChatTarget, 'model'> | null {
  const url = normalizeBaseUrl(cfg.baseUrl ?? '')
  if (!url) return null
  const key = readCustomKey()
  const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {}
  // Anthropic's API lists models only with its own key header (chat works with the Bearer one too).
  if (key && new URL(url).hostname === 'api.anthropic.com') Object.assign(headers, { 'x-api-key': key, 'anthropic-version': '2023-06-01' })
  return { url, headers }
}

async function viaCustom<S extends z.ZodType>(cfg: AiConfig, req: JsonRequest<S>): Promise<z.infer<S>> {
  const target = customTarget(cfg)
  if (!target) throw new Error('Add the API base URL in Settings → AI first.')
  if (!cfg.model) throw new Error('Choose a model for your API in Settings → AI first.')
  try {
    return await jsonFrom((user) => chatText({ ...target, model: cfg.model! }, req.system, user, 'Your API'), req, 2)
  } catch (e) {
    if (e instanceof FatalAiError) throw new Error('Your API rejected the key. Check it in Settings → AI.')
    if (e instanceof UnreachableError)
      throw new Error('Could not reach your API. Check the address in Settings → AI, and that you are online.')
    throw e
  }
}

/** Ask the configured provider for JSON matching `req.schema`. ChatGPT falls back to Lượm (Free) when the user is
 *  not signed in or ChatGPT fails. */
export async function generateJson<S extends z.ZodType>(cfg: AiConfig, req: JsonRequest<S>): Promise<z.infer<S>> {
  if (cfg.provider === 'custom') return viaCustom(cfg, req)
  if (cfg.provider === 'luom') {
    const model = isLuomModel(cfg.model) ? cfg.model : 'auto'
    return viaLuom(req, model === 'auto' && req.fast ? 'super' : model)
  }
  const hasFallback = luomKey() !== null
  if (await isSignedIn()) {
    try {
      // A chat has no system slot: the instructions go first in the message.
      return await jsonFrom((user) => askChatGpt(`${req.system}\n\n${user}`), req, 2)
    } catch (e) {
      if (!hasFallback) throw e
    }
  } else if (!hasFallback) {
    throw new Error('Sign in to ChatGPT in Settings → AI first.')
  }
  return viaLuom(req, 'auto')
}

// ─────────────────────────── settings support ───────────────────────────

/** Models of a Custom API (its /models list); Lượm and ChatGPT have fixed choices in the renderer. */
export async function listModels(cfg: AiConfig): Promise<{ models: AiModelOption[]; error?: string }> {
  if (cfg.provider !== 'custom') return { models: [] }
  const target = customTarget(cfg)
  if (!target) return { models: [], error: 'Add the API base URL first.' }
  const typeIt = 'Type the model name instead.'
  try {
    const res = await httpFetch(`${target.url}/models`, { headers: target.headers, signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return { models: [], error: `Could not load the model list (error ${res.status}). ${typeIt}` }
    const models = parseModelList(await res.json())
    return models.length ? { models } : { models, error: `This API did not list any models. ${typeIt}` }
  } catch {
    return { models: [], error: `Could not load the model list. ${typeIt}` }
  }
}

export async function aiStatus(cfg: AiConfig): Promise<AiStatus> {
  if (cfg.provider === 'chatgpt-web') {
    const account = await chatGptAccount()
    if (account !== null)
      return { ready: true, message: account ? `Signed in as ${account}.` : 'Signed in to ChatGPT.', chatGptSignedIn: true }
    return luomKey() !== null
      ? { ready: true, message: 'Not signed in to ChatGPT: using Lượm (Free) for now.', chatGptSignedIn: false }
      : { ready: false, message: 'Sign in to ChatGPT to use it.', chatGptSignedIn: false }
  }
  if (cfg.provider === 'luom')
    return luomKey() !== null
      ? { ready: true, message: 'Free, with nothing to set up.' }
      : { ready: false, message: 'Not available in this copy of the app.' }
  if (!normalizeBaseUrl(cfg.baseUrl ?? '')) return { ready: false, message: 'Add the API base URL.' }
  if (!cfg.model) return { ready: false, message: 'Choose a model.' }
  return { ready: true, message: readCustomKey() !== null ? 'Key saved.' : 'No key saved (fine for a local server).' }
}

export function registerAiIpc(): void {
  ipcMain.handle('ai:status', (_e, cfg: AiConfig) => aiStatus(cfg))
  ipcMain.handle('ai:models', (_e, cfg: AiConfig) => listModels(cfg))
  ipcMain.handle('ai:has-key', () => readCustomKey() !== null)
  ipcMain.handle('ai:set-key', (_e, key: string) => writeCustomKey(key))
}
