// Free-model fallback order (pure, tested in fallback.test.ts).
import { FREE_MODEL_FALLBACKS } from '../../shared/ai'

/** An error no other model can fix (e.g. the OpenRouter key was rejected): stop trying. */
export class FatalAiError extends Error {}

/** Models to try: the chosen one first, then the fixed free fallbacks (no repeats). */
export function modelChain(preferred?: string): string[] {
  return [...new Set([...(preferred ? [preferred] : []), ...FREE_MODEL_FALLBACKS])]
}

/** Run `attempt` for each option in order; first success wins, a FatalAiError stops, else the last error. */
export async function tryInOrder<T>(options: readonly string[], attempt: (option: string) => Promise<T>): Promise<T> {
  let last: unknown = new Error('No model to try.')
  for (const option of options) {
    try {
      return await attempt(option)
    } catch (e) {
      if (e instanceof FatalAiError) throw e
      last = e
    }
  }
  throw last
}
