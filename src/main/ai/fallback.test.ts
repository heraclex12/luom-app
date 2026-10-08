// Lượm's free AI: the chosen model is tried first, then the free models router, then the quick Super and the strong Ultra;
// a failing model (busy, error, unusable answer) hands over to the next, a rejected key stops at once.
import { describe, expect, it } from 'vitest'
import { FatalAiError, isFreeModel, LUOM_ROUTER, LUOM_STATIC, luomChain, tryInOrder } from './fallback'

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
