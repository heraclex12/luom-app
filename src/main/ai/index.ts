// AI providers behind one call: generateJson(config, request) returns schema-validated JSON from
//   • Lượm (Free): free models through OpenRouter on the key built into the app (./builtInKey.ts), named by tier
//     in the UI (./fallback.ts maps tiers to models);
//   • ChatGPT on the user's own account, through a hidden chatgpt.com window (../chatgptWeb.ts);
//   • Custom API: any OpenAI-compatible API (address, key and model chosen by the user).
// The custom key is stored encrypted with safeStorage and never reaches the renderer.
import { app, BrowserWindow, ipcMain, net, safeStorage } from 'electron'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { isLuomModel, normalizeBaseUrl, type AiConfig, type AiProvider, type AiModelOption, type AiStatus, type LuomModel } from '../../shared/ai'
import { httpFetch } from '../dictionary'
import { extractJson, hasForeignScript, luomTierModels, parseModelList, readSse } from './parse'
import { afterAnswer, answersLeft, FREE_DAILY_ANSWERS, localDay, type FreeUsage } from './quota'
import { FatalAiError, luomChain, patienceMs, tryInOrder, withBackup, type LuomTier } from './fallback'
import { AiError, failReason } from './failure'
import { builtInOpenRouterKey } from './builtInKey'
import { askChatGpt, chatGptAccount, isSignedIn } from '../chatgptWeb'
import { recordUsage } from '../telemetry'
import { aiBackupEvent, aiEvent, aiFailEvent, aiSecondsEvent } from '../telemetryState'

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
  /** A long answer (an episode, a story): Lượm (Free) tries its steadiest models before the free models router. */
  long?: boolean
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
  /** Stream the answer and give up when the model sends nothing (thinking or text) for this long. A model that is
   *  writing is never cut off, however long the answer; a stuck or queued one sends nothing. */
  silenceMs?: number
  /** Stops the request from outside (the backup AI answered first). */
  cancel?: AbortSignal
}

/** Lượm (Free): working models start sending within a second (measured); 30 s of nothing means stuck. */
const LUOM_SILENCE_MS = 30_000
/** Safety stop for a streamed answer that keeps trickling forever. */
const STREAM_MAX_MS = 600_000

/** The request never got an answer (offline, wrong address). */
class UnreachableError extends AiError {
  constructor(message: string) {
    super(message, 'offline')
  }
}

/** One OpenAI-style chat completion → the answer text. Throws with `label` naming the service in messages. */
async function chatText(target: ChatTarget, system: string, user: string, label: string): Promise<string> {
  const stream = target.silenceMs !== undefined
  // Streaming: aborted after silenceMs without progress (re-armed on every piece), or at the safety stop.
  const controller = new AbortController()
  let silence: ReturnType<typeof setTimeout> | undefined
  const quiet = (): void => {
    clearTimeout(silence)
    silence = setTimeout(() => controller.abort(new AiError(`${label} sent nothing for ${target.silenceMs! / 1000} s.`, 'slow')), target.silenceMs)
  }
  if (stream) quiet()
  const limits = stream ? [controller.signal, AbortSignal.timeout(STREAM_MAX_MS)] : [AbortSignal.timeout(TIMEOUT_MS)]
  const signal = AbortSignal.any(target.cancel ? [...limits, target.cancel] : limits)
  try {
    const res = await httpFetch(`${target.url}/chat/completions`, {
      method: 'POST',
      headers: { ...target.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: target.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        ...(stream ? { stream: true } : {}),
      }),
      signal,
    }).catch((e: unknown) => {
      if (controller.signal.aborted) throw controller.signal.reason
      if (target.cancel?.aborted) throw target.cancel.reason
      if ((e as Error).name === 'TimeoutError') throw new AiError(`${label} took too long to answer.`, 'slow')
      throw new UnreachableError(`${label} could not be reached: ${(e as Error).message}`)
    })
    if (res.status === 401) throw new FatalAiError(`${label} rejected the API key.`)
    // OpenRouter also answers 403 for one model ("only available on agentic harnesses", moderation): the next model
    // may still work, so it is not fatal.
    if (res.status === 403) throw new AiError(`${label} refused: ${await errorMessage(res)}`, 'server')
    if (res.status === 429) throw new AiError(`${label} is busy right now.`, 'busy')
    if (!res.ok) throw new AiError(`${label} error ${res.status}: ${await errorMessage(res)}`, 'server')
    if (stream && res.body) return await readStream(res.body, label, quiet).catch((e: unknown) => {
      if (controller.signal.aborted) throw controller.signal.reason
      if (target.cancel?.aborted) throw target.cancel.reason
      throw (e as Error).name === 'TimeoutError' ? new AiError(`${label} took too long to answer.`, 'slow') : e
    })
    return await readAnswer(res, label)
  } finally {
    clearTimeout(silence)
  }
}

