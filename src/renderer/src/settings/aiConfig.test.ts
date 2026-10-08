// The AI provider config sent to main is derived from settings: the right model (and address) per service.
import { describe, expect, it } from 'vitest'
import { aiConfigFrom } from './aiConfig'
import { DEFAULT_SETTINGS } from './defaults'

describe('aiConfigFrom', () => {
  it('Lượm (Free) sends the chosen tier; Custom API sends its address and model', () => {
    const s = { ...DEFAULT_SETTINGS, luomModel: 'ultra' as const, customBaseUrl: 'https://x.test/v1', customModel: 'm1' }
    expect(aiConfigFrom({ ...s, aiProvider: 'luom' })).toEqual({ provider: 'luom', model: 'ultra' })
    expect(aiConfigFrom({ ...s, aiProvider: 'custom' })).toEqual({
      provider: 'custom',
      model: 'm1',
      baseUrl: 'https://x.test/v1',
    })
  })
  it('built-in ChatGPT needs no model or address', () => {
    expect(aiConfigFrom({ ...DEFAULT_SETTINGS, aiProvider: 'chatgpt-web' })).toEqual({ provider: 'chatgpt-web' })
  })
  it('defaults to Lượm (Free) with Auto: works with nothing to set up', () => {
    expect(aiConfigFrom(DEFAULT_SETTINGS)).toEqual({ provider: 'luom', model: 'auto' })
  })
})
