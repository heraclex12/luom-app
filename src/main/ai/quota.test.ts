// Lượm (Free) is one key shared by everyone, so each copy of the app gets a few free answers a day: a new day starts
// fresh, only answers that arrived count, and the learner sees how many are left.
import { describe, expect, it } from 'vitest'
import { FREE_DAILY_ANSWERS, afterAnswer, answersLeft, localDay } from './quota'

describe('free answers per day', () => {
  it('starts each day with the full allowance', () => {
    expect(FREE_DAILY_ANSWERS).toBe(10)
    expect(answersLeft(null, '2026-10-08')).toBe(10)
    expect(answersLeft({ day: '2026-10-07', count: 10 }, '2026-10-08')).toBe(10)
  })
  it('counts answers within the day and never goes below zero', () => {
    let u = afterAnswer(null, '2026-10-08')
    expect(u).toEqual({ day: '2026-10-08', count: 1 })
    u = afterAnswer(u, '2026-10-08')
    expect(answersLeft(u, '2026-10-08')).toBe(8)
    expect(answersLeft({ day: '2026-10-08', count: 12 }, '2026-10-08')).toBe(0)
    expect(afterAnswer({ day: '2026-10-07', count: 9 }, '2026-10-08')).toEqual({ day: '2026-10-08', count: 1 })
  })
  it('ignores a damaged record', () => {
    expect(answersLeft({ day: 3, count: 'x' } as never, '2026-10-08')).toBe(10)
  })
  it('days follow the local calendar', () => {
    expect(localDay(new Date(2026, 9, 8, 23, 59).getTime())).toBe('2026-10-08')
    expect(localDay(new Date(2026, 9, 9, 0, 1).getTime())).toBe('2026-10-09')
  })
})
