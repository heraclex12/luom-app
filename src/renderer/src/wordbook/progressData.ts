// Progress data from the local DB: activity days + today's numbers from the review log, plus tiny meta counters
// (typed answers right today, games finished today, lifetime bonus XP). Pure rules live in ./progress.
import { and, count, countDistinct, eq, gte, lt, sql } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { getMeta, setMeta } from '@/db/meta'
import { userReviewLog, userWord } from '@/db/schema'
import { longestStreak, streakFor, xpFor, type TodayStats } from './progress'
import { dayWindow } from './time'

const META_DAY = 'progress.day'
const META_TYPED = 'progress.typed'
const META_GAMES = 'progress.games'
const META_BONUS = 'progress.bonusXp'
const META_BEST_STREAK = 'progress.bestStreak'
const HISTORY_DAYS = 400

const num = async (db: Db, key: string): Promise<number> => Number((await getMeta(db, key)) ?? '0') || 0

/** Day counters belong to one learning day; reset them when the day changes. */
async function dayCounters(db: Db, now: number): Promise<{ typed: number; games: number }> {
  const today = String(dayWindow(now).startMs)
  if ((await getMeta(db, META_DAY)) !== today) {
    await setMeta(db, META_DAY, today)
    await setMeta(db, META_TYPED, '0')
    await setMeta(db, META_GAMES, '0')
    return { typed: 0, games: 0 }
  }
  return { typed: await num(db, META_TYPED), games: await num(db, META_GAMES) }
}

export async function recordTypedCorrect(db: Db, now: number): Promise<void> {
  const c = await dayCounters(db, now)
  await setMeta(db, META_TYPED, String(c.typed + 1))
}

/** A finished matching game: counts for today's quest and adds bonus XP. */
export async function recordGame(db: Db, now: number, bonusXp: number): Promise<void> {
  const c = await dayCounters(db, now)
  await setMeta(db, META_GAMES, String(c.games + 1))
  await setMeta(db, META_BONUS, String((await num(db, META_BONUS)) + Math.max(0, Math.round(bonusXp))))
}

export interface ProgressSnapshot {
  streak: number
  /** Longest streak ever (kept in meta, so it outlives the ~400 days of history read here). */
  bestStreak: number
  /** Start-of-day timestamps with practice (last ~400 days), for calendars. */
  activeDays: number[]
  today: TodayStats
  xp: number
}

export async function progressSnapshot(db: Db, now: number): Promise<ProgressSnapshot> {
  const win = dayWindow(now)
  const since = now - HISTORY_DAYS * 86_400_000
  const times = await db
    .select({ t: userReviewLog.reviewTime })
    .from(userReviewLog)
    .where(gte(userReviewLog.reviewTime, since))
    .all()
  const activeDays = [...new Set(times.map((r) => dayWindow(r.t).startMs))]
  // Previous learning day: step back half a day from the boundary (DST-safe).
  const prevDay = (d: number): number => dayWindow(d - 12 * 3_600_000).startMs
  const streak = streakFor(activeDays, win.startMs, prevDay)
  const storedBest = await num(db, META_BEST_STREAK)
  const bestStreak = Math.max(storedBest, streak, longestStreak(activeDays, prevDay))
  if (bestStreak > storedBest) await setMeta(db, META_BEST_STREAK, String(bestStreak))

  const inToday = and(gte(userReviewLog.reviewTime, win.startMs), lt(userReviewLog.reviewTime, win.endMs))
  const [reviews, newLearned, added, totals, counters, bonus] = await Promise.all([
    db.select({ n: count() }).from(userReviewLog).where(inToday).get(),
    db
      .select({ n: countDistinct(userReviewLog.dictId) })
      .from(userReviewLog)
      .where(and(inToday, eq(userReviewLog.preState, 0)))
      .get(),
    db
      .select({ n: count() })
      .from(userWord)
      .where(and(eq(userWord.isDeleted, 0), gte(userWord.joinTime, win.startMs), lt(userWord.joinTime, win.endMs)))
      .get(),
    db
      .select({ all: count(), good: sql<number>`sum(case when ${userReviewLog.rating} = 3 then 1 else 0 end)` })
      .from(userReviewLog)
      .get(),
    dayCounters(db, now),
    num(db, META_BONUS),
  ])
  return {
    streak,
    bestStreak,
    activeDays,
    today: {
      reviews: reviews?.n ?? 0,
      newLearned: newLearned?.n ?? 0,
      typedCorrect: counters.typed,
      games: counters.games,
      wordsAdded: added?.n ?? 0,
    },
    xp: xpFor({ reviews: totals?.all ?? 0, good: Number(totals?.good ?? 0), bonus }),
  }
}
