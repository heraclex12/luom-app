// Reading event primitives (user_reading_event change-stream **append-only** collection).
// Pure functions: db is passed in by the orchestrator.
// Rows are immutable — no update, delete or tombstone; aggregates (daily time / per-book totals / streaks) are derived in SQL.
import type { Db } from '@/db/client'
import { userReadingEvent } from '@/db/schema'
import type { ReadingEventRecord } from './types'

/**
 * Append a reading session (dirty=1). An existing row with the same `(bookHash, startTime)` is silently ignored —
 * a replayed flush shouldn't double the time; idempotency comes from the natural key, not the caller.
 */
export async function addReadingEvent(db: Db, e: ReadingEventRecord): Promise<void> {
  await db
    .insert(userReadingEvent)
    .values({ ...e, dirty: 1 })
    .onConflictDoNothing()
    .run()
}
