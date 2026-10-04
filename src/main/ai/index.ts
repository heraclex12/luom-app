// AI providers behind one call: generateJson(config, request) returns schema-validated JSON from
//   • Claude (Anthropic API, native structured output),
//   • OpenRouter (OpenAI-compatible chat completions; free models available),
//   • ChatGPT on the user's own account, through a hidden chatgpt.com window (../chatgptWeb.ts).
// Keys are stored encrypted with safeStorage and never reach the renderer.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { app, ipcMain, safeStorage } from 'electron'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import {
  DEFAULT_OPENROUTER_MODEL,
  type AiConfig,
  type AiModelOption,
  type AiProvider,
  type AiStatus,
} from '../../shared/ai'
import { AI_MODELS, DEFAULT_AI_MODEL, type AiModel } from '../../shared/enrich'
import { httpFetch } from '../dictionary'
import { extractJson, hasForeignScript, parseFreeModels } from './parse'
import { FatalAiError, modelChain, tryInOrder } from './fallback'
import { builtInOpenRouterKey } from './builtInKey'
import { askChatGpt, isSignedIn } from '../chatgptWeb'

// ─────────────────────────── secrets ───────────────────────────

type KeyedProvider = Exclude<AiProvider, 'chatgpt-web'>
const KEY_FILES: Record<KeyedProvider, string> = { anthropic: 'anthropic-key.bin', openrouter: 'openrouter-key.bin' }
const keyPath = (p: KeyedProvider): string => join(app.getPath('userData'), KEY_FILES[p])

export function readKey(provider: KeyedProvider): string | null {
  try {
    if (!existsSync(keyPath(provider)) || !safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(readFileSync(keyPath(provider))) || null
  } catch {
    return null
  }
}

/** OpenRouter key to use: the user's own, else the key built into this app (free models). */
const openRouterKey = (): string | null => readKey('openrouter') ?? builtInOpenRouterKey()

export function writeKey(provider: KeyedProvider, key: string): void {
  const trimmed = key.trim()
  if (!trimmed) {
    rmSync(keyPath(provider), { force: true })
    return
  }
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is not available on this Mac.')
  writeFileSync(keyPath(provider), safeStorage.encryptString(trimmed))
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
}

/** Prompt suffix for providers without native structured output. */
function jsonInstructions(schema: z.ZodType): string {
  return `\n\nReply with ONLY one JSON object (no markdown, no commentary) that matches this JSON Schema:\n${JSON.stringify(
    z.toJSONSchema(schema),
  )}`
}

async function viaClaude<S extends z.ZodType>(cfg: AiConfig, req: JsonRequest<S>): Promise<z.infer<S>> {
  const apiKey = readKey('anthropic')
  if (!apiKey) throw new Error('Add your Anthropic API key in Settings → AI first.')
  const model: AiModel = AI_MODELS.some((m) => m.id === cfg.model) ? (cfg.model as AiModel) : DEFAULT_AI_MODEL
  const client = new Anthropic({ apiKey })
  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
      // Short structured jobs: low effort is plenty (Haiku 4.5 does not accept effort at all).
      output_config:
        model === 'claude-haiku-4-5'
          ? { format: betaZodOutputFormat(req.schema) }
          : { format: betaZodOutputFormat(req.schema), effort: 'low' },
      // Opus: if a request is declined by a safety classifier, the server retries on a fallback model.
      ...(model === 'claude-opus-5' ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    })
    if (response.stop_reason === 'refusal') throw new Error(`Claude declined to write ${req.what} for this.`)
    if (!response.parsed_output) throw new Error('Claude returned an unexpected answer. Please try again.')
    return response.parsed_output as z.infer<S>
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Your Anthropic API key was rejected. Check it in Settings → AI.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited by the Anthropic API. Try again in a moment.')
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Could not reach the Anthropic API. Are you online?')
    if (e instanceof Anthropic.APIError) throw new Error(`Anthropic API error ${e.status ?? ''}: ${e.message}`)
    throw e
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    return body.error?.message ?? res.statusText
  } catch {
    return res.statusText
  }
}