/** A streamed answer's text; `progress` is called for every piece the model sends. */
async function readStream(body: ReadableStream<Uint8Array>, label: string, progress: () => void): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text
    const { events, rest } = readSse(buffer + decoder.decode(value, { stream: true }))
    buffer = rest
    for (const e of events) {
      if ('done' in e) return text
      if (e.error) throw new AiError(`${label}: ${e.error}`, 'server')
      if (e.progress) progress()
      text += e.content
    }
  }
}

async function readAnswer(res: Response, label: string): Promise<string> {
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
  if (data.error?.message) throw new AiError(`${label}: ${data.error.message}`, 'server')
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
  throw new AiError(`The model did not return a usable answer for ${req.what}.`, 'bad-answer')
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

// Daily free answers on this Mac (./quota.ts), kept in the app's data folder.
const usagePath = (): string => join(app.getPath('userData'), 'luom-free-usage.json')
function readUsage(): FreeUsage | null {
  try {
    return JSON.parse(readFileSync(usagePath(), 'utf8')) as FreeUsage
  } catch {
    return null
  }
}
export const freeAnswersLeft = (): number => answersLeft(readUsage(), localDay(Date.now()))
function countAnswer(): void {
  try {
    writeFileSync(usagePath(), JSON.stringify(afterAnswer(readUsage(), localDay(Date.now()))))
  } catch (e) {
    console.warn(`[ai] could not save the free answer count: ${(e as Error).message}`)
  }
  // The sidebar shows what is left.
  const left = freeAnswersLeft()
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('ai:free-left', left)
}

declare const __AI_BACKUP_URL__: string

/** One answer from the backup AI: Lượm's server relays to a fast paid model, whose key never ships in the app. */
async function askBackup(system: string, user: string, cancel: AbortSignal): Promise<string> {
  const res = await httpFetch(__AI_BACKUP_URL__, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, user }),
    signal: AbortSignal.any([cancel, AbortSignal.timeout(100_000)]),
  }).catch((e: unknown) => {
    if (cancel.aborted) throw cancel.reason
    throw new UnreachableError(`The backup could not be reached: ${(e as Error).message}`)
  })
  // 429: the server's daily caps (per IP, or for everyone) are reached.
  if (res.status === 429) throw new AiError('The backup is at its daily limit.', 'busy')
  if (!res.ok) throw new AiError(`The backup error ${res.status}.`, 'server')
  const { text } = (await res.json()) as { text?: unknown }
  return typeof text === 'string' ? text : ''
}

/** Today's free answers are used up. */
class FreeLimitError extends Error {}

/**
 * Lượm's free models in order (the chosen one first); a model that fails or answers badly hands over. When they all
 * fail, or are still at it after patienceMs, the backup AI (./fallback.ts withBackup) is asked too and the first
 * answer wins. Messages never name the models or the service behind them. Each answer uses one of today's free answers.
 */
