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

export const DEFAULT_OPENROUTER_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'

/** Whether the provider is usable right now, with a user-readable reason when not. */
export interface AiStatus {
  ready: boolean
  message: string
}
