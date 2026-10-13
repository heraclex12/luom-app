// Lượm's free AI: the chosen model is tried first, then the free models router, then the quick Super and the strong Ultra
// (long answers try Super and Lightning before the router);
// a failing model (busy, error, unusable answer) hands over to the next, a rejected key stops at once.
import { describe, expect, it } from 'vitest'
import { FatalAiError, isFreeModel, LUOM_ROUTER, LUOM_STATIC, luomChain, patienceMs, tryInOrder, withBackup } from './fallback'

describe('luomChain', () => {
  it('Auto starts with the free models router', () => {
    expect(luomChain('auto', {})).toEqual([LUOM_ROUTER, LUOM_STATIC.super, LUOM_STATIC.ultra])
    expect(LUOM_ROUTER).toBe('openrouter/free')
  })
  it('a chosen tier goes first, using the newest live model for it when known', () => {
    expect(luomChain('lightning', {})).toEqual([LUOM_STATIC.lightning, LUOM_ROUTER, LUOM_STATIC.super, LUOM_STATIC.ultra])
    expect(luomChain('ultra', { ultra: 'nvidia/nemotron-4-ultra:free' })[0]).toBe('nvidia/nemotron-4-ultra:free')
  })
  it('only ever asks for free models, even if the catalogue names a paid one for a tier', () => {
    expect(luomChain('ultra', { ultra: 'nvidia/nemotron-4-ultra' })).toEqual([LUOM_STATIC.ultra, LUOM_ROUTER, LUOM_STATIC.super])
    expect([LUOM_ROUTER, ...Object.values(LUOM_STATIC)].every(isFreeModel)).toBe(true)
    expect(isFreeModel('openai/gpt-6')).toBe(false)
    expect(isFreeModel('openrouter/auto')).toBe(false)
  })
  it('a long answer (an episode, a season plan, a story) goes to Super, then Lightning, before the router', () => {
    // The router often lands on a model that breaks long JSON; Super is the quickest reliable one, Lightning the
    // steadiest (slower) one.
    expect(luomChain('auto', {}, { long: true })).toEqual([LUOM_STATIC.super, LUOM_STATIC.lightning, LUOM_ROUTER, LUOM_STATIC.ultra])
    // A chosen model still goes first.
    expect(luomChain('nano', {}, { long: true })).toEqual([LUOM_STATIC.nano, LUOM_STATIC.super, LUOM_STATIC.lightning, LUOM_ROUTER, LUOM_STATIC.ultra])
    expect(luomChain('lightning', {}, { long: true })).toEqual([LUOM_STATIC.lightning, LUOM_STATIC.super, LUOM_ROUTER, LUOM_STATIC.ultra])
  })
  it('never repeats a model', () => {
    const chain = luomChain('super', {})
    expect(chain).toEqual([LUOM_STATIC.super, LUOM_ROUTER, LUOM_STATIC.ultra])
    expect(new Set(chain).size).toBe(chain.length)
  })
})

describe('tryInOrder', () => {
  it('returns the first success and stops trying', async () => {
    const tried: string[] = []
    const out = await tryInOrder(['a', 'b', 'c'], async (m) => {
      tried.push(m)
      if (m === 'a') throw new Error('busy')
      return `ok ${m}`
    })
    expect(out).toBe('ok b')
    expect(tried).toEqual(['a', 'b'])
  })
  it('throws the last error when every option fails', async () => {
    await expect(
      tryInOrder(['a', 'b'], async (m) => {
        throw new Error(`fail ${m}`)
      }),
    ).rejects.toThrow('fail b')
  })
  it('stops at a fatal error (for example a rejected key)', async () => {
    const tried: string[] = []
    await expect(
      tryInOrder(['a', 'b'], async (m) => {
        tried.push(m)
        throw new FatalAiError('key rejected')
      }),
    ).rejects.toThrow('key rejected')
    expect(tried).toEqual(['a'])
  })
})

// The backup AI (fast, paid) steps in when the free models fail or are too slow: whoever answers first wins and the
// other one is stopped; when both fail, the free models' error stands.
describe('withBackup', () => {
  const later = <T>(ms: number, value: T, fail = false) => (signal: AbortSignal) =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => (fail ? reject(new Error(String(value))) : resolve(value)), ms)
      signal.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new Error('stopped'))
      })
    })

  it('a quick free answer wins and the backup is never asked', async () => {
    let asked = false
    const out = await withBackup(later(5, 'free'), (s) => ((asked = true), later(1, 'backup')(s)), 50)
    expect(out).toEqual({ value: 'free', by: 'primary' })
    expect(asked).toBe(false)
  })
  it('a free failure hands over to the backup at once', async () => {
    const started = Date.now()
    expect(await withBackup(later(5, 'busy', true), later(5, 'backup'), 10_000)).toEqual({ value: 'backup', by: 'backup' })
    expect(Date.now() - started).toBeLessThan(1000)
  })
  it('after the patience runs out the backup starts too; the first answer wins and the other is stopped', async () => {
    let freeStopped = false
    const slowFree = (signal: AbortSignal) => {
      signal.addEventListener('abort', () => (freeStopped = true))
      return later(500, 'free')(signal)
    }
    expect(await withBackup(slowFree, later(5, 'backup'), 20)).toEqual({ value: 'backup', by: 'backup' })
    expect(freeStopped).toBe(true)
  })
  it('when the backup fails, the slow free models may still answer', async () => {
    expect(await withBackup(later(60, 'free'), later(5, 'down', true), 10)).toEqual({ value: 'free', by: 'primary' })
  })
  it('when both fail, the free models’ error stands; with no backup it is the free result alone', async () => {
    await expect(withBackup(later(5, 'free failed', true), later(5, 'backup failed', true), 1)).rejects.toThrow('free failed')
    await expect(withBackup(later(5, 'free failed', true), null, 1)).rejects.toThrow('free failed')
    expect(await withBackup(later(5, 'free'), null, 1)).toEqual({ value: 'free', by: 'primary' })
  })
})

describe('patienceMs', () => {
  it('waits less when someone is waiting, longer for a long answer', () => {
    expect(patienceMs({ fast: true })).toBe(15_000)
    expect(patienceMs({})).toBe(30_000)
    expect(patienceMs({ long: true })).toBe(60_000)
  })
})
