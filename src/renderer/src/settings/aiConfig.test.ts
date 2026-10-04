// The AI provider config sent to main is derived from settings: the right model field per provider.
import { describe, expect, it } from 'vitest'
import { aiConfigFrom } from './aiConfig'
import { DEFAULT_SETTINGS } from './defaults'

describe('aiConfigFrom', () => {
  it('picks the model of the chosen provider', () => {
    const s = { ...DEFAULT_SETTINGS, aiModel: 'claude-haiku-4-5' as const, openrouterModel: 'x/y:free' }
    expect(aiConfigFrom({ ...s, aiProvider: 'anthropic' })).toEqual({ provider: 'anthropic', model: 'claude-haiku-4-5' })
    expect(aiConfigFrom({ ...s, aiProvider: 'openrouter' })).toEqual({ provider: 'openrouter', model: 'x/y:free' })
  })
  it('built-in ChatGPT needs no model or address', () => {
    expect(aiConfigFrom({ ...DEFAULT_SETTINGS, aiProvider: 'chatgpt-web' })).toEqual({ provider: 'chatgpt-web' })
  })
  it('defaults to ChatGPT (the user signs in once)', () => {
    expect(aiConfigFrom(DEFAULT_SETTINGS).provider).toBe('chatgpt-web')
  })
})
