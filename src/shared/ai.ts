// AI provider contract shared by main (src/main/ai) and the renderer settings.

/** chatgpt-web = your ChatGPT account, signed in once in a built-in chatgpt.com window (src/main/chatgptWeb.ts);
 *  openrouter = OpenRouter (free models available); anthropic = Claude with your API key. */
export type AiProvider = 'chatgpt-web' | 'openrouter' | 'anthropic'

export interface AiConfig {
  provider: AiProvider
  /** Model id for the provider (Claude or OpenRouter id; ChatGPT uses the account's default model). */
  model?: string
}

export interface AiModelOption {
  id: string
  name: string
}

/** OpenRouter free models tried in this order when ChatGPT is not connected or fails, and after the chosen
 *  OpenRouter model when that one fails. */
export const FREE_MODEL_FALLBACKS: readonly string[] = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'thinkingmachines/inkling:free',
  'thinkingmachines/inkling-small:free',
  'nvidia/nemotron-3.5-lightning:free',
  'qwen/qwen3.8-27b:free',
]

export const DEFAULT_OPENROUTER_MODEL = FREE_MODEL_FALLBACKS[0]

/** Whether the provider is usable right now, with a user-readable reason when not. */
export interface AiStatus {
  ready: boolean
  message: string
  /** chatgpt-web only: signed in to ChatGPT (it can be ready without, through the free-model fallback). */
  chatGptSignedIn?: boolean
}
