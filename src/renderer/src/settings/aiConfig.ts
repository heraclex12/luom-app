// Settings → the AI provider config main expects (src/shared/ai.ts).
import type { AiConfig } from '../../../shared/ai'
import type { Settings } from './types'

export function aiConfigFrom(s: Settings): AiConfig {
  switch (s.aiProvider) {
    case 'anthropic':
      return { provider: 'anthropic', model: s.aiModel }
    case 'chatgpt':
      return { provider: 'chatgpt', model: s.chatgptModel, bridgeUrl: s.chatgptBridgeUrl }
    default:
      return { provider: 'openrouter', model: s.openrouterModel }
  }
}
