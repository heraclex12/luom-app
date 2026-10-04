// User-defined word collections (local tables collection / collection_word). Collections group words of My words;
// they never own them: deleting a collection only drops memberships. Names are unique ignoring case.
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { runBatch, type Db } from '@/db/client'
import { collection, collectionWord, userWord } from '@/db/schema'

export interface CollectionSummary {
  collectionId: number
  name: string
  /** Words of the collection that are still in My words. */
  wordCount: number
}

function cleanName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  if (!trimmed) throw new Error('Please enter a collection name.')
  if (trimmed.length > 60) throw new Error('Collection names can be at most 60 characters.')
  return trimmed
}

async function assertNameFree(db: Db, name: string, exceptId?: number): Promise<void> {
  const clash = await db
    .select({ id: collection.collectionId })
    .from(collection)
    .where(sql`lower(${collection.name}) = lower(${name})`)
    .get()
  if (clash && clash.id !== exceptId) throw new Error(`A collection named “${name}” already exists.`)
}

/** All collections, alphabetical (case-insensitive), with live word counts. */
export async function listCollections(db: Db): Promise<CollectionSummary[]> {
  return db
    .select({
      collectionId: collection.collectionId,
      name: collection.name,
      wordCount: sql<number>`count(${userWord.dictId})`,
    })
    .from(collection)
    .leftJoin(collectionWord, eq(collectionWord.collectionId, collection.collectionId))
    .leftJoin(userWord, and(eq(userWord.dictId, collectionWord.dictId), eq(userWord.isDeleted, 0)))
    .groupBy(collection.collectionId)
    .orderBy(asc(sql`lower(${collection.name})`))
    .all()
}

export async function createCollection(db: Db, name: string, now: number): Promise<number> {
  const clean = cleanName(name)
  await assertNameFree(db, clean)
  const next = ((await db.select({ m: sql<number>`max(${collection.collectionId})` }).from(collection).get())?.m ?? 0) + 1
  await db.insert(collection).values({ collectionId: next, name: clean, createdAt: now }).run()
  return next
}

export async function renameCollection(db: Db, collectionId: number, name: string): Promise<void> {
  const clean = cleanName(name)
  await assertNameFree(db, clean, collectionId)
  await db.update(collection).set({ name: clean }).where(eq(collection.collectionId, collectionId)).run()
}

/** Delete a collection and its memberships (words stay in My words). */
export async function deleteCollection(db: Db, collectionId: number): Promise<void> {
  await runBatch(db, [
    db.delete(collectionWord).where(eq(collectionWord.collectionId, collectionId)),
    db.delete(collection).where(eq(collection.collectionId, collectionId)),
  ])
}

/** Add words to a collection (idempotent). Callers make sure the words are in My words. */
export async function addToCollection(db: Db, collectionId: number, dictIds: readonly number[], now: number): Promise<void> {
  if (dictIds.length === 0) return
  await runBatch(
    db,
    dictIds.map((dictId) =>
      db.insert(collectionWord).values({ collectionId, dictId, addedAt: now }).onConflictDoNothing(),
    ),
  )
}

export async function removeFromCollection(db: Db, collectionId: number, dictIds: readonly number[]): Promise<void> {
  if (dictIds.length === 0) return
  await db
    .delete(collectionWord)
    .where(and(eq(collectionWord.collectionId, collectionId), inArray(collectionWord.dictId, [...dictIds])))
    .run()
}

/** Collection ids a word belongs to. */
export async function collectionsOfWord(db: Db, dictId: number): Promise<number[]> {
  const rows = await db
    .select({ id: collectionWord.collectionId })
    .from(collectionWord)
    .where(eq(collectionWord.dictId, dictId))
    .all()
  return rows.map((r) => r.id)
}

/** Replace a word's memberships with exactly `collectionIds` (the "Collections…" checkbox dialog). */
export async function setWordCollections(
  db: Db,
  dictId: number,
  collectionIds: readonly number[],
  now: number,
): Promise<void> {
  const stmts: BatchItem<'sqlite'>[] = [db.delete(collectionWord).where(eq(collectionWord.dictId, dictId))]
  for (const collectionId of new Set(collectionIds)) {
    stmts.push(db.insert(collectionWord).values({ collectionId, dictId, addedAt: now }))
  }
  await runBatch(db, stmts)
}

/** Remove a word from every collection (used when it is removed from My words). */
export async function removeWordEverywhere(db: Db, dictId: number): Promise<void> {
  await db.delete(collectionWord).where(eq(collectionWord.dictId, dictId)).run()
}

/** Number of collections (diagnostics). */
export async function collectionCount(db: Db): Promise<number> {
  return (await db.select({ n: count() }).from(collection).get())?.n ?? 0
}
