// Lightning (speed true/false) rules, pure: deal "word + meaning" cards that are true about half the
// time, fold answers into a streak-multiplied score, and count a 60 s clock down via tick(dt).
import { MIN_WORDS, norm, uniquePool, type PoolWord } from './common'

export const LIGHTNING_MS = 60_000
export const POINTS_PER_CORRECT = 10
/** Every this many answers in a row raises the multiplier by one. */
export const STREAK_STEP = 5
export const MAX_MULTIPLIER = 4

export interface Card {
  term: string
  meaning: string
  /** Whether the meaning really belongs to the word. */
  truth: boolean
  dictId: number
}

/** Usable words for the game, or null when fewer than MIN_WORDS. */
export function lightningDeck(pool: readonly PoolWord[]): PoolWord[] | null {
  const u = uniquePool(pool)
  return u.length >= MIN_WORDS ? u : null
}

/** Next card: a random word (not the previous one), shown with its own meaning half the time. */
export function dealCard(deck: readonly PoolWord[], rng: () => number = Math.random, prevDictId?: number): Card {
  const choices = deck.length > 1 && prevDictId !== undefined ? deck.filter((w) => w.dictId !== prevDictId) : deck
  const word = choices[Math.floor(rng() * choices.length)]!
  const truth = rng() < 0.5
  if (truth) return { term: word.term, meaning: word.meaning, truth, dictId: word.dictId }
  const others = deck.filter((w) => w.dictId !== word.dictId && norm(w.meaning) !== norm(word.meaning))
  const other = others[Math.floor(rng() * others.length)]!
  return { term: word.term, meaning: other.meaning, truth, dictId: word.dictId }
}

export const multiplierFor = (streak: number): number => Math.min(MAX_MULTIPLIER, 1 + Math.floor(streak / STREAK_STEP))

export interface LightningState {
  card: Card
  timeLeftMs: number
  correct: number
  total: number
  streak: number
  bestStreak: number
  score: number
  /** Last answer's result, n increments so the same result can flash again. */
  feedback: { correct: boolean; n: number } | null
  done: boolean
}

export const startLightning = (card: Card): LightningState => ({
  card,
  timeLeftMs: LIGHTNING_MS,
  correct: 0,
  total: 0,
  streak: 0,
  bestStreak: 0,
  score: 0,
  feedback: null,
  done: false,
})

/** Answer the current card ("this meaning is right" = true) and show `next`. */
export function answer(s: LightningState, saysTrue: boolean, next: Card): LightningState {
  if (s.done) return s
  const ok = saysTrue === s.card.truth
  const streak = ok ? s.streak + 1 : 0
  return {
    ...s,
    card: next,
    total: s.total + 1,
    correct: s.correct + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    score: s.score + (ok ? POINTS_PER_CORRECT * multiplierFor(streak) : 0),
    feedback: { correct: ok, n: (s.feedback?.n ?? 0) + 1 },
  }
}

/** Advance the clock by dt ms; the round ends at zero. */
export function tick(s: LightningState, dt: number): LightningState {
  if (s.done) return s
  const timeLeftMs = Math.max(0, s.timeLeftMs - Math.max(0, dt))
  return { ...s, timeLeftMs, done: timeLeftMs === 0 }
}

/** XP: one per 10 points, capped. */
export const lightningXp = (s: LightningState): number => Math.min(80, Math.round(s.score / 10))
