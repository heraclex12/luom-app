// Studying one collection: the session (and "study more" groups) only serve words of that collection,
// while the daily limits stay global (they are derived from today's review log).
import Database from 'better-sqlite3'
import { drizzle as betterDrizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as proxyDrizzle } from 'drizzle-orm/sqlite-proxy'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runBatch as execBatch, runStmt as execStmt } from '../../../../main/dbExecutor'
import type { Db } from '@/db/client'
import { DEFAULT_SETTINGS } from '@/settings/defaults'
import * as words from '../words'
import * as wc from '../wordCollections'
import { buildTodaySession, extraCounts, extraGroup } from './queue'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../../drizzle', import.meta.url))
const NOW = new Date(2026, 9, 15, 10, 0, 0).getTime()

function makeDb(): { db: Db; sqlite: Database.Database } {
  const sqlite = new Database(':memory:')
  migrate(betterDrizzle(sqlite), { migrationsFolder: MIGRATIONS_DIR })
  const db = proxyDrizzle(
    async (sql, params, method) => execStmt(sqlite, { sql, params, method }) as { rows: any[] },
    async (queries) => execBatch(sqlite, queries) as { rows: any[] }[],
  )
  return { db, sqlite }
}

function drain(session: ReturnType<typeof buildTodaySession> extends Promise<infer S> ? S : never): number[] {
  const out: number[] = []
  for (;;) {
    const c = session.nextCard(NOW)
    if (c.kind !== 'card') return out
    out.push(c.dictId)
  }
}

describe('collection-scoped study', () => {
  it('serves only the collection’s words; unscoped serves all', async () => {
    const { db, sqlite } = makeDb()
    for (const id of [1, 2, 3, 4]) sqlite.prepare('INSERT INTO dict (dict_id, term, entry) VALUES (?,?,?)').run(id, `w${id}`, '{}')
    await words.addWords(db, [1, 2, 3, 4], NOW - 1000)
    const animals = await wc.createCollection(db, 'Animals', NOW)
    await wc.addToCollection(db, animals, [2, 4], NOW)
    const settings = { ...DEFAULT_SETTINGS, newCardOrder: 'joinTime' as const }

    expect(drain(await buildTodaySession(db, settings, NOW, animals)).sort()).toEqual([2, 4])
    expect(drain(await buildTodaySession(db, settings, NOW)).sort()).toEqual([1, 2, 3, 4])

    const extra = await extraGroup(db, 'learn', 10, NOW, new Set(), 'joinTime', animals)
    expect(extra.map((e) => e.dictId)).toEqual([2, 4])
    expect((await extraCounts(db, NOW, new Set(), animals)).learn).toBe(2)
  })
})
