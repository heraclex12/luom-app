/**
 * Highlight / bookmark store for the current book: shared by the reader's highlights list, notes and bookmarks.
 *
 * **SQLite is the source of truth** (user_book_annotation / user_book_bookmark via `@/reading`); this module is an
 * in-memory mirror + subscription channel for the open book: `loadBookData(bookHash)` on open, `clearBookData()` on close.
 * Only one book is open at a time, so the store isn't sharded; it just remembers which book is loaded to drop stale loads.
 *
 * Writes update the **mirror first, then the DB**: the note editor writes on every keystroke, waiting for IPC would feel laggy.
 * DB writes are serialized in commit order (`chain`), so "create then recolor" can't run the update before the insert.
 * Write failures are always surfaced: toast + reload from the DB to bring the mirror back in sync.
 *
 * Sync reads (`getAnnotation` / `findAnnotationByCfi`) serve event callbacks; reactive reads go through `useSyncExternalStore`.
 */
import { useSyncExternalStore } from 'react'
import { toast } from '@/lib/toast'
import * as reading from '@/reading'
import type { AnnotationRecord, BookmarkRecord } from '@/reading'

let bookHash = ''
let annotations: AnnotationRecord[] = []
let bookmarks: BookmarkRecord[] = []

const listeners = new Set<() => void>()
function emit(): void {
  for (const l of listeners) l()
}
function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

// ── Open / close book ──────────────────────────────────────────────────────────────
/** Read from the DB and replace the mirror. Results arriving after a book switch / unmount are dropped. **Caller must serialize** (see below). */
async function readIntoMirror(hash: string): Promise<void> {
  const [a, b] = await Promise.all([reading.listAnnotations(hash), reading.listBookmarks(hash)])
  if (bookHash !== hash) return
  annotations = a
  bookmarks = b
  emit()
}

/**
 * Load the book's highlights and bookmarks (once, on open).
 *
 * Queued on the write `chain` instead of reading directly: writes update the mirror then persist via chain, so a concurrent
 * load could snapshot before a write lands and wipe a just-made highlight from the list (it's saved, but only reappears on reopen).
 */
export function loadBookData(hash: string): Promise<void> {
  bookHash = hash
  const task = chain.then(() => readIntoMirror(hash))
  // Don't break the queue on a failed load (the caller handles it: the open path already toasts and continues).
  chain = task.catch(() => {})
  return task
}

/** Close book: clear the mirror (so the next book doesn't flash the previous one's highlights). */
export function clearBookData(): void {
  bookHash = ''
  annotations = []
  bookmarks = []
  emit()
}

// ── Write queue ────────────────────────────────────────────────────────────────
let chain: Promise<unknown> = Promise.resolve()

/** Serialize one write; on failure, report it and reload from the DB to resync the mirror. */
function persist(op: () => Promise<void>, what: string): void {
  chain = chain
    .then(op)
    .catch(async (e) => {
      console.error(`[reading] ${what} failed:`, e)
      toast.error(`Couldn't ${what}. Restored to the last saved state.`)
      // Read directly, not via loadBookData: we're running on the chain, queueing again would wait on ourselves (deadlock).
      const hash = bookHash
      if (hash) await readIntoMirror(hash)
    })
}

// ── Reactive reads (panel subscriptions) ──────────────────────────────────────────────────────
export function useAnnotations(): AnnotationRecord[] {
  return useSyncExternalStore(subscribe, () => annotations)
}
export function useBookmarks(): BookmarkRecord[] {
  return useSyncExternalStore(subscribe, () => bookmarks)
}

// ── Sync reads (latest values for event callbacks) ────────────────────────────────
export function getAnnotation(id: string): AnnotationRecord | undefined {
  return annotations.find((a) => a.id === id)
}
export function findAnnotationByCfi(cfi: string): AnnotationRecord | undefined {
  return annotations.find((a) => a.cfi === cfi)
}
// ── Writes (replace array references each time for useSyncExternalStore snapshot stability) ────────────

/** Add a highlight (id and createdAt are stamped by the facade). Returns the record so the caller can draw it. */
export function createAnnotation(
  input: Omit<AnnotationRecord, 'id' | 'bookHash' | 'createdAt'>,
): AnnotationRecord {
  const rec = reading.newAnnotation({ ...input, bookHash })
  annotations = [...annotations, rec]
  emit()
  persist(() => reading.addAnnotation(rec), 'save highlight')
  return rec
}

export function updateAnnotation(id: string, patch: reading.AnnotationPatch): void {
  annotations = annotations.map((a) => (a.id === id ? { ...a, ...patch } : a))
  emit()
  persist(() => reading.updateAnnotation(id, patch), 'save highlight')
}

export function removeAnnotation(id: string): void {
  annotations = annotations.filter((a) => a.id !== id)
  emit()
  persist(() => reading.removeAnnotation(id), 'delete highlight')
}

/** Add a bookmark. Returns the record. */
export function createBookmark(
  input: Omit<BookmarkRecord, 'id' | 'bookHash' | 'createdAt'>,
): BookmarkRecord {
  const rec = reading.newBookmark({ ...input, bookHash })
  bookmarks = [...bookmarks, rec]
  emit()
  persist(() => reading.addBookmark(rec), 'save bookmark')
  return rec
}

export function renameBookmark(id: string, title: string): void {
  bookmarks = bookmarks.map((b) => (b.id === id ? { ...b, title } : b))
  emit()
  persist(() => reading.renameBookmark(id, title), 'rename bookmark')
}

export function removeBookmark(id: string): void {
  bookmarks = bookmarks.filter((b) => b.id !== id)
  emit()
  persist(() => reading.removeBookmark(id), 'delete bookmark')
}
