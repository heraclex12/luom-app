// Lượm (Free) model order (pure, tested in fallback.test.ts).
import type { LuomModel } from '../../shared/ai'

/** An error no other model can fix (e.g. the key was rejected): stop trying. */
export class FatalAiError extends Error {}

/** The free models router: sends each request to a free model with room to spare. */
export const LUOM_ROUTER = 'openrouter/free'

export type LuomTier = Exclude<LuomModel, 'auto'>

/** Model per tier when the live catalogue cannot be read. */
export const LUOM_STATIC: Record<LuomTier, string> = {
  lightning: 'nvidia/nemotron-3.5-lightning:free',
  nano: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  super: 'nvidia/nemotron-3-super-120b-a12b:free',
  ultra: 'nvidia/nemotron-3-ultra-550b-a55b:free',
}

/** A model that costs nothing: the free models router or a ":free" variant. Lượm (Free) asks for nothing else, so
 *  the built-in key never spends credit through the app. */
export const isFreeModel = (id: string): boolean => id === LUOM_ROUTER || id.endsWith(':free')

/** Models to try: the chosen tier (newest live model, else the known one), the router, then the quick and the strong
 *  model (no repeats). */
export function luomChain(model: LuomModel, live: Partial<Record<LuomTier, string>>): string[] {
  // A live model that is not free is ignored: the tier's known free model is used instead.
  const resolve = (t: LuomTier): string => (live[t] && isFreeModel(live[t]) ? live[t] : LUOM_STATIC[t])
  const chain = [...(model === 'auto' ? [] : [resolve(model)]), LUOM_ROUTER, resolve('super'), resolve('ultra')]
  return [...new Set(chain.filter(isFreeModel))]
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
