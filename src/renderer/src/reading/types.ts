// Public types of the reading domain (type-only imports may reach this file directly).
// Engine types live in engine/foliateEngine.ts and are re-exported by the facade; this file holds data-side types.

/**
 * A library book (user_book row). isDeleted is included because import distinguishes none / live / tombstoned:
 * no row = new book, tombstoned = revive, live = "already in your library".
 * No file path: it is fully determined by bookHash + format (`<userData>/books/<hash>/book.<format>`);
 * whether the file is on this device is checked at runtime via booksBridge.stat.
 */
export interface BookRecord {
  bookHash: string
  title: string
  author: string
  format: string
  /** Time added to the library (calibrated epoch ms): fallback sort key without progress; not changed by rename. */
  importedAt: number
  isDeleted: number
  /** Fraction of the book read, 0–1; null = never opened (no progress row). */
  fraction: number | null
  /** Last read time (calibrated epoch ms); null = never opened. Primary library sort key, falls back to importedAt. */
  lastReadAt: number | null
}

/**
 * A library row as displayed = stored metadata + a runtime check of whether the book file is on this device
 * (no status column; the filesystem is the source of truth). Book files are never synced, so a book imported
 * elsewhere has only metadata here until re-imported — that is `hasFile === false`.
 */
export interface ShelfBook extends BookRecord {
  /** false = file not on this device (imported elsewhere, or deleted manually): can't be opened. */
  hasFile: boolean
  /**
   * Cover image URL (custom protocol, usable as `<img src>`); null = no cover file, use a text cover.
   * Like hasFile, determined at runtime by stat, not stored.
   */
  coverUrl: string | null
}

/** Highlighter preset colors (strict enum). */
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'red'

/** Highlight style: fill / underline / squiggly. */
export type HighlightStyle = 'fill' | 'underline' | 'wavy'

/**
 * An annotation (user_book_annotation row): highlighted text + color/style, with an optional markdown note.
 * Notes are not a separate model: a non-empty `note` makes it a note; the Notes panel filters on `note != ''`.
 * No `chapterLabel`: chapter grouping is derived from `cfi` against the current TOC.
 * No page number: pages depend on layout, so "p N" is computed from `cfi` against the current pagination.
 */
export interface AnnotationRecord {
  /** Client UUID (column annotation_id); annotations and bookmarks share the `.id` shape in the UI. */
  id: string
  bookHash: string
  /** Highlight range CFI: used to jump back, as the overlay key, and for sorting / current-position checks. */
  cfi: string
  text: string
  color: HighlightColor
  style: HighlightStyle
  /** markdown; empty string = highlight only. */
  note: string
  /** Created time (calibrated epoch ms); **not updated on edit**. */
  createdAt: number
}

/** A bookmark (user_book_bookmark row): location + a renamable label. */
export interface BookmarkRecord {
  id: string
  bookHash: string
  cfi: string
  /** Label (defaults to the chapter name, can be renamed in place). */
  title: string
  createdAt: number
}

/**
 * One continuous reading session (user_reading_event row): append-only, rows are immutable with no edit_time or tombstone.
 * Natural key `(bookHash, startTime)`; daily time / per-book totals / streaks are all derived in SQL.
 */
export interface ReadingEventRecord {
  bookHash: string
  /** Session start (calibrated epoch ms, second precision — the tracker counts in seconds). */
  startTime: number
  /** Duration in ms, always within [3000, 120000] (clamped at capture). */
  durationMs: number
  /** Book fraction at the end of the session, 0–1 (raw data for progress-over-time stats). */
  fraction: number
}

/** Reading progress (user_book_progress row): one row per book, no tombstone. */
export interface ProgressRecord {
  bookHash: string
  /** Current reading position CFI. */
  location: string
  fraction: number
  lastReadAt: number
}
