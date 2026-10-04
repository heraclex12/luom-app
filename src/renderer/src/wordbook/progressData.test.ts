// Progress data from the local DB: activity days come from the review log (4:00 day boundary), today's numbers
// count practice / first-time learning / words added, counters for typed answers and games reset each day,
// and total XP includes game bonuses.
import Database from 'better-sqlite3'
import { drizzle as betterDrizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as proxyDrizzle } from 'drizzle-orm/sqlite-proxy'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { runBatch as execBatch, runStmt as execStmt } from '../../../main/dbExecutor'
import type { Db } from '@/db/client'
import * as words from './words'
import * as pd from './progressData'
import { dayWindow } from './time'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../drizzle', import.meta.url))
const at = (d: number, h: number): number => new Date(2026, 9, d, h, 0, 0).getTime()

let db: Db
let sqlite: Database.Database
beforeEach(() => {
  sqlite = new Database(':memory:')
  migrate(betterDrizzle(sqlite), { migrationsFolder: MIGRATIONS_DIR })
  db = proxyDrizzle(
    async (sql, params, method) => execStmt(sqlite, { sql, params, method }) as { rows: any[] },
    async (queries) => execBatch(sqlite, queries) as { rows: any[] }[],
  )
})

function log(dictId: number, time: number, rating: number, preState: number): void {
  sqlite
    .prepare('INSERT INTO user_review_log (dict_id, review_time, rating, duration_ms, pre_state) VALUES (?,?,?,0,?)')
    .run(dictId, time, rating, preState)
}

describe('progress data', () => {
  it('summarises streak, today, xp and level', async () => {
    const now = at(15, 12)
    log(1, at(13, 10), 3, 0) // day 13
    log(1, at(14, 10), 3, 2) // day 14
    log(2, at(15, 3), 1, 0) // 03:00 on the 15th still belongs to the 14th (4:00 boundary)
    log(2, at(15, 9), 3, 1)
    log(3, at(15, 10), 3, 0)
    await words.addWords(db, [3], at(15, 9))
    await pd.recordTypedCorrect(db, now)
    await pd.recordTypedCorrect(db, now)
    await pd.recordGame(db, now, 40)

    const s = await pd.progressSnapshot(db, now)
    expect(s.streak).toBe(3)
    expect(s.today).toEqual({ reviews: 2, newLearned: 1, typedCorrect: 2, games: 1, wordsAdded: 1 })
    expect(s.xp).toBe(5 * 10 + 4 * 5 + 40)
    expect(s.activeDays).toContain(dayWindow(at(14, 10)).startMs)
  })

  it('daily counters reset on a new learning day', async () => {
    await pd.recordTypedCorrect(db, at(15, 12))
    await pd.recordGame(db, at(15, 12), 10)
    const tomorrow = await pd.progressSnapshot(db, at(16, 12))
    expect(tomorrow.today.typedCorrect).toBe(0)
    expect(tomorrow.today.games).toBe(0)
    expect(tomorrow.xp).toBe(10) // bonus XP is kept
  })
})
