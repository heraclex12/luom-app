// AI enrichment bridge contract.
import type { AiConfig } from './ai'

export interface EnrichRequest {
  term: string
  /** Optional sentence the word was seen in, to pick the right sense. */
  context?: string
  /** Provider + model to use (Settings → AI). */
  ai: AiConfig
}
