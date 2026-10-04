// AI provider contract shared by main (src/main/ai) and the renderer settings.

/** anthropic = Claude with your API key; openrouter = OpenRouter (free models available); chatgpt = your ChatGPT
 *  account through the separately installed codex-chatgpt-web launcher's local bridge. */
export type AiProvider = 'anthropic' | 'openrouter' | 'chatgpt'

export interface AiConfig {
  provider: AiProvider
  /** Model id for the provider (Claude id, OpenRouter id, or chatgpt-web/… id). */
  model?: string
  /** Local bridge base URL for the chatgpt provider. */
  bridgeUrl?: string
}

export interface AiModelOption {
  id: string
  name: string
}

export const DEFAULT_OPENROUTER_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'
export const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:17841/v1'
export const DEFAULT_CHATGPT_MODEL = 'chatgpt-web/medium'

/** Whether the provider is usable right now, with a user-readable reason when not. */
export interface AiStatus {
  ready: boolean
  message: string
}
