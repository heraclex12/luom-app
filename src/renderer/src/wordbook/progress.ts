// Pure motivation numbers: streak, XP, level and daily quests (data comes from the review log + small counters).
import type { LearningMode } from './modes'

/**
 * Consecutive learning days. `days` = start-of-day timestamps with activity (any order), `today` = today's start,
 * `prevDay` maps a day start to the previous day's start (DST-safe, supplied by the caller).
 * A streak is still alive today if yesterday was active.
 */
export function streakFor(days: readonly number[], today: number, prevDay: (d: number) => number): number {
  const active = new Set(days)
  let cursor = active.has(today) ? today : prevDay(today)
  let streak = 0
  while (active.has(cursor)) {
    streak++
    cursor = prevDay(cursor)
  }
  return streak
}

export function xpFor(t: { reviews: number; good: number; bonus: number }): number {
  return t.reviews * 10 + t.good * 5 + t.bonus
}

/** XP at which `level` starts: 50·n·(n−1). */
export const levelStartXp = (level: number): number => 50 * level * (level - 1)

/** Level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000… */
export function levelFor(xp: number): { level: number; xpInLevel: number; xpForNext: number } {
  let level = 1
  while (50 * (level + 1) * level <= xp) level++
  const start = 50 * level * (level - 1)
  const next = 50 * (level + 1) * level
  return { level, xpInLevel: xp - start, xpForNext: next - start }
}

export interface TodayStats {
  /** Cards practised today (review log rows). */
  reviews: number
  /** Words learned for the first time today. */
  newLearned: number
  /** Typed answers that were right today. */
  typedCorrect: number
  /** Matching games finished today. */
  games: number
  /** Words added to My words today. */
  wordsAdded: number
}

export interface Quest {
  id: 'goal' | 'new' | 'typed' | 'game' | 'add'
  title: string
  progress: number
  target: number
  done: boolean
}

const quest = (id: Quest['id'], title: string, value: number, target: number): Quest => ({
  id,
  title,
  progress: Math.min(value, target),
  target,
  done: value >= target,
})

/** Today's quests: daily goal + new words + one quest that fits the mode. */
export function dailyQuests(mode: LearningMode, dailyGoal: number, t: TodayStats): Quest[] {
  const quests = [
    quest('goal', `Practise ${dailyGoal} cards`, t.reviews, dailyGoal),
    quest('new', 'Learn 5 new words', t.newLearned, 5),
  ]
  if (mode === 'focus') quests.push(quest('typed', 'Type 10 words correctly', t.typedCorrect, 10))
  else if (mode === 'play') quests.push(quest('game', 'Finish a matching game', t.games, 1))
  else quests.push(quest('add', 'Add 3 words you meet today', t.wordsAdded, 3))
  return quests
}
