import { describe, expect, it } from 'vitest'
import { COVER_PIGMENTS, coverPigment } from './coverPigment'

describe('coverPigment', () => {
  it('is stable for a title', () => {
    expect(coverPigment('Oxford 3000')).toBe(coverPigment('Oxford 3000'))
  })

  it('ignores case and surrounding spaces', () => {
    expect(coverPigment('  the hobbit ')).toBe(coverPigment('The Hobbit'))
  })

  it('always returns one of the pigments, also for an empty title', () => {
    for (const t of ['', 'a', 'Lượm', 'iclr2027_conference', 'Harry Potter']) expect(COVER_PIGMENTS).toContain(coverPigment(t))
  })

  it('spreads different titles over several pigments', () => {
    const titles = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet']
    expect(new Set(titles.map(coverPigment)).size).toBeGreaterThan(2)
  })
})
