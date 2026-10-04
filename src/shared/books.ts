// Book files bridge contract shared by main, preload and renderer.
// File dialogs and fs live in main; book business logic (metadata, shelf, progress) stays in the renderer.
//
// Layout is fully determined by the book hash: `<userData>/books/<hash>/book.<format>` + `<hash>/cover.png`.
// Whether a file is present is checked at runtime via stat; there is no status column.

/**
 * Supported book formats: adding a format = adding a row here. The file dialog filter, import detection
 * and the reader gate all read this table. The key is both the on-disk extension (`book.<format>`) and
 * the `user_book.format` value.
 *
 * `extensions` is separate from the key because one format may have several suffixes (e.g. `.fb2.zip` /
 * `.fbz`). `mime` is used when the renderer builds a File for the engine (foliate uses it for cbz / fb2).
 */
export const BOOK_FORMATS = {
  epub: { extensions: ['epub'], mime: 'application/epub+zip' },
  pdf: { extensions: ['pdf'], mime: 'application/pdf' },
  // Markdown is turned into a small EPUB when opened (reading/engine/markdownBook.ts); the original file is kept.
  md: { extensions: ['md', 'markdown'], mime: 'text/markdown' },
} as const satisfies Record<string, { extensions: readonly string[]; mime: string }>

/** Book format (selects the foliate parser and the file extension). */
export type BookFormat = keyof typeof BOOK_FORMATS

/** Extension → format, longest first so multi-part suffixes (e.g. `.fb2.zip`) match before sub-suffixes. */
const BY_EXTENSION: readonly (readonly [string, BookFormat])[] = Object.entries(BOOK_FORMATS)
  .flatMap(([format, spec]) => spec.extensions.map((ext) => [ext, format as BookFormat] as const))
  .sort(([a], [b]) => b.length - a.length)

/** All accepted extensions (no dot), for file dialog filters. */
export const BOOK_EXTENSIONS: readonly string[] = BY_EXTENSION.map(([ext]) => ext)

/** File name → format; null for unknown extensions (import rejects these). */
export function formatFromFileName(fileName: string): BookFormat | null {
  const lower = fileName.toLowerCase()
  return BY_EXTENSION.find(([ext]) => lower.endsWith(`.${ext}`))?.[1] ?? null
}

/**
 * Narrow a free-form string to a known format. `user_book.format` is an unconstrained text column
 * (forward compatible), so check this before building file paths or feeding the engine.
 */
export function isBookFormat(format: string): format is BookFormat {
  // Must use hasOwn, not `in`: `in` would also accept prototype keys like toString / constructor.
  return Object.hasOwn(BOOK_FORMATS, format)
}

/** Book file picked in the dialog. main supplies fileName since the renderer has no node:path. */
export interface PickedBookFile {
  /** Original absolute path (only used for hashing + copying; not stored). */
  path: string
  /** Original file name with extension: determines the format and is the fallback title. */
  fileName: string
}

/** Absolute local paths for a book (e.g. for "Show in Finder"); use stat to check existence. */
export interface BookPaths {
  book: string
  cover: string
}

/**
 * Custom scheme for covers: the renderer uses `envi-book://<hash>/cover.png` as `<img src>` and main serves it.
 *
 * Not `file://`: in dev the renderer runs on `http://localhost`, and Chromium blocks file:// subresources
 * there. Not blob URLs: they need the whole cover in renderer memory, manual revoking, and break
 * `<img loading="lazy">`. A custom scheme works in both modes.
 */
export const BOOK_SCHEME = 'envi-book'

/** Renderable cover URL. Covers never change for a given hash, so no cache-busting is needed. */
export function bookCoverUrl(hash: string): string {
  return `${BOOK_SCHEME}://${hash}/cover.png`
}
