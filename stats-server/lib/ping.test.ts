// Stats server (pure parts): what a ping may carry and which days a report covers.
import { describe, expect, it } from 'vitest'
import { lastDays, parsePing, utcDay } from './ping'

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'

describe('parsePing', () => {
  it('accepts what the app sends', () => {
    expect(
      parsePing({ id: ID, v: '0.6.8', os: '15.3', service: 'luom', counts: { 'ai:entry:luom:ok': 3, lookup: 12 } }),
    ).toEqual({ id: ID, v: '0.6.8', os: '15.3', service: 'luom', counts: { 'ai:entry:luom:ok': 3, lookup: 12 } })
  })
  it('rejects anything that is not a random install id', () => {
    expect(parsePing({ id: 'me@example.com', v: '0.6.8', os: '', service: '', counts: {} })).toBeNull()
    expect(parsePing(null)).toBeNull()
    expect(parsePing('x')).toBeNull()
  })
  it('drops odd counters and odd labels instead of storing them', () => {
    expect(
      parsePing({
        id: ID,
        v: '<script>',
        os: '15.3',
        service: 'luom',
        counts: { lookup: 2, 'Bad Key!': 1, neg: -4, huge: 1e9, frac: 1.5, ok: '3' },
      }),
    ).toEqual({ id: ID, v: '', os: '15.3', service: 'luom', counts: { lookup: 2, huge: 10000 } })
  })
  it('keeps at most 80 counters', () => {
    const counts = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, 1]))
    expect(Object.keys(parsePing({ id: ID, v: '1', os: '1', service: 'x', counts })!.counts)).toHaveLength(80)
  })
})

describe('days', () => {
  it('names UTC days and lists the last n, newest first', () => {
    const now = Date.UTC(2026, 9, 8, 23, 30)
    expect(utcDay(now)).toBe('2026-10-08')
    expect(lastDays(now, 3)).toEqual(['2026-10-08', '2026-10-07', '2026-10-06'])
  })
})
