// Library orchestration: import / open / delete. Wires the platform bridge (file dialog + content-addressed
// storage), the engine (metadata and cover) and user_book primitives. The db singleton and clock are bound here.
import { db } from '@/db/client'
import { booksBridge } from '@/platform'
import { calibratedNowSync } from '@/sync/clock'
import { BOOK_FORMATS, formatFromFileName, isBookFormat } from '../../../shared/books'
import { markdownFileToEpub } from './engine/markdownBook'
import * as books from './books'
import { readBookMeta } from './engine/bookMeta'
import { svg2png } from './svg2png'
import type { BookRecord, ShelfBook } from './types'

export type ImportResult =
  | { status: 'canceled' }
  /** A live row with this hash already exists: no new row, and a user-edited title is not overwritten. */
  | { status: 'exists'; book: BookRecord }
  /** New book added, or a tombstoned row revived by re-import (restored). */
  | { status: 'added' | 'restored'; title: string }

/**
 * Import a local book: pick file → detect format → hash → check user_book (live / tombstoned / none) →
 * copy into content-addressed storage → parse metadata and cover → write row.
 *
 * Format comes from the file extension only (the dialog filters by the same table). The extension also sets
 * the stored extension; content is validated by parsing (foliate sniffs magic bytes), and failures roll back.
 *
 * Copy-before-parse is deliberate: the renderer has no fs access to the picked path, so main copies the file
 * into `books/<hash>/` first and the bytes are read back via `books:read`.
 */
export async function importBook(): Promise<ImportResult> {
  const picked = await booksBridge.pick()
  if (!picked) return { status: 'canceled' }
  const format = formatFromFileName(picked.fileName)
  if (!format) throw new Error(`Unsupported file format: ${picked.fileName}`)

  const bookHash = await booksBridge.hash(picked.path)
  const existing = await books.getBook(db, bookHash)
  // Remember whether the file already existed: rollback only removes what this import copied (see discardImportedFile).
  const preExisted = await booksBridge.stat(bookHash, format)

  try {
    // The copy is idempotent (no-op if present), so this also restores a manually deleted file for an existing row.
    await booksBridge.importFile(picked.path, bookHash, format)
    if (existing && !existing.isDeleted) return { status: 'exists', book: existing }

    const meta = await readBookMeta(await openBookFile(bookHash, format))
    // Fall back to the file name when the book has no title.
    const title = meta.title || stripExtension(picked.fileName)
    const now = calibratedNowSync()
    await books.addBook(db, { bookHash, title, author: meta.author, format }, now)
    await saveCover(bookHash, meta.cover)
    return { status: existing ? 'restored' : 'added', title }
  } catch (e) {
    await discardImportedFile(bookHash, preExisted)
    throw e
  }
}

/**
 * File-side rollback when an import fails midway (unparseable book, row write failure…).
 * Otherwise `books/<hash>/` would be orphaned with no `user_book` row to own it.
 * Best-effort: a cleanup failure only logs a warning so it doesn't mask the original import error.
 *
 * Never deletes when `preExisted` is true: that file was already on this device.
 */
async function discardImportedFile(bookHash: string, preExisted: boolean): Promise<void> {
  if (preExisted) return
  try {
    await booksBridge.deleteDir(bookHash)
  } catch (e) {
    console.warn('[reading] Failed to clean up book directory after import failure:', bookHash, e)
  }
}

/**
 * Library list (no tombstones, most recently read first) plus a per-book stat of the file and cover.
 * Checked at render time rather than stored, since a status column would drift from the filesystem.
 * Stat is local and cheap at library scale; rows with an unknown format count as missing (can't be opened).
 *
 * The cover is stat'ed before handing out a URL instead of relying on `<img onError>`: books without covers
 * are common, and that would fire a burst of guaranteed 404s every time the library opens.
 * A cover deleted after the stat is still handled by onError.
 */
export async function listShelf(): Promise<ShelfBook[]> {
  const rows = await books.listBooks(db)
  return Promise.all(
    rows.map(async (book) => {
      const [hasFile, hasCover] = await Promise.all([
        isBookFormat(book.format) && booksBridge.stat(book.bookHash, book.format),
        booksBridge.statCover(book.bookHash),
      ])
      return { ...book, hasFile, coverUrl: hasCover ? booksBridge.coverUrl(book.bookHash) : null }
    }),
  )
}

/**
 * Read a book file from content-addressed storage for the engine.
 * Must include an extension: foliate `makeBook` detects the format from `file.name`.
 *
 * `format` comes from a text column (any string), so narrow it to a known format here
 * rather than splicing an arbitrary string into a file path.
 */
export async function openBookFile(bookHash: string, format: string): Promise<File> {
  if (!isBookFormat(format)) throw new Error(`Unsupported book format: ${format}`)
  const bytes = await booksBridge.read(bookHash, format)
  const file = new File([bytes], `book.${format}`, { type: BOOK_FORMATS[format].mime })
  // The engine has no Markdown parser: hand it the same text as a small EPUB (no title → import uses the file name).
  return format === 'md' ? markdownFileToEpub(file, '') : file
}

/** Delete a book: tombstone the row + remove the local file directory; progress / highlights are kept (re-import restores). */
export async function deleteBook(bookHash: string): Promise<void> {
  await books.removeBook(db, bookHash, calibratedNowSync())
  await booksBridge.deleteDir(bookHash)
}

/**
 * File-side cleanup after a book deletion arrives via sync (called by the sync engine after applying a pull):
 * removes the `books/<hash>/` directory. Reading data is kept; re-importing the same book restores it.
 *
 * Re-checks each local row: if a remote tombstone lost to a newer local edit, apply keeps the local row
 * and the file must stay. Directory removal failures only log a warning — leftover files are harmless,
 * aborting the whole sync round is not.
 */
export async function purgeRemovedBookFiles(bookHashes: readonly string[]): Promise<void> {
  for (const bookHash of bookHashes) {
    if (await books.getBook(db, bookHash)) continue // local row survived (local edit won) → keep the file
    try {
      await booksBridge.deleteDir(bookHash)
    } catch (e) {
      console.warn('[reading] Failed to delete file of a book removed via sync:', bookHash, e)
    }
  }
}

/**
 * Store the cover. It's a derived artifact, so extraction failure logs a warning and the import continues.
 * Non-SVG covers are written as-is to `cover.png` (even JPEGs; browsers sniff the content).
 */
async function saveCover(bookHash: string, cover: Blob | null): Promise<void> {
  if (!cover) return
  try {
    const png = cover.type === 'image/svg+xml' ? await svg2png(cover) : cover
    await booksBridge.writeCover(bookHash, new Uint8Array(await png.arrayBuffer()))
  } catch (e) {
    console.warn('[reading] Cover extraction failed, skipping:', e)
  }
}

/** `Moby Dick.epub` → `Moby Dick`。 */
function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}
