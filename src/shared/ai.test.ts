// AI settings contract: the Custom API base URL people paste is tidied into the root the app calls, and the free
// model saved by older versions maps onto one of Lượm's named choices (never a raw model id).
import { describe, expect, it } from 'vitest'
import { LUOM_MODELS, luomModelForId, normalizeBaseUrl } from './ai'

describe('normalizeBaseUrl', () => {
  it('keeps a base URL and drops trailing slashes', () => {
    expect(normalizeBaseUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1')
    expect(normalizeBaseUrl('  https://api.openai.com/v1/  ')).toBe('https://api.openai.com/v1')
    expect(normalizeBaseUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1')
  })
  it('accepts a pasted endpoint and returns its base', () => {
    expect(normalizeBaseUrl('https://example.com/v1/chat/completions')).toBe('https://example.com/v1')
    expect(normalizeBaseUrl('https://example.com/v1/models/')).toBe('https://example.com/v1')
  })
  it('rejects what is not an http(s) URL', () => {
    expect(normalizeBaseUrl('')).toBeNull()
    expect(normalizeBaseUrl('api.openai.com/v1')).toBeNull()
    expect(normalizeBaseUrl('file:///etc/passwd')).toBeNull()
    expect(normalizeBaseUrl('not a url')).toBeNull()
  })
})

describe('Lượm models', () => {
  it('offers Auto first, then the named tiers, with no model names', () => {
    expect(LUOM_MODELS.map((m) => m.id)).toEqual(['auto', 'lightning', 'nano', 'super', 'ultra'])
    expect(LUOM_MODELS.map((m) => m.name)).toEqual(['Auto', 'Lightning', 'Nano', 'Super', 'Ultra'])
    for (const m of LUOM_MODELS) expect(`${m.name} ${m.hint}`).not.toMatch(/nemotron|nvidia|openrouter|:free/i)
  })
  it('maps a model saved by an older version onto a tier, anything else onto Auto', () => {
    expect(luomModelForId('openrouter/free')).toBe('auto')
    expect(luomModelForId('nvidia/nemotron-3-super-120b-a12b:free')).toBe('super')
    expect(luomModelForId('nvidia/nemotron-3.5-lightning:free')).toBe('lightning')
    expect(luomModelForId('nvidia/nemotron-3-ultra-550b-a55b:free')).toBe('ultra')
    expect(luomModelForId('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free')).toBe('nano')
    expect(luomModelForId('thinkingmachines/inkling:free')).toBe('auto')
    expect(luomModelForId(42)).toBe('auto')
  })
})
