// Reading progress primitives (user_book_progress change-stream LWW collection, **no tombstone**).
// One row per book, upserted on page turn. lastReadAt and editTime are written with the same value but kept separate:
// editTime is for conflict resolution only (library sorting reads lastReadAt). Deleting a book keeps its progress.
import { eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { userBookProgress } from '@/db/schema'
import type { ProgressRecord } from './types'

const COLUMNS = {
  bookHash: userBookProgress.bookHash,
  location: userBookProgress.location,
  fraction: userBookProgress.fraction,
  lastReadAt: userBookProgress.lastReadAt,
}

/** Get a book's progress; null if never opened (decides whether to restore position on open). */
export async function getProgress(db: Db, bookHash: string): Promise<ProgressRecord | null> {
  const row = await db
    .select(COLUMNS)
    .from(userBookProgress)
    .where(eq(userBookProgress.bookHash, bookHash))
    .get()
  return row ?? null
}

/** Save progress (one row per book, upsert). The caller already debounces. */
export async function saveProgress(
  db: Db,
  p: Pick<ProgressRecord, 'bookHash' | 'location' | 'fraction'>,
  now: number,
): Promise<void> {
  const set = { location: p.location, fraction: p.fraction, lastReadAt: now, editTime: now, dirty: 1 }
  await db
    .insert(userBookProgress)
    .values({ bookHash: p.bookHash, ...set })
    .onConflictDoUpdate({ target: userBookProgress.bookHash, set })
    .run()
}
