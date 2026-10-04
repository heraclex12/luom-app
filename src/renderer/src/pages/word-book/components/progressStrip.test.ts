import { describe, expect, it } from 'vitest'
import { recentDays } from './progressStrip'

const at = (y: number, m: number, d: number, h = 4) => new Date(y, m - 1, d, h).getTime()

describe('recentDays', () => {
  it('returns the last n learning days oldest first, ending today', () => {
    const days = recentDays([], at(2026, 10, 4, 12), 7)
    expect(days).toHaveLength(7)
    expect(days[6]!.isToday).toBe(true)
    expect(days[0]!.date.getDate()).toBe(28) // Sep 28
    expect(days[6]!.date.getDate()).toBe(4)
  })
  it('marks days present in activeDays (4:00 starts)', () => {
    const days = recentDays([at(2026, 10, 4), at(2026, 10, 2), at(2026, 9, 1)], at(2026, 10, 4, 12), 7)
    expect(days.map((d) => d.active)).toEqual([false, false, false, false, true, false, true])
  })
  it('before 4:00 the learning day is still yesterday', () => {
    const days = recentDays([at(2026, 10, 3)], at(2026, 10, 4, 2), 7)
    expect(days[6]!.date.getDate()).toBe(3)
    expect(days[6]!.active).toBe(true)
  })
  it('gives a one-letter weekday label', () => {
    const days = recentDays([], at(2026, 10, 4, 12), 7) // Oct 4 2026 is a Sunday
    expect(days[6]!.label).toBe('S')
    expect(days[5]!.label).toBe('S')
    expect(days[4]!.label).toBe('F')
  })
})
