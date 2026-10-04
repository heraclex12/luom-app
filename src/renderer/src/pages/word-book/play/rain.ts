// Word Rain rules, pure: meanings fall from y = 0 to y = 1 (fractions of the play area); typing the
// English word clears the matching drop. step(state, dt, spawn) advances positions, spawns new drops,
// costs a life for each drop that lands, and speeds up gradually. Rendering lives in Rain.tsx.
import { MIN_WORDS, norm, uniquePool, type PoolWord } from './common'

export const LIVES = 3
/** Fall speed in play-area heights per second: starts slow, grows linearly, capped. */
export const BASE_SPEED = 0.06
export const SPEED_GAIN_PER_MIN = 0.06
export const MAX_SPEED = 0.2
/** Spawn interval shrinks from START to MIN over time. */
export const SPAWN_START_MS = 3_200
export const SPAWN_MIN_MS = 1_300
export const SPAWN_GAIN_PER_MIN = 1_200
export const MAX_DROPS = 6
export const POINTS_PER_DROP = 10

export interface Drop {
  id: number
  dictId: number
  term: string
  meaning: string
  /** Horizontal position, 0..1 of the free width. */
  x: number
  /** Vertical position, 0 (top) .. 1 (bottom, lands). */
  y: number
}

export type DropSeed = Omit<Drop, 'id' | 'y'>

export interface RainState {
  drops: Drop[]
  lives: number
  score: number
  cleared: number
  missed: number
  elapsedMs: number
  /** Time until the next spawn. */
  spawnInMs: number
  nextId: number
  over: boolean
}

export const initialRain: RainState = {
  drops: [],
  lives: LIVES,
  score: 0,
  cleared: 0,
  missed: 0,
  elapsedMs: 0,
  spawnInMs: 0,
  nextId: 1,
  over: false,
}

export const speedAt = (elapsedMs: number, factor = 1): number =>
  Math.min(MAX_SPEED, BASE_SPEED + (SPEED_GAIN_PER_MIN * elapsedMs) / 60_000) * factor

export const spawnIntervalAt = (elapsedMs: number): number =>
  Math.max(SPAWN_MIN_MS, SPAWN_START_MS - (SPAWN_GAIN_PER_MIN * elapsedMs) / 60_000)

/**
 * Advance by dt ms. `spawn` picks the next drop given the drops on screen (null = nothing to add).
 * `speedFactor` slows everything down (reduced motion).
 */
export function step(
  s: RainState,
  dt: number,
  spawn: (onScreen: readonly Drop[]) => DropSeed | null,
  speedFactor = 1,
): RainState {
  if (s.over || dt <= 0) return s
  const dy = (speedAt(s.elapsedMs, speedFactor) * dt) / 1000
  const moved = s.drops.map((d) => ({ ...d, y: d.y + dy }))
  const landed = moved.filter((d) => d.y >= 1).length
  let drops = moved.filter((d) => d.y < 1)
  let { nextId } = s
  let spawnInMs = s.spawnInMs - dt
  if (spawnInMs <= 0) {
    const seed = drops.length < MAX_DROPS ? spawn(drops) : null
    if (seed) {
      drops = [...drops, { ...seed, id: nextId, y: 0 }]
      nextId++
    }
    spawnInMs = spawnIntervalAt(s.elapsedMs) / speedFactor
  }
  const lives = Math.max(0, s.lives - landed)
  return {
    ...s,
    drops,
    lives,
    missed: s.missed + landed,
    elapsedMs: s.elapsedMs + dt,
    spawnInMs,
    nextId,
    over: lives === 0,
  }
}

/** Points for a clear: more for later in the game. */
export const pointsAt = (elapsedMs: number): number => POINTS_PER_DROP + 5 * Math.floor(elapsedMs / 30_000)

/** Clear the lowest drop whose word matches `typed`. */
export function submit(s: RainState, typed: string): { state: RainState; hit: boolean } {
  const t = norm(typed)
  if (s.over || !t) return { state: s, hit: false }
  const matches = s.drops.filter((d) => norm(d.term) === t)
  if (matches.length === 0) return { state: s, hit: false }
  const target = matches.reduce((a, b) => (b.y > a.y ? b : a))
  return {
    hit: true,
    state: {
      ...s,
      drops: s.drops.filter((d) => d.id !== target.id),
      cleared: s.cleared + 1,
      score: s.score + pointsAt(s.elapsedMs),
    },
  }
}

/** Usable words, or null when fewer than MIN_WORDS. */
export function rainDeck(pool: readonly PoolWord[]): PoolWord[] | null {
  const u = uniquePool(pool)
  return u.length >= MIN_WORDS ? u : null
}

/** Pick a word not already falling, at a random column. */
export function pickSeed(deck: readonly PoolWord[], onScreen: readonly Drop[], rng: () => number = Math.random): DropSeed | null {
  const falling = new Set(onScreen.map((d) => d.dictId))
  const free = deck.filter((w) => !falling.has(w.dictId))
  if (free.length === 0) return null
  const w = free[Math.floor(rng() * free.length)]!
  return { dictId: w.dictId, term: w.term, meaning: w.meaning, x: rng() }
}

/** XP: three per cleared word, capped. */
export const rainXp = (s: RainState): number => Math.min(80, s.cleared * 3)

/** Signature of what React needs to re-render (drop set, lives, score); positions are drawn separately. */
export const rainSignature = (s: RainState): string =>
  `${s.drops.map((d) => d.id).join(',')}|${s.lives}|${s.score}|${s.over}`
