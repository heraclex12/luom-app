// Settings → the AI provider config main expects (src/shared/ai.ts).
import type { AiConfig } from '../../../shared/ai'
import type { Settings } from './types'

export function aiConfigFrom(s: Settings): AiConfig {
  switch (s.aiProvider) {
    case 'custom':
      return { provider: 'custom', model: s.customModel, baseUrl: s.customBaseUrl }
    case 'chatgpt-web':
      return { provider: 'chatgpt-web' }
    default:
      return { provider: 'luom', model: s.luomModel }
  }
}
