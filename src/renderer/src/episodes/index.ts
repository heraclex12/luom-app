// Daily Episodes domain facade: a serialized AI story, one episode per day, written with the learner's words.
// Season plan + episodes come from main (episodesBridge); storage in ./data; day rules in shared/episodes.ts.
// Pages import only from here.
import { db } from '@/db/client'
import { episodesBridge } from '@/platform'
import { aiConfigFrom, getSettings } from '@/settings'
import { calibratedNowSync } from '@/sync/clock'
import * as wordbook from '@/wordbook'
import {
  dayDiff,
  episodeSlots,
  SEASON_LENGTH,
  storyStreak,
  type Genre,
  type Slot,
} from '../../../shared/episodes'
import type { StoryLevel } from '../../../shared/story'
import * as data from './data'
import { pickEpisodeWords } from './pick'
import { episodeQuiz, type QuizItem } from './quiz'

export { GENRES, SEASON_LENGTH } from '../../../shared/episodes'
export type { Episode, Genre, SeasonBible, Slot } from '../../../shared/episodes'
export type { StoredEpisode, StoredSeason } from './data'
export type { QuizItem } from './quiz'

/** Local calendar day (YYYY-MM-DD). */
export function dayKeyOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface SeasonView {
  season: data.StoredSeason
  today: string
  slots: Slot[]
  streak: number
  episodes: Map<number, data.StoredEpisode>
  /** Today's episode number, or null once the season is over. */
  todayNumber: number | null
}

export async function loadSeason(): Promise<SeasonView | null> {
  const season = await data.activeSeason(db)
  if (!season) return null
  const today = dayKeyOf(calibratedNowSync())
  const list = await data.listEpisodes(db, season.seasonId)
  const slots = episodeSlots(
    season.startDay,
    today,
    list.map((e) => ({ number: e.number, read: e.readAt != null })),
  )
  const n = dayDiff(season.startDay, today) + 1
  return {
    season,
    today,
    slots,
    streak: storyStreak(slots),
    episodes: new Map(list.map((e) => [e.number, e])),
    todayNumber: n >= 1 && n <= SEASON_LENGTH ? n : null,
  }
}

/** Plan a new season with the AI and start it today. */
export async function startSeason(genre: Genre, level: StoryLevel): Promise<void> {
  const ai = aiConfigFrom(await getSettings())
  const bible = await episodesBridge.season({ genre, level, ai })
  await data.createSeason(db, { genre, level, startDay: dayKeyOf(calibratedNowSync()), bible }, calibratedNowSync())
}

let writing: Promise<data.StoredEpisode | null> | null = null

/**
 * Today's episode, writing it with the AI first when needed (one write at a time; a second caller waits for the
 * first). Null when there is no season or it is over.
 */
export function ensureTodayEpisode(): Promise<data.StoredEpisode | null> {
  writing ??= writeToday().finally(() => {
    writing = null
  })
  return writing
}

async function writeToday(): Promise<data.StoredEpisode | null> {
  const view = await loadSeason()
  if (!view || view.todayNumber == null) return null
  const existing = view.episodes.get(view.todayNumber)
  if (existing) return existing

  const number = view.todayNumber
  const written = [...view.episodes.values()].sort((a, b) => a.number - b.number)
  const last = written[written.length - 1]
  const recentlyUsed = written.slice(-2).flatMap((e) => e.wordIds)
  const [due, today, all] = await Promise.all([
    wordbook.listSegment('due', { limit: 40 }).catch(() => []),
    wordbook.todaySegments().catch(() => ({ learned: [], reviewed: [] })),
    wordbook.listAllWords().catch(() => []),
  ])
  const ref = (w: { dictId: number; term: string | null }) => ({ dictId: w.dictId, term: w.term ?? '' })
  const words = pickEpisodeWords(
    { due: due.map(ref), today: today.learned.map(ref), recent: all.slice(-30).reverse().map(ref) },
    recentlyUsed,
  )
  const episode = await episodesBridge.episode({
    bible: view.season.bible,
    number,
    level: view.season.level,
    words: words.map((w) => w.term),
    previous: written.slice(-4).map((e) => ({ number: e.number, summary: e.episode.summary })),
    daysSinceLast: last ? number - last.number : 1,
    ai: aiConfigFrom(await getSettings()),
  })
  const usedIds = words.filter((w) => episode.usedWords.some((u) => u.toLowerCase() === w.term.toLowerCase()))
  await data.saveEpisode(
    db,
    { seasonId: view.season.seasonId, number, day: view.today, episode, wordIds: usedIds.map((w) => w.dictId) },
    calibratedNowSync(),
  )
  return (await data.listEpisodes(db, view.season.seasonId)).find((e) => e.number === number) ?? null
}

/** XP for finishing an episode (reading + quiz), on top of the per-answer score. */
export const EPISODE_XP = 25

/**
 * Finished today's episode (read + quiz). Only today's episode counts: a lost page stays lost even if its text is
 * read later. Returns whether it counted.
 */
export async function finishEpisode(number: number, quiz: { correct: number; total: number }): Promise<boolean> {
  const view = await loadSeason()
  if (!view || view.todayNumber !== number) return false
  const first = view.episodes.get(number)?.readAt == null
  await data.markRead(db, view.season.seasonId, number, quiz, calibratedNowSync())
  if (first) await wordbook.recordGame(EPISODE_XP + quiz.correct * 5)
  return true
}

/** Quiz for an episode: its story question + meaning questions for the words it used. */
export async function quizFor(e: data.StoredEpisode): Promise<QuizItem[]> {
  const [own, extra] = await Promise.all([wordbook.meaningsOf(e.wordIds), wordbook.quizPool(40).catch(() => [])])
  return episodeQuiz(e.episode.question, e.wordIds, [...own, ...extra.filter((x) => !e.wordIds.includes(x.dictId))])
}
