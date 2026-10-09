// Motivation numbers: a streak counts consecutive learning days and survives until today ends; XP rewards both
// effort and correctness; levels get gradually harder; daily quests adapt to the learning mode.
import { describe, expect, it } from 'vitest'
import { dailyQuests, levelFor, levelStartXp, longestStreak, streakFor, xpFor } from './progress'

const DAY = 86_400_000
const prev = (d: number): number => d - DAY

describe('streakFor', () => {
  const today = 100 * DAY
  it('counts consecutive days ending today', () => {
    expect(streakFor([today, today - DAY, today - 2 * DAY, today - 4 * DAY], today, prev)).toBe(3)
  })
  it('stays alive if yesterday was active but today not yet', () => {
    expect(streakFor([today - DAY, today - 2 * DAY], today, prev)).toBe(2)
  })
  it('is 0 after a missed day', () => {
    expect(streakFor([today - 2 * DAY], today, prev)).toBe(0)
    expect(streakFor([], today, prev)).toBe(0)
  })
})

describe('longestStreak', () => {
  it('the longest run of consecutive days in the history', () => {
    const d = (n: number): number => n * DAY
    expect(longestStreak([], prev)).toBe(0)
    expect(longestStreak([d(5)], prev)).toBe(1)
    expect(longestStreak([d(1), d(2), d(3), d(7), d(8), d(10), d(11), d(12), d(13)], prev)).toBe(4)
    expect(longestStreak([d(13), d(3), d(2), d(1), d(12)], prev)).toBe(3)
  })
})

describe('xp and levels', () => {
  it('xp = 10 per review + 5 per Good + bonus', () => {
    expect(xpFor({ reviews: 10, good: 4, bonus: 30 })).toBe(10 * 10 + 4 * 5 + 30)
  })
  it('levels: 0→1, 100→2, 300→3, 600→4 with progress inside the level', () => {
    expect(levelFor(0)).toEqual({ level: 1, xpInLevel: 0, xpForNext: 100 })
    expect(levelFor(150)).toEqual({ level: 2, xpInLevel: 50, xpForNext: 200 })
    expect(levelFor(300).level).toBe(3)
    expect(levelFor(599).level).toBe(3)
    expect(levelFor(600).level).toBe(4)
  })
  it('the XP a level starts at (how far the next garden world is)', () => {
    expect(levelStartXp(1)).toBe(0)
    expect(levelStartXp(3)).toBe(300)
    expect(levelStartXp(8)).toBe(2800)
    for (const l of [2, 5, 11, 30]) expect(levelFor(levelStartXp(l)).level).toBe(l)
  })
})

describe('dailyQuests', () => {
  const today = { reviews: 12, newLearned: 5, typedCorrect: 3, games: 0, wordsAdded: 1 }
  it('always has the daily goal and new-word quests, plus one mode-specific quest', () => {
    const quests = dailyQuests('standard', 30, today)
    expect(quests.map((q) => q.id)).toEqual(['goal', 'new', 'add'])
    expect(quests[0]).toMatchObject({ progress: 12, target: 30, done: false })
    expect(quests[1]).toMatchObject({ progress: 5, target: 5, done: true })
    expect(dailyQuests('focus', 50, today)[2]).toMatchObject({ id: 'typed', progress: 3, target: 10 })
    expect(dailyQuests('play', 30, today)[2]).toMatchObject({ id: 'game', progress: 0, target: 1 })
  })
  it('caps progress at the target', () => {
    expect(dailyQuests('quick', 10, { ...today, reviews: 40 })[0]).toMatchObject({ progress: 10, done: true })
  })
})
