// Write back and Say it storage: sentences are kept per word (newest first) and can be deleted; speech attempts are
// kept to find the words the Mac keeps hearing as another word.
import Database from 'better-sqlite3'
import { drizzle as betterDrizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as proxyDrizzle } from 'drizzle-orm/sqlite-proxy'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { runBatch as execBatch, runStmt as execStmt } from '../../../main/dbExecutor'
import type { Db } from '@/db/client'
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

describe('sentences', () => {
  let db: Db
  beforeEach(() => {
    db = makeDb()
  })

  it('keeps each word’s sentences, newest first, and deletes one', async () => {
    await data.saveSentences(db, [
      { dictId: 1, text: 'We stayed resilient.', better: '', verdict: 'natural', kind: 'chat', createdAt: 100 },
      { dictId: 2, text: 'A setback.', better: 'It was a setback.', verdict: 'understandable', kind: 'chat', createdAt: 100 },
    ])
    await data.saveSentences(db, [{ dictId: 1, text: 'She is resilient.', better: '', verdict: 'natural', kind: 'finish', createdAt: 200 }])
    const one = await data.sentencesOf(db, 1)
    expect(one.map((s) => s.text)).toEqual(['She is resilient.', 'We stayed resilient.'])
    expect(one[0]).toMatchObject({ verdict: 'natural', kind: 'finish', createdAt: 200 })
    await data.deleteSentence(db, one[0]!.id)
    expect((await data.sentencesOf(db, 1)).map((s) => s.text)).toEqual(['We stayed resilient.'])
    expect(await data.sentencesOf(db, 2)).toHaveLength(1)
  })
  it('saving nothing is fine', async () => {
    await data.saveSentences(db, [])
    expect(await data.sentencesOf(db, 1)).toEqual([])
  })
})

describe('speech attempts', () => {
  it('records tries, newest first', async () => {
    const db = makeDb()
    await data.recordAttempt(db, { dictId: 1, target: 'resilient', heard: 'resident', ok: false, confidence: 0.9, createdAt: 1 })
    await data.recordAttempt(db, { dictId: 1, target: 'resilient', heard: 'resilient', ok: true, confidence: null, createdAt: 2 })
    expect(await data.recentAttempts(db, 10)).toEqual([
      { dictId: 1, target: 'resilient', heard: 'resilient', ok: true },
      { dictId: 1, target: 'resilient', heard: 'resident', ok: false },
    ])
  })
})
