// AI enrichment bridge contract.
import type { AiConfig } from './ai'

export type AiModel = 'claude-opus-5' | 'claude-sonnet-5' | 'claude-haiku-4-5'

/** Selectable models with a rough cost hint per word (entry ≈ 1.5K output tokens). */
export const AI_MODELS: { id: AiModel; label: string; hint: string }[] = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', hint: 'Best quality, about $0.04 per word' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', hint: 'Great quality, about $0.015 per word' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Good quality, about $0.008 per word' },
]

export const DEFAULT_AI_MODEL: AiModel = 'claude-opus-5'

export interface EnrichRequest {
  term: string
  /** Optional sentence the word was seen in, to pick the right sense. */
  context?: string
  /** Provider + model to use (Settings → AI). */
  ai: AiConfig
}
