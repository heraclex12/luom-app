import { describe, expect, it } from 'vitest'
import {
  BASE_SPEED,
  initialRain,
  LIVES,
  MAX_DROPS,
  MAX_SPEED,
  pickSeed,
  pointsAt,
  rainDeck,
  rainSignature,
  rainXp,
  spawnIntervalAt,
  SPAWN_MIN_MS,
  SPAWN_START_MS,
  speedAt,
  step,
  submit,
  type Drop,
  type DropSeed,
  type RainState,
} from './rain'

const deck = Array.from({ length: 8 }, (_, i) => ({ dictId: i + 1, term: `w${i + 1}`, meaning: `m${i + 1}` }))
let n = 0
const seq = (): DropSeed => {
  n = (n % 8) + 1
  return { dictId: n, term: `w${n}`, meaning: `m${n}`, x: 0.5 }
}
const none = (): null => null
const drop = (id: number, y: number, term = `w${id}`): Drop => ({ id, dictId: id, term, meaning: 'm', x: 0, y })

describe('speed and spawn curves', () => {
  it('speed grows from base and caps', () => {
    expect(speedAt(0)).toBeCloseTo(BASE_SPEED)
    expect(speedAt(60_000)).toBeGreaterThan(speedAt(30_000))
    expect(speedAt(60 * 60_000)).toBeCloseTo(MAX_SPEED)
    expect(speedAt(0, 0.5)).toBeCloseTo(BASE_SPEED / 2)
  })
  it('spawn interval shrinks to a floor', () => {
    expect(spawnIntervalAt(0)).toBe(SPAWN_START_MS)
    expect(spawnIntervalAt(10 * 60_000)).toBe(SPAWN_MIN_MS)
  })
})

describe('step', () => {
  it('spawns immediately at the top, then on the interval', () => {
    let s = step(initialRain, 16, seq)
    expect(s.drops).toHaveLength(1)
    expect(s.drops[0]!.y).toBe(0)
    expect(s.spawnInMs).toBe(SPAWN_START_MS)
    s = step(s, 1000, seq)
    expect(s.drops).toHaveLength(1)
    expect(s.drops[0]!.y).toBeCloseTo(speedAt(16))
  })
  it('moves drops by speed * dt', () => {
    const s: RainState = { ...initialRain, drops: [drop(1, 0.2)], spawnInMs: 99_999 }
    const t = step(s, 500, none)
    expect(t.drops[0]!.y).toBeCloseTo(0.2 + BASE_SPEED * 0.5)
    expect(t.elapsedMs).toBe(500)
  })
  it('a landed drop costs a life; zero lives ends the game', () => {
    let s: RainState = { ...initialRain, drops: [drop(1, 0.999), drop(2, 0.1)], spawnInMs: 99_999 }
    s = step(s, 100, none)
    expect(s.lives).toBe(LIVES - 1)
    expect(s.missed).toBe(1)
    expect(s.drops.map((d) => d.id)).toEqual([2])
    s = { ...s, lives: 1, drops: [drop(3, 0.9999)] }
    s = step(s, 100, none)
    expect(s.over).toBe(true)
    expect(step(s, 100, seq)).toBe(s)
  })
  it('caps drops on screen and passes them to spawn', () => {
    const many = Array.from({ length: MAX_DROPS }, (_, i) => drop(i + 1, 0))
    const seen: number[] = []
    const t = step({ ...initialRain, drops: many }, 1, (on) => {
      seen.push(on.length)
      return seq()
    })
    expect(t.drops).toHaveLength(MAX_DROPS)
    expect(seen).toEqual([])
  })
  it('slower with a speed factor, and spawns less often', () => {
    const s: RainState = { ...initialRain, drops: [drop(1, 0)] }
    const t = step(s, 1000, seq, 0.5)
    expect(t.drops[0]!.y).toBeCloseTo(BASE_SPEED / 2)
    expect(t.spawnInMs).toBe(SPAWN_START_MS * 2)
  })
  it('ignores non-positive dt', () => {
    expect(step(initialRain, 0, seq)).toBe(initialRain)
  })
})

describe('submit', () => {
  const s: RainState = { ...initialRain, drops: [drop(1, 0.2, 'apple'), drop(2, 0.7, 'apple'), drop(3, 0.5)] }
  it('clears the lowest matching drop, case-insensitive', () => {
    const r = submit(s, '  APPLE ')
    expect(r.hit).toBe(true)
    expect(r.state.drops.map((d) => d.id)).toEqual([1, 3])
    expect(r.state.cleared).toBe(1)
    expect(r.state.score).toBe(pointsAt(0))
  })
  it('misses leave the state alone', () => {
    expect(submit(s, 'pear')).toEqual({ state: s, hit: false })
    expect(submit(s, '   ').hit).toBe(false)
  })
  it('later clears are worth more', () => {
    expect(pointsAt(0)).toBe(10)
    expect(pointsAt(65_000)).toBe(20)
  })
})

describe('helpers', () => {
  it('deck needs 4 words', () => {
    expect(rainDeck(deck.slice(0, 3))).toBeNull()
  })
  it('pickSeed avoids words already falling', () => {
    const on = deck.slice(0, 7).map((w, i) => ({ ...drop(i + 1, 0), dictId: w.dictId }))
    expect(pickSeed(deck, on, () => 0.3)?.dictId).toBe(8)
    expect(pickSeed(deck.slice(0, 7), on)).toBeNull()
  })
  it('xp is 3 per clear, capped', () => {
    expect(rainXp({ ...initialRain, cleared: 7 })).toBe(21)
    expect(rainXp({ ...initialRain, cleared: 100 })).toBe(80)
  })
  it('signature changes with the drop set but not with positions', () => {
    const a: RainState = { ...initialRain, drops: [drop(1, 0.1)] }
    expect(rainSignature({ ...a, drops: [drop(1, 0.5)] })).toBe(rainSignature(a))
    expect(rainSignature({ ...a, drops: [] })).not.toBe(rainSignature(a))
  })
})
