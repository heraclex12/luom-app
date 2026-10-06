import { describe, expect, it } from 'vitest'
import { GLYPHS, sealGlyph } from './glyphs'

describe('sealGlyph', () => {
  it('has a carved 5×5 glyph for every letter A–Z', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const g = GLYPHS[ch]
      expect(g, ch).toHaveLength(5)
      for (const row of g) expect(row, ch).toMatch(/^[#.]{5}$/)
    }
  })

  it('uses the first letter, upper-cased', () => {
    expect(sealGlyph('absorption')).toBe(GLYPHS.A)
    expect(sealGlyph('  debts')).toBe(GLYPHS.D)
  })

  it('carves Vietnamese initials as their base letter', () => {
    expect(sealGlyph('Ước')).toBe(GLYPHS.U)
    expect(sealGlyph('ơi')).toBe(GLYPHS.O)
    expect(sealGlyph('Âm')).toBe(GLYPHS.A)
    expect(sealGlyph('đường')).toBe(GLYPHS.D)
    expect(sealGlyph('Élan')).toBe(GLYPHS.E)
  })

  it('returns null when there is no letter to carve', () => {
    expect(sealGlyph('')).toBeNull()
    expect(sealGlyph('3000 words')).toBeNull()
    expect(sealGlyph('?')).toBeNull()
  })
})
