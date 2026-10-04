// Built-in OpenRouter key: stored scrambled in the build (not readable with a plain text search of the app bundle),
// unscrambled only in main when an OpenRouter request needs it. Empty when the build has no key.
import { describe, expect, it } from 'vitest'
import { scrambleKey, unscrambleKey } from './builtInKey'

describe('built-in key scrambling', () => {
  it('round-trips and hides the key text', () => {
    const key = 'sk-or-v1-0123456789abcdef'
    const s = scrambleKey(key)
    expect(s).not.toContain('sk-or')
    expect(s).not.toContain('0123456789')
    expect(unscrambleKey(s)).toBe(key)
  })
  it('treats an empty or broken value as no key', () => {
    expect(scrambleKey('')).toBe('')
    expect(unscrambleKey('')).toBeNull()
    expect(unscrambleKey('%%%not base64')).toBeNull()
  })
})
