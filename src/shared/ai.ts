// AI provider contract shared by main (src/main/ai) and the renderer settings.

/** luom = Lượm (Free): free models on a key built into the app, nothing to set up;
 *  chatgpt-web = your ChatGPT account, signed in once in a built-in chatgpt.com window (src/main/chatgptWeb.ts);
 *  custom = any OpenAI-compatible API with your own address, key and model. */
export type AiProvider = 'luom' | 'chatgpt-web' | 'custom'

/** Lượm (Free) choices. Shown by name only: main maps each to a model (src/main/ai/fallback.ts). */
export type LuomModel = 'auto' | 'lightning' | 'nano' | 'super' | 'ultra'

export const LUOM_MODELS: readonly { id: LuomModel; name: string; hint: string }[] = [
  { id: 'auto', name: 'Auto', hint: 'Uses whichever free model has room right now, so it is rarely busy.' },
  { id: 'lightning', name: 'Lightning', hint: 'Thinks longer before it answers; often slow.' },
  { id: 'nano', name: 'Nano', hint: 'Small and quick, but busy at times.' },
  { id: 'super', name: 'Super', hint: 'Quick, with good writing.' },
  { id: 'ultra', name: 'Ultra', hint: 'The best writing; takes a little longer.' },
]

export const isLuomModel = (v: unknown): v is LuomModel => LUOM_MODELS.some((m) => m.id === v)

/** A free model id saved by an older version → the Lượm choice it belongs to (anything else → Auto). */
export function luomModelForId(id: unknown): LuomModel {
  if (typeof id !== 'string' || !id.startsWith('nvidia/nemotron')) return 'auto'
  return LUOM_MODELS.find((m) => m.id !== 'auto' && new RegExp(`[-/.]${m.id}\\b`).test(id))?.id ?? 'auto'
}

export interface AiConfig {
  provider: AiProvider
  /** luom: a LuomModel; custom: the API's model id; chatgpt-web: unused (the account's default model). */
  model?: string
  /** custom only: the API base URL, e.g. https://api.openai.com/v1. */
  baseUrl?: string
}

export interface AiModelOption {
  id: string
  name: string
}

/** A pasted API address → the base the app calls (…/chat/completions, …/models), or null when not an http(s) URL. */
export function normalizeBaseUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const path = url.pathname.replace(/\/+$/, '').replace(/\/(chat\/completions|models)$/, '')
  return `${url.origin}${path}`
}

/** Whether the provider is usable right now, with a user-readable reason when not. */
export interface AiStatus {
  ready: boolean
  message: string
  /** chatgpt-web only: signed in to ChatGPT (it can be ready without, through Lượm (Free)). */
  chatGptSignedIn?: boolean
}

/** Sign in with Chrome (ChatGPT account): how it ended. */
export type ChromeSignInResult =
  | { ok: true }
  | { ok: false; reason: 'no-chrome' | 'busy' | 'cancelled' | 'not-signed-in' | 'failed'; message: string }
