// Word collections: why these behaviours matter —
// • names are unique ignoring case (no "Animals" and "animals" side by side) and never blank;
// • a word can be in several collections; adding is idempotent;
// • counts only include words still in My words (a removed word disappears from its collections' counts);
// • deleting a collection removes memberships only, never words;
// • setWordCollections replaces one word's memberships exactly (the checkbox dialog).
import Database from 'better-sqlite3'
import { drizzle as betterDrizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as proxyDrizzle } from 'drizzle-orm/sqlite-proxy'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { runBatch as execBatch, runStmt as execStmt } from '../../../main/dbExecutor'
import type { Db } from '@/db/client'
import * as wc from './wordCollections'
import * as words from './words'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../drizzle', import.meta.url))

function makeDb(): Db {
  const sqlite = new Database(':memory:')
  migrate(betterDrizzle(sqlite), { migrationsFolder: MIGRATIONS_DIR })
  return proxyDrizzle(
    async (sql, params, method) => execStmt(sqlite, { sql, params, method }) as { rows: any[] },
    async (queries) => execBatch(sqlite, queries) as { rows: any[] }[],
  )
}

let db: Db
beforeEach(async () => {
  db = makeDb()
  await words.addWords(db, [1, 2, 3], 100)
})

describe('collections', () => {
  it('creates collections with trimmed, case-insensitively unique names', async () => {
    const animals = await wc.createCollection(db, '  Animals ', 1)
    await expect(wc.createCollection(db, 'animals', 2)).rejects.toThrow(/already exists/)
    await expect(wc.createCollection(db, '   ', 3)).rejects.toThrow(/name/)
    const list = await wc.listCollections(db)
    expect(list).toEqual([{ collectionId: animals, name: 'Animals', wordCount: 0 }])
  })

  it('lists alphabetically with counts of words still in My words', async () => {
    const veg = await wc.createCollection(db, 'Vegetables', 1)
    const animals = await wc.createCollection(db, 'animals', 2)
    await wc.addToCollection(db, animals, [1, 2], 10)
    await wc.addToCollection(db, animals, [2], 11) // idempotent
    await wc.addToCollection(db, veg, [3], 12)
    await words.removeWords(db, [2], 200)
    expect(await wc.listCollections(db)).toEqual([
      { collectionId: animals, name: 'animals', wordCount: 1 },
      { collectionId: veg, name: 'Vegetables', wordCount: 1 },
    ])
  })

  it('renames (keeping uniqueness) and deletes without touching words', async () => {
    const a = await wc.createCollection(db, 'A', 1)
    const b = await wc.createCollection(db, 'B', 2)
    await wc.addToCollection(db, a, [1], 3)
    await expect(wc.renameCollection(db, b, 'a')).rejects.toThrow(/already exists/)
    await wc.renameCollection(db, a, 'Animals')
    await wc.deleteCollection(db, a)
    expect((await wc.listCollections(db)).map((c) => c.name)).toEqual(['B'])
    expect(await wc.collectionsOfWord(db, 1)).toEqual([])
    expect(await words.getWord(db, 1)).not.toBeNull()
  })

  it('setWordCollections replaces one word’s memberships; removeFromCollection removes one', async () => {
    const a = await wc.createCollection(db, 'A', 1)
    const b = await wc.createCollection(db, 'B', 2)
    const c = await wc.createCollection(db, 'C', 3)
    await wc.setWordCollections(db, 1, [a, b], 10)
    expect((await wc.collectionsOfWord(db, 1)).sort()).toEqual([a, b].sort())
    await wc.setWordCollections(db, 1, [b, c], 11)
    expect((await wc.collectionsOfWord(db, 1)).sort()).toEqual([b, c].sort())
    await wc.removeFromCollection(db, c, [1])
    expect(await wc.collectionsOfWord(db, 1)).toEqual([b])
  })

  it('removeWordEverywhere drops a word from all collections', async () => {
    const a = await wc.createCollection(db, 'A', 1)
    const b = await wc.createCollection(db, 'B', 2)
    await wc.setWordCollections(db, 2, [a, b], 10)
    await wc.removeWordEverywhere(db, 2)
    expect(await wc.collectionsOfWord(db, 2)).toEqual([])
  })
})

describe('word lists filtered by collection', () => {
  it('listAll / listSegment / segmentCounts accept a collection filter', async () => {
    const a = await wc.createCollection(db, 'A', 1)
    await wc.addToCollection(db, a, [1, 3], 10)
    expect((await words.listAll(db, { collectionId: a })).map((w) => w.dictId)).toEqual([1, 3])
    expect((await words.listSegment(db, 'new', 1000, { collectionId: a })).map((w) => w.dictId)).toEqual([1, 3])
    expect((await words.segmentCounts(db, 1000, a)).new).toBe(2)
    expect((await words.segmentCounts(db, 1000)).new).toBe(3)
  })
})
