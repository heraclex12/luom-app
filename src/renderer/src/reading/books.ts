// Library metadata primitives (user_book change-stream LWW collection + tombstones).
// Pure functions: db and calibrated time are passed in by the facade; no engine / facade / platform imports.
// Deletion always writes a tombstone (is_deleted=1) rather than a physical DELETE, so it can propagate.
// Local book files are managed by platform's booksBridge, decoupled from this table (presence is a runtime stat).
import { and, desc, eq, sql } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { userBook, userBookProgress } from '@/db/schema'
import type { BookRecord } from './types'

// A library row = user_book ⟕ user_book_progress (unread books have no progress row; both columns null).
const COLUMNS = {
  bookHash: userBook.bookHash,
  title: userBook.title,
  author: userBook.author,
  format: userBook.format,
  importedAt: userBook.importedAt,
  isDeleted: userBook.isDeleted,
  fraction: userBookProgress.fraction,
  lastReadAt: userBookProgress.lastReadAt,
}

/**
 * Library list (no tombstones), most recently read first: read books by lastReadAt desc, unread by importedAt.
 * Mixed via coalesce, so a freshly imported unread book slots in among recently read ones.
 */
export async function listBooks(db: Db): Promise<BookRecord[]> {
  return db
    .select(COLUMNS)
    .from(userBook)
    .leftJoin(userBookProgress, eq(userBookProgress.bookHash, userBook.bookHash))
    .where(eq(userBook.isDeleted, 0))
    .orderBy(desc(sql`coalesce(${userBookProgress.lastReadAt}, ${userBook.importedAt})`))
    .all()
}

/** Get one book (**including tombstoned rows**; null if no row): import uses isDeleted to tell "already in library" from "revivable". */
export async function getBook(db: Db, bookHash: string): Promise<BookRecord | null> {
  const row = await db
    .select(COLUMNS)
    .from(userBook)
    .leftJoin(userBookProgress, eq(userBookProgress.bookHash, userBook.bookHash))
    .where(eq(userBook.bookHash, bookHash))
    .get()
  return row ?? null
}

/** Metadata written on import (bookHash from file content, title/author normalized from EPUB metadata). */
export type BookInput = Pick<BookRecord, 'bookHash' | 'title' | 'author' | 'format'>

/**
 * Add to library: insert a new book, or rewrite metadata and revive an existing row (including tombstoned).
 * importedAt is set only on first insert and **not refreshed on revive**, so re-importing doesn't bump an old book to the top.
 *
 * This only holds while the local tombstone still exists: once it is pushed (physically deleted) or a remote
 * tombstone is pulled, no local row remains and re-import takes the "no row" path with importedAt = now.
 * (importedAt only drives library sorting, so this doesn't affect consistency.)
 */
export async function addBook(db: Db, book: BookInput, now: number): Promise<void> {
  const { title, author, format } = book
  await db
    .insert(userBook)
    .values({ ...book, importedAt: now, editTime: now, isDeleted: 0, dirty: 1 })
    .onConflictDoUpdate({
      target: userBook.bookHash,
      set: { title, author, format, editTime: now, isDeleted: 0, dirty: 1 },
    })
    .run()
}

/** Rename (table only, file untouched; refreshes editTime, keeps importedAt). No-op without a live row. */
export async function renameBook(db: Db, bookHash: string, title: string, now: number): Promise<void> {
  await db
    .update(userBook)
    .set({ title, editTime: now, dirty: 1 })
    .where(and(eq(userBook.bookHash, bookHash), eq(userBook.isDeleted, 0)))
    .run()
}

/**
 * Delete a book: write a tombstone (reading data is kept; the caller removes the local file).
 * The isDeleted=0 guard makes it idempotent: repeat deletes don't bump editTime over concurrent writes.
 */
export async function removeBook(db: Db, bookHash: string, now: number): Promise<void> {
  await db
    .update(userBook)
    .set({ isDeleted: 1, editTime: now, dirty: 1 })
    .where(and(eq(userBook.bookHash, bookHash), eq(userBook.isDeleted, 0)))
    .run()
}
