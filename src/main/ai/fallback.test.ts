// Free-model fallback: when ChatGPT is not connected (or fails), OpenRouter free models are tried in a fixed order;
// a failing model (busy, error, unusable answer) hands over to the next, a rejected key stops at once.
import { describe, expect, it } from 'vitest'
import { FREE_MODEL_FALLBACKS } from '../../shared/ai'
import { FatalAiError, modelChain, tryInOrder } from './fallback'

describe('modelChain', () => {
  it('is the fixed fallback order when no model is chosen', () => {
    expect(modelChain()).toEqual(FREE_MODEL_FALLBACKS)
    expect(FREE_MODEL_FALLBACKS).toEqual([
      'nvidia/nemotron-3-super-120b-a12b:free',
      'thinkingmachines/inkling:free',
      'thinkingmachines/inkling-small:free',
      'nvidia/nemotron-3.5-lightning:free',
      'qwen/qwen3.8-27b:free',
    ])
  })
  it('puts the chosen model first without repeating it', () => {
    expect(modelChain('thinkingmachines/inkling:free')).toEqual([
      'thinkingmachines/inkling:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'thinkingmachines/inkling-small:free',
      'nvidia/nemotron-3.5-lightning:free',
      'qwen/qwen3.8-27b:free',
    ])
    expect(modelChain('x/other:free')[0]).toBe('x/other:free')
    expect(modelChain('x/other:free')).toHaveLength(6)
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
