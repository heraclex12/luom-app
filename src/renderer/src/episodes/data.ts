// Daily Episodes storage (story_season / story_episode, via Drizzle). Rules about days live in shared/episodes.ts.
import { and, desc, eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { storyEpisode, storySeason } from '@/db/schema'
import type { Episode, Genre, SeasonBible } from '../../../shared/episodes'
import type { StoryLevel } from '../../../shared/story'

export interface StoredSeason {
  seasonId: number
  genre: Genre
  level: StoryLevel
  startDay: string
  bible: SeasonBible
}

export interface StoredEpisode {
  number: number
  day: string
  episode: Episode
  wordIds: number[]
  readAt: number | null
  quizCorrect: number | null
  quizTotal: number | null
}

export async function activeSeason(db: Db): Promise<StoredSeason | null> {
  const [row] = await db.select().from(storySeason).orderBy(desc(storySeason.seasonId)).limit(1)
  if (!row) return null
  return {
    seasonId: row.seasonId,
    genre: row.genre as Genre,
    level: row.level as StoryLevel,
    startDay: row.startDay,
    bible: JSON.parse(row.bible) as SeasonBible,
  }
}

export async function createSeason(
  db: Db,
  s: { genre: Genre; level: StoryLevel; startDay: string; bible: SeasonBible },
  now: number,
): Promise<number> {
  const [row] = await db
    .insert(storySeason)
    .values({ genre: s.genre, level: s.level, startDay: s.startDay, bible: JSON.stringify(s.bible), createdAt: now })
    .returning({ seasonId: storySeason.seasonId })
  return row.seasonId
}

export async function listEpisodes(db: Db, seasonId: number): Promise<StoredEpisode[]> {
  const rows = await db.select().from(storyEpisode).where(eq(storyEpisode.seasonId, seasonId)).orderBy(storyEpisode.number)
  return rows.map((r) => ({
    number: r.number,
    day: r.day,
    episode: JSON.parse(r.content) as Episode,
    wordIds: JSON.parse(r.wordIds) as number[],
    readAt: r.readAt,
    quizCorrect: r.quizCorrect,
    quizTotal: r.quizTotal,
  }))
}

/** Store an episode; a second write for the same (season, number) is ignored (first one wins). */
export async function saveEpisode(
  db: Db,
  e: { seasonId: number; number: number; day: string; episode: Episode; wordIds: number[] },
  now: number,
): Promise<void> {
  await db
    .insert(storyEpisode)
    .values({
      seasonId: e.seasonId,
      number: e.number,
      day: e.day,
      content: JSON.stringify(e.episode),
      wordIds: JSON.stringify(e.wordIds),
      createdAt: now,
    })
    .onConflictDoNothing()
}

/** First read sets readAt; the quiz keeps the best score. */
export async function markRead(
  db: Db,
  seasonId: number,
  number: number,
  quiz: { correct: number; total: number },
  now: number,
): Promise<void> {
  const where = and(eq(storyEpisode.seasonId, seasonId), eq(storyEpisode.number, number))
  const [row] = await db.select().from(storyEpisode).where(where)
  if (!row) return
  const better = row.quizCorrect == null || quiz.correct > row.quizCorrect
  await db
    .update(storyEpisode)
    .set({
      readAt: row.readAt ?? now,
      ...(better ? { quizCorrect: quiz.correct, quizTotal: quiz.total } : {}),
    })
    .where(where)
}