async function viaLuom<S extends z.ZodType>(req: JsonRequest<S>, model: LuomModel): Promise<z.infer<S>> {
  const key = luomKey()
  if (!key) throw new Error('Lượm (Free) is not available in this copy of the app. Use ChatGPT or a Custom API in Settings → AI.')
  if (freeAnswersLeft() === 0)
    throw new FreeLimitError(
      `You've used today's ${FREE_DAILY_ANSWERS} free AI answers. More tomorrow, or connect ChatGPT or your own API in Settings → AI.`,
    )
  // No network (the Mac just woke, Wi-Fi is off): say so at once instead of trying every model.
  if (!net.isOnline()) throw new AiError('Lượm (Free) needs the internet. Check your connection and try again.', 'offline')
  // HTTP header: Latin-1 only, so the plain spelling.
  const headers = { Authorization: `Bearer ${key}`, 'X-Title': 'Luom' }
  const chain = luomChain(model, await liveTiers(), { long: req.long })
  const free = (cancel: AbortSignal): Promise<z.infer<S>> =>
    tryInOrder(chain, (id) => {
      if (cancel.aborted) return Promise.reject(cancel.reason)
      return jsonFrom(
        (user) => chatText({ url: OPENROUTER_URL, headers, model: id, silenceMs: LUOM_SILENCE_MS, cancel }, req.system, user, id),
        req,
        1,
      ).catch((e: unknown) => {
        if (!cancel.aborted) console.warn(`[ai] ${(e as Error).message}`)
        throw e
      })
    })
  const backup = __AI_BACKUP_URL__
    ? async (cancel: AbortSignal): Promise<z.infer<S>> => {
        try {
          const answer = await jsonFrom((user) => askBackup(req.system, user, cancel), req, 1)
          recordUsage(aiBackupEvent(req.what, 'ok'))
          return answer
        } catch (e) {
          // Stopped because the free models answered first: not a failure.
          if (!cancel.aborted) {
            console.warn(`[ai] ${(e as Error).message}`)
            recordUsage(aiBackupEvent(req.what, 'fail'))
          }
          throw e
        }
      }
    : null
  try {
    const { value } = await withBackup(free, backup, patienceMs(req))
    countAnswer()
    return value
  } catch (e) {
    // The last free model's reason stands for the whole try (the stats tell offline, busy and unusable answers apart).
    const reason = failReason(e)
    if (reason === 'key') throw new AiError('Lượm (Free) is not available right now. Use ChatGPT or a Custom API in Settings → AI.', reason)
    if (reason === 'offline') throw new AiError('Lượm (Free) could not be reached. Check your internet connection and try again.', reason)
    throw new AiError('Lượm (Free) is busy right now. Try again in a minute, or pick another model in Settings → AI.', reason)
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
    if (e instanceof FatalAiError) throw new AiError('Your API rejected the key. Check it in Settings → AI.', 'key')
    if (e instanceof UnreachableError)
      throw new AiError('Could not reach your API. Check the address in Settings → AI, and that you are online.', 'offline')
    throw e
  }
}

/** Ask the configured provider for JSON matching `req.schema`. ChatGPT falls back to Lượm (Free) when the user is
 *  not signed in or ChatGPT fails. Each call is counted for the anonymous usage stats (../telemetry.ts) under the
 *  service that answered. */
export async function generateJson<S extends z.ZodType>(cfg: AiConfig, req: JsonRequest<S>): Promise<z.infer<S>> {
  let served: AiProvider = cfg.provider
  const via = <T>(provider: AiProvider, run: () => Promise<T>): Promise<T> => {
    served = provider
    return run()
  }
  const started = Date.now()
  try {
    const out = await answerJson(cfg, req, via)
    recordUsage(aiEvent(req.what, served, 'ok'))
    recordUsage(aiSecondsEvent(req.what, served), Math.round((Date.now() - started) / 1000))
    return out
  } catch (e) {
    if (e instanceof FreeLimitError) recordUsage(aiEvent(req.what, served, 'limit'))
    else {
      recordUsage(aiEvent(req.what, served, 'fail'))
      recordUsage(aiFailEvent(req.what, served, failReason(e)))
    }
    throw e
  }
}

async function answerJson<S extends z.ZodType>(
  cfg: AiConfig,
  req: JsonRequest<S>,
  via: <T>(provider: AiProvider, run: () => Promise<T>) => Promise<T>,
): Promise<z.infer<S>> {
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
  return via('luom', () => viaLuom(req, 'auto'))
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
  if (cfg.provider === 'luom') {
    if (luomKey() === null) return { ready: false, message: 'Not available in this copy of the app.' }
    const left = freeAnswersLeft()
    return {
      ready: true,
      message: left
        ? `Free: ${left} of ${FREE_DAILY_ANSWERS} answers left today.`
        : `Today's ${FREE_DAILY_ANSWERS} free answers are used. More tomorrow.`,
    }
  }
  if (!normalizeBaseUrl(cfg.baseUrl ?? '')) return { ready: false, message: 'Add the API base URL.' }
  if (!cfg.model) return { ready: false, message: 'Choose a model.' }
  return { ready: true, message: readCustomKey() !== null ? 'Key saved.' : 'No key saved (fine for a local server).' }
}

export function registerAiIpc(): void {
  ipcMain.handle('ai:status', (_e, cfg: AiConfig) => aiStatus(cfg))
  ipcMain.handle('ai:free-left', () => (luomKey() === null ? null : freeAnswersLeft()))
  ipcMain.handle('ai:models', (_e, cfg: AiConfig) => listModels(cfg))
  ipcMain.handle('ai:has-key', () => readCustomKey() !== null)
  ipcMain.handle('ai:set-key', (_e, key: string) => writeCustomKey(key))
}
