// Daily Episodes storage: the active season is the newest one; an episode is stored once per (season, number) even
// if two writes race (opening the page twice); reading records the quiz result once and keeps the best score.
import Database from 'better-sqlite3'
import { drizzle as betterDrizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as proxyDrizzle } from 'drizzle-orm/sqlite-proxy'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { runBatch as execBatch, runStmt as execStmt } from '../../../main/dbExecutor'
import type { Db } from '@/db/client'
import type { Episode, SeasonBible } from '../../../shared/episodes'
import * as data from './data'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../drizzle', import.meta.url))

function makeDb(): Db {
  const sqlite = new Database(':memory:')
  migrate(betterDrizzle(sqlite), { migrationsFolder: MIGRATIONS_DIR })
  return proxyDrizzle(
    async (sql, params, method) => execStmt(sqlite, { sql, params, method }) as { rows: any[] },
    async (queries) => execBatch(sqlite, queries) as { rows: any[] }[],
  )
}

const bible: SeasonBible = { title: 'Letters', premise: 'p', setting: 's', characters: [], outline: ['a'] }
const episode = (title: string): Episode => ({
  title,
  paragraphs: [{ en: 'x', vi: 'y' }],
  usedWords: [],
  summary: 's',
  teaser: 't',
  question: null,
})

let db: Db
beforeEach(() => {
  db = makeDb()
})

describe('seasons', () => {
  it('returns the newest season as active, with its bible', async () => {
    expect(await data.activeSeason(db)).toBeNull()
    await data.createSeason(db, { genre: 'mystery', level: 'B1', startDay: '2026-10-01', bible }, 1)
    const id = await data.createSeason(db, { genre: 'romance', level: 'A2', startDay: '2026-10-15', bible }, 2)
    const s = await data.activeSeason(db)
    expect(s).toMatchObject({ seasonId: id, genre: 'romance', level: 'A2', startDay: '2026-10-15' })
    expect(s?.bible.title).toBe('Letters')
  })
})

describe('episodes', () => {
  it('stores an episode once per number, keeping the first write', async () => {
    const id = await data.createSeason(db, { genre: 'mystery', level: 'B1', startDay: '2026-10-01', bible }, 1)
    await data.saveEpisode(db, { seasonId: id, number: 1, day: '2026-10-01', episode: episode('First'), wordIds: [5, 6] }, 10)
    await data.saveEpisode(db, { seasonId: id, number: 1, day: '2026-10-01', episode: episode('Again'), wordIds: [] }, 11)
    const list = await data.listEpisodes(db, id)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ number: 1, day: '2026-10-01', wordIds: [5, 6], readAt: null })
    expect(list[0].episode.title).toBe('First')
  })
  it('marks read once and keeps the best quiz score', async () => {
    const id = await data.createSeason(db, { genre: 'mystery', level: 'B1', startDay: '2026-10-01', bible }, 1)
    await data.saveEpisode(db, { seasonId: id, number: 1, day: '2026-10-01', episode: episode('E'), wordIds: [] }, 10)
    await data.markRead(db, id, 1, { correct: 2, total: 4 }, 100)
    await data.markRead(db, id, 1, { correct: 1, total: 4 }, 200)
    await data.markRead(db, id, 1, { correct: 4, total: 4 }, 300)
    const [e] = await data.listEpisodes(db, id)
    expect(e).toMatchObject({ readAt: 100, quizCorrect: 4, quizTotal: 4 })
  })
})
