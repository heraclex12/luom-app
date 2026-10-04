// relTime uses local calendar-day boundaries, not a rolling 24h window:
// crossing midnight in under 24h is "yesterday"; anything within the same day is "today".
import { describe, expect, it } from 'vitest'
import { relTime } from './relTime'

// Local-time builder (same timezone basis as relTime's localMidnight).
const at = (y: number, mo: number, d: number, h: number, mi = 0): number =>
  new Date(y, mo - 1, d, h, mi, 0, 0).getTime()

describe('relTime (local calendar days)', () => {
  it('crossing midnight in under 24h → yesterday (23:00 vs 08:00, 9h apart)', () => {
    expect(relTime(at(2026, 7, 16, 23, 0), at(2026, 7, 17, 8, 0))).toBe('yesterday')
  })

  it('same calendar day → today (00:30 vs 08:00)', () => {
    expect(relTime(at(2026, 7, 17, 0, 30), at(2026, 7, 17, 8, 0))).toBe('today')
  })

  it('same calendar day even ~24h apart → today (00:10 vs 23:50)', () => {
    expect(relTime(at(2026, 7, 17, 0, 10), at(2026, 7, 17, 23, 50))).toBe('today')
  })

  it('2–6 calendar days → N days ago', () => {
    expect(relTime(at(2026, 7, 15, 12, 0), at(2026, 7, 17, 8, 0))).toBe('2 days ago')
    expect(relTime(at(2026, 7, 11, 1, 0), at(2026, 7, 17, 23, 0))).toBe('6 days ago')
  })

  it('7–29 days → weeks ago; 30+ days → months ago (singular for 1)', () => {
    expect(relTime(at(2026, 7, 10, 12, 0), at(2026, 7, 17, 12, 0))).toBe('1 week ago')
    expect(relTime(at(2026, 7, 3, 12, 0), at(2026, 7, 17, 12, 0))).toBe('2 weeks ago')
    expect(relTime(at(2026, 6, 15, 12, 0), at(2026, 7, 17, 12, 0))).toBe('1 month ago')
    expect(relTime(at(2026, 5, 17, 12, 0), at(2026, 7, 17, 12, 0))).toBe('2 months ago')
  })

  it('future editTime (clock skew) clamps to today', () => {
    expect(relTime(at(2026, 7, 18, 8, 0), at(2026, 7, 17, 8, 0))).toBe('today')
  })
})
