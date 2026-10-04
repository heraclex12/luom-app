// Bookmark primitives (user_book_bookmark change-stream LWW collection + tombstones).
// Same rules as annotations (tombstone deletes, createdAt never refreshed); separate tables, so not merged with annotations.
import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { userBookBookmark } from '@/db/schema'
import type { BookmarkRecord } from './types'

const COLUMNS = {
  id: userBookBookmark.bookmarkId,
  bookHash: userBookBookmark.bookHash,
  cfi: userBookBookmark.cfi,
  title: userBookBookmark.title,
  createdAt: userBookBookmark.createdAt,
}

/** All bookmarks of a book (no tombstones), in creation order. */
export async function listBookmarks(db: Db, bookHash: string): Promise<BookmarkRecord[]> {
  return db
    .select(COLUMNS)
    .from(userBookBookmark)
    .where(and(eq(userBookBookmark.bookHash, bookHash), eq(userBookBookmark.isDeleted, 0)))
    .orderBy(asc(userBookBookmark.createdAt))
    .all()
}

/** Add a bookmark (caller supplies the full record, like annotations.addAnnotation). */
export async function addBookmark(db: Db, b: BookmarkRecord, editTime: number): Promise<void> {
  await db
    .insert(userBookBookmark)
    .values({ ...b, bookmarkId: b.id, editTime, isDeleted: 0, dirty: 1 })
    .run()
}

/** Rename (the only editable field): refreshes editTime + dirty, keeps createdAt. */
export async function renameBookmark(db: Db, id: string, title: string, now: number): Promise<void> {
  await db
    .update(userBookBookmark)
    .set({ title, editTime: now, dirty: 1 })
    .where(and(eq(userBookBookmark.bookmarkId, id), eq(userBookBookmark.isDeleted, 0)))
    .run()
}

/** Delete a bookmark: write a tombstone (with the isDeleted=0 idempotency guard). */
export async function removeBookmark(db: Db, id: string, now: number): Promise<void> {
  await db
    .update(userBookBookmark)
    .set({ isDeleted: 1, editTime: now, dirty: 1 })
    .where(and(eq(userBookBookmark.bookmarkId, id), eq(userBookBookmark.isDeleted, 0)))
    .run()
}
