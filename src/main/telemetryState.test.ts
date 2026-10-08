// Anonymous usage stats (pure parts): counters kept between daily pings, when a ping is due, and what it carries.
import { describe, expect, it } from 'vitest'
import { aiEvent, aiSecondsEvent, bump, featureOf, osVersion, pingDue, buildPing, withoutSent } from './telemetryState'

const H = 3600_000
const at = (day: number, hour: number): number => new Date(2026, 9, day, hour).getTime()

describe('featureOf', () => {
  it('turns what an AI call makes into a short feature name', () => {
    expect(featureOf('an entry')).toBe('entry')
    expect(featureOf('a story')).toBe('story')
    expect(featureOf('the season plan')).toBe('season-plan')
    expect(featureOf('feedback')).toBe('feedback')
    expect(featureOf('  Weird — Thing!! ')).toBe('weird-thing')
  })
})

describe('aiEvent', () => {
  it('names the feature, the service that answered and how it went', () => {
    expect(aiEvent('an entry', 'luom', 'ok')).toBe('ai:entry:luom:ok')
    expect(aiEvent('the episode', 'chatgpt-web', 'fail')).toBe('ai:episode:chatgpt-web:fail')
    expect(aiSecondsEvent('a story', 'custom')).toBe('ai_s:story:custom')
  })
})

describe('bump / withoutSent', () => {
  it('adds to a counter', () => {
    expect(bump({}, 'lookup')).toEqual({ lookup: 1 })
    expect(bump({ lookup: 2 }, 'lookup', 3)).toEqual({ lookup: 5 })
  })
  it('keeps only what was counted after the ping was sent', () => {
    expect(withoutSent({ lookup: 5, sayit: 1, launch: 1 }, { lookup: 3, launch: 1 })).toEqual({ lookup: 2, sayit: 1 })
  })
})

describe('pingDue', () => {
  it('pings on the first run and once each new day', () => {
    expect(pingDue(at(8, 10), null, false)).toBe(true)
    expect(pingDue(at(8, 23), at(8, 9), false)).toBe(false)
    expect(pingDue(at(9, 0), at(8, 23), false)).toBe(true)
  })
  it('also sends counters every few hours on a busy day', () => {
    expect(pingDue(at(8, 11), at(8, 9), true)).toBe(false)
    expect(pingDue(at(8, 9) + 3 * H, at(8, 9), true)).toBe(true)
  })
})

describe('osVersion', () => {
  it('keeps major.minor of macOS', () => {
    expect(osVersion('15.3.1')).toBe('15.3')
    expect(osVersion('26.0')).toBe('26.0')
    expect(osVersion('weird')).toBe('')
  })
})

describe('buildPing', () => {
  it('carries only the install id, versions, AI service and counters', () => {
    expect(
      buildPing({ id: 'abc', version: '0.6.8', os: '15.3', service: 'luom', counts: { lookup: 2 } }),
    ).toEqual({ id: 'abc', v: '0.6.8', os: '15.3', service: 'luom', counts: { lookup: 2 } })
  })
})
