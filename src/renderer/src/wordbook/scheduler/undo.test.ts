// Undo the last rating (Study's Z): the word row goes back to its pre-rating FSRS state, the review log entry is
// removed (so today's counts and the streak are as before), and the session serves the card again before the one
// that was showing. A row changed since the rating (another rating, mark as known) is left alone.
import Database from 'better-sqlite3'
import { drizzle as betterDrizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as proxyDrizzle } from 'drizzle-orm/sqlite-proxy'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { Rating, State } from 'ts-fsrs'
import { runBatch as execBatch, runStmt as execStmt } from '../../../../main/dbExecutor'
import type { Db } from '@/db/client'
import * as words from '../words'
import { nextDayAt } from '../time'
import { rate, StudySession, undoRate, type QueueItem } from './queue'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../../drizzle', import.meta.url))

interface TestDb {
  db: Db
  sqlite: Database.Database
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeDb(): TestDb {
  const sqlite = new Database(':memory:')
  migrate(betterDrizzle(sqlite), { migrationsFolder: MIGRATIONS_DIR })
  const db = proxyDrizzle(
    async (sql, params, method) => execStmt(sqlite, { sql, params, method }) as { rows: any[] },
    async (queries) => execBatch(sqlite, queries) as { rows: any[] }[],
  )
  return { db, sqlite }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const MIN = 60_000
const DAY = 24 * 60 * MIN
const NOW = new Date(2026, 0, 15, 10, 0, 0, 0).getTime()
const ND = nextDayAt(NOW)

function seedWord(h: TestDb, dictId: number, o: { state?: number; due?: number | null; reps?: number; stability?: number; difficulty?: number; scheduledDays?: number; lastReview?: number | null } = {}): void {
  h.sqlite.prepare('INSERT INTO dict (dict_id, term, entry) VALUES (?,?,?)').run(dictId, `w${dictId}`, '{}')
  h.sqlite
    .prepare(
      `INSERT INTO user_word
       (dict_id, due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, state, last_review, join_time, edit_time, is_deleted, dirty)
       VALUES (?,?,?,?,?,0,?,0,?,?,0,0,0,0)`,
    )
    .run(dictId, o.due ?? null, o.stability ?? 0, o.difficulty ?? 0, o.scheduledDays ?? 0, o.reps ?? 0, o.state ?? 0, o.lastReview ?? null)
}

const logCount = (h: TestDb, dictId: number): number =>
  (h.sqlite.prepare('SELECT count(*) AS n FROM user_review_log WHERE dict_id=?').get(dictId) as { n: number }).n

const session = (items: QueueItem[]): StudySession => new StudySession(items, [], ND)

describe('undoRate', () => {
  let h: TestDb
  beforeEach(() => {
    h = makeDb()
  })

  it('restores the pre-rating row and removes the review log entry', async () => {
    seedWord(h, 1, { state: State.Review, due: NOW - DAY, reps: 4, stability: 12, difficulty: 5, scheduledDays: 10, lastReview: NOW - 11 * DAY })
    const before = await words.getWord(h.db, 1)
    const r = await rate(h.db, null, { dictId: 1, rating: Rating.Again, durationMs: 1000, snapshotReps: 4 }, NOW)
    expect(r.kind).toBe('rated')
    if (r.kind !== 'rated') return
    expect(logCount(h, 1)).toBe(1)

    const ok = await undoRate(h.db, null, { prev: r.prev, reviewTime: r.reviewTime, kind: 'review' }, null, NOW + MIN)
    expect(ok).toBe(true)
    expect(await words.getWord(h.db, 1)).toEqual(before)
    expect(logCount(h, 1)).toBe(0)
  })

  it('a new word goes back to new (due null)', async () => {
    seedWord(h, 1)
    const r = await rate(h.db, null, { dictId: 1, rating: Rating.Good, durationMs: 0, snapshotReps: 0 }, NOW)
    if (r.kind !== 'rated') throw new Error('not rated')
    await undoRate(h.db, null, { prev: r.prev, reviewTime: r.reviewTime, kind: 'new' }, null, NOW)
    const w = await words.getWord(h.db, 1)
    expect(w?.state).toBe(State.New)
    expect(w?.due).toBeNull()
    expect(w?.reps).toBe(0)
  })

  it('serves the undone card again, then the card that was showing', async () => {
    seedWord(h, 1)
    seedWord(h, 2)
    seedWord(h, 3)
    const s = session([
      { dictId: 1, due: null, kind: 'new' },
      { dictId: 2, due: null, kind: 'new' },
      { dictId: 3, due: null, kind: 'new' },
    ])
    expect(s.nextCard(NOW)).toEqual({ kind: 'card', dictId: 1, cardKind: 'new' })
    // Again → a learning step due in a minute: requeued into the session.
    const r = await rate(h.db, s, { dictId: 1, rating: Rating.Again, durationMs: 0, snapshotReps: 0 }, NOW)
    if (r.kind !== 'rated') throw new Error('not rated')
    expect(s.nextCard(NOW)).toEqual({ kind: 'card', dictId: 2, cardKind: 'new' })

    await undoRate(h.db, s, { prev: r.prev, reviewTime: r.reviewTime, kind: 'new' }, { dictId: 2, kind: 'new' }, NOW)
    expect(s.counts()).toEqual({ new: 3, learning: 0, review: 0 })
    const order: number[] = []
    for (;;) {
      const c = s.nextCard(NOW)
      if (c.kind !== 'card') break
      order.push(c.dictId)
    }
    // The requeued learning step is gone: word 1 appears once.
    expect(order).toEqual([1, 2, 3])
  })

  it('the same card showing again (only card left) is put back once', async () => {
    seedWord(h, 1)
    const s = session([{ dictId: 1, due: null, kind: 'new' }])
    s.nextCard(NOW)
    const r = await rate(h.db, s, { dictId: 1, rating: Rating.Again, durationMs: 0, snapshotReps: 0 }, NOW)
    if (r.kind !== 'rated') throw new Error('not rated')
    const again = s.nextCard(NOW + 2 * MIN)
    expect(again).toMatchObject({ kind: 'card', dictId: 1 })
    await undoRate(h.db, s, { prev: r.prev, reviewTime: r.reviewTime, kind: 'new' }, { dictId: 1, kind: 'learning' }, NOW + 2 * MIN)
    expect(s.nextCard(NOW + 2 * MIN)).toEqual({ kind: 'card', dictId: 1, cardKind: 'new' })
    expect(s.nextCard(NOW + 2 * MIN)).toEqual({ kind: 'done' })
  })

  it('leaves a row alone that changed after the rating', async () => {
    seedWord(h, 1)
    const r = await rate(h.db, null, { dictId: 1, rating: Rating.Good, durationMs: 0, snapshotReps: 0 }, NOW)
    if (r.kind !== 'rated') throw new Error('not rated')
    await words.setMastered(h.db, 1, NOW + MIN)
    const ok = await undoRate(h.db, null, { prev: r.prev, reviewTime: r.reviewTime, kind: 'new' }, null, NOW + 2 * MIN)
    expect(ok).toBe(false)
    expect((await words.getWord(h.db, 1))?.state).toBe(4)
    expect(logCount(h, 1)).toBe(1)
  })
})
