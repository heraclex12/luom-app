// Rating straight from a notification: "Again" always reschedules soon; "Got it" counts as a successful review
// only when the word is due today (so glancing early doesn't inflate intervals).
import Database from 'better-sqlite3'
import { drizzle as betterDrizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as proxyDrizzle } from 'drizzle-orm/sqlite-proxy'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runBatch as execBatch, runStmt as execStmt } from '../../../main/dbExecutor'
import type { Db } from '@/db/client'
import * as words from './words'
import { quickRate } from './quickRate'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../drizzle', import.meta.url))
const NOW = new Date(2026, 9, 15, 12, 0, 0).getTime()
const DAY = 86_400_000

function setup(due: number, state = 2): { db: Db; sqlite: Database.Database } {
  const sqlite = new Database(':memory:')
  migrate(betterDrizzle(sqlite), { migrationsFolder: MIGRATIONS_DIR })
  const db = proxyDrizzle(
    async (sql, params, method) => execStmt(sqlite, { sql, params, method }) as { rows: any[] },
    async (queries) => execBatch(sqlite, queries) as { rows: any[] }[],
  )
  sqlite.prepare("INSERT INTO dict (dict_id, term, entry) VALUES (1, 'w', '{}')").run()
  sqlite
    .prepare(
      'INSERT INTO user_word (dict_id, due, stability, difficulty, scheduled_days, reps, state, last_review, join_time, edit_time) VALUES (1, ?, 5, 5, 5, 3, ?, ?, 0, 0)',
    )
    .run(due, state, due - 5 * DAY)
  return { db, sqlite }
}

const logs = (s: Database.Database): number => (s.prepare('SELECT count(*) AS n FROM user_review_log').get() as { n: number }).n

describe('quickRate', () => {
  it('"Got it" on a due word = Good review', async () => {
    const { db, sqlite } = setup(NOW - DAY)
    expect(await quickRate(db, 1, 'good', NOW)).toBe('rated')
    expect(logs(sqlite)).toBe(1)
    expect((await words.getWord(db, 1))!.due!).toBeGreaterThan(NOW + DAY)
  })
  it('"Got it" on a word not due yet only notes it', async () => {
    const { db, sqlite } = setup(NOW + 3 * DAY)
    expect(await quickRate(db, 1, 'good', NOW)).toBe('noted')
    expect(logs(sqlite)).toBe(0)
  })
  it('"Again" always reschedules soon', async () => {
    const { db, sqlite } = setup(NOW + 3 * DAY)
    expect(await quickRate(db, 1, 'again', NOW)).toBe('rated')
    expect(logs(sqlite)).toBe(1)
    expect((await words.getWord(db, 1))!.due!).toBeLessThan(NOW + DAY)
  })
  it('missing or mastered words are ignored', async () => {
    const { db } = setup(NOW, 4)
    expect(await quickRate(db, 1, 'again', NOW)).toBe('ignored')
    expect(await quickRate(db, 99, 'good', NOW)).toBe('ignored')
  })
  it('"Hard" (right after a hint) on a due word = Hard review; not due = just noted', async () => {
    const { db, sqlite } = setup(NOW - DAY)
    expect(await quickRate(db, 1, 'hard', NOW)).toBe('rated')
    expect((sqlite.prepare('SELECT rating FROM user_review_log').get() as { rating: number }).rating).toBe(2)
    const later = setup(NOW + 3 * DAY)
    expect(await quickRate(later.db, 1, 'hard', NOW)).toBe('noted')
  })
})