async function openRouterText(model: string, system: string, user: string): Promise<string> {
  const apiKey = openRouterKey()
  if (!apiKey) throw new FatalAiError('Add your OpenRouter API key in Settings → AI first.')
  const res = await httpFetch(`${OPENROUTER_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'EnVi Learn',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.status === 401) throw new FatalAiError('Your OpenRouter API key was rejected. Check it in Settings → AI.')
  if (res.status === 429) throw new Error(`${model} is busy right now.`)
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await errorMessage(res)}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
  if (data.error?.message) throw new Error(`OpenRouter: ${data.error.message}`)
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

/** OpenRouter free models in order (the chosen one first); a model that fails or answers badly hands over. */
async function viaFreeModels<S extends z.ZodType>(req: JsonRequest<S>, preferred?: string): Promise<z.infer<S>> {
  try {
    return await tryInOrder(modelChain(preferred), (model) =>
      jsonFrom((user) => openRouterText(model, req.system, user), req, 1).catch((e: unknown) => {
        console.warn(`[ai] ${model} failed: ${(e as Error).message}`)
        throw e
      }),
    )
  } catch (e) {
    if (e instanceof FatalAiError) throw e
    throw new Error(`None of the free models could answer right now. Try again in a minute. (${(e as Error).message})`)
  }
}

/** Ask the configured provider for JSON matching `req.schema`. ChatGPT falls back to the free OpenRouter models
 *  when the user is not signed in or ChatGPT fails (as long as an OpenRouter key is saved). */
export async function generateJson<S extends z.ZodType>(cfg: AiConfig, req: JsonRequest<S>): Promise<z.infer<S>> {
  if (cfg.provider === 'anthropic') return viaClaude(cfg, req)
  if (cfg.provider === 'openrouter') return viaFreeModels(req, cfg.model || DEFAULT_OPENROUTER_MODEL)
  const hasFallback = openRouterKey() !== null
  if (await isSignedIn()) {
    try {
      // A chat has no system slot: the instructions go first in the message.
      return await jsonFrom((user) => askChatGpt(`${req.system}\n\n${user}`), req, 2)
    } catch (e) {
      if (!hasFallback) throw e
    }
  } else if (!hasFallback) {
    throw new Error('Sign in to ChatGPT, or add an OpenRouter key for free models, in Settings → AI.')
  }
  return viaFreeModels(req)
}

// ─────────────────────────── settings support ───────────────────────────

export async function listModels(cfg: AiConfig): Promise<{ models: AiModelOption[]; error?: string }> {
  try {
    if (cfg.provider === 'anthropic') return { models: AI_MODELS.map((m) => ({ id: m.id, name: m.label })) }
    if (cfg.provider === 'chatgpt-web') return { models: [{ id: 'default', name: 'Your account’s default model' }] }
    const res = await httpFetch(`${OPENROUTER_URL}/models`, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return { models: [], error: `OpenRouter error ${res.status}` }
    return { models: parseFreeModels(await res.json()) }
  } catch {
    return { models: [], error: 'Could not load the model list. Are you online?' }
  }
}

export async function aiStatus(cfg: AiConfig): Promise<AiStatus> {
  if (cfg.provider === 'chatgpt-web') {
    if (await isSignedIn()) return { ready: true, message: 'Signed in to ChatGPT.', chatGptSignedIn: true }
    return openRouterKey() !== null
      ? { ready: true, message: 'Not signed in to ChatGPT: using free models.', chatGptSignedIn: false }
      : { ready: false, message: 'Sign in to ChatGPT, or add an OpenRouter key for free models.', chatGptSignedIn: false }
  }
  if (cfg.provider === 'openrouter' && readKey('openrouter') === null && builtInOpenRouterKey() !== null)
    return { ready: true, message: 'Using the built-in free key.' }
  const hasKey = readKey(cfg.provider) !== null
  return hasKey
    ? { ready: true, message: 'Key saved.' }
    : { ready: false, message: `Add your ${cfg.provider === 'anthropic' ? 'Anthropic' : 'OpenRouter'} API key.` }
}

export function registerAiIpc(): void {
  ipcMain.handle('ai:status', (_e, cfg: AiConfig) => aiStatus(cfg))
  ipcMain.handle('ai:models', (_e, cfg: AiConfig) => listModels(cfg))
  ipcMain.handle('ai:has-key', (_e, provider: KeyedProvider) => readKey(provider) !== null)
  ipcMain.handle('ai:has-built-in-key', () => builtInOpenRouterKey() !== null)
  ipcMain.handle('ai:set-key', (_e, provider: KeyedProvider, key: string) => writeKey(provider, key))
}
