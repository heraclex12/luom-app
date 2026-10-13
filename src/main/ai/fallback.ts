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
 *  model (no repeats). A long answer (an episode, a story) tries Super and Lightning before the router, which often
 *  lands on a model that breaks long JSON. */
export function luomChain(
  model: LuomModel,
  live: Partial<Record<LuomTier, string>>,
  opts: { long?: boolean } = {},
): string[] {
  // A live model that is not free is ignored: the tier's known free model is used instead.
  const resolve = (t: LuomTier): string => (live[t] && isFreeModel(live[t]) ? live[t] : LUOM_STATIC[t])
  const chosen = model === 'auto' ? [] : [resolve(model)]
  const chain = opts.long
    ? [...chosen, resolve('super'), resolve('lightning'), LUOM_ROUTER, resolve('ultra')]
    : [...chosen, LUOM_ROUTER, resolve('super'), resolve('ultra')]
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

/** How long the free models get before the backup AI is asked as well: less when someone is waiting for the answer
 *  (Write back), more for a long one (an episode, a story). */
export function patienceMs(req: { fast?: boolean; long?: boolean }): number {
  if (req.fast) return 15_000
  return req.long ? 60_000 : 30_000
}

/**
 * Run the free models (`primary`); when they fail, or have not answered within `patienceMs`, ask the backup too.
 * The first answer wins and the other side is stopped (its signal aborts). When both fail, the free models' error
 * is thrown; with no backup this is just `primary`.
 */
export function withBackup<T>(
  primary: (signal: AbortSignal) => Promise<T>,
  backup: ((signal: AbortSignal) => Promise<T>) | null,
  patience: number,
): Promise<{ value: T; by: 'primary' | 'backup' }> {
  const stopPrimary = new AbortController()
  const stopBackup = new AbortController()
  return new Promise((resolve, reject) => {
    let settled = false
    let primaryFailed = false
    let primaryError: unknown
    let backupState: 'idle' | 'running' | 'failed' = 'idle'
    const win = (value: T, by: 'primary' | 'backup'): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ;(by === 'primary' ? stopBackup : stopPrimary).abort(new Error('Answered by the other side.'))
      resolve({ value, by })
    }
    // Both sides are done and neither answered.
    const maybeFail = (): void => {
      if (settled || !primaryFailed || backupState === 'running') return
      settled = true
      clearTimeout(timer)
      reject(primaryError)
    }
    const startBackup = (): void => {
      if (!backup || backupState !== 'idle' || settled) return
      backupState = 'running'
      backup(stopBackup.signal).then(
        (v) => win(v, 'backup'),
        () => {
          backupState = 'failed'
          maybeFail()
        },
      )
    }
    const timer = setTimeout(startBackup, patience)
    primary(stopPrimary.signal).then(
      (v) => win(v, 'primary'),
      (e: unknown) => {
        primaryFailed = true
        primaryError = e
        startBackup()
        maybeFail()
      },
    )
  })
}
