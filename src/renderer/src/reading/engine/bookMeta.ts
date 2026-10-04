// Metadata / cover extraction before opening a book — the second entry point into vendor foliate `makeBook` (the first is foliateEngine).
// Reader-independent: no `<foliate-view>`, no rendering; parses the book, reads a few fields, then destroys it. Used by import.
import { formatAuthors, formatTitle, type Contributor, type LanguageMap } from '../metadata'

export interface BookMeta {
  /** Title (empty string if missing; caller falls back to the file name). */
  title: string
  /** Author (multiple authors joined per the book's language; empty string if missing). */
  author: string
  /** Original cover image in the book's format (png / jpeg / svg); null if none. */
  cover: Blob | null
}

/** The slice of foliate `makeBook` output used here (the engine is untyped; same rule as engine/foliate.d.ts). */
interface ParsedBook {
  metadata?: {
    // foliate returns null (not undefined) for missing fields; the normalizers accept both.
    title?: string | LanguageMap | null
    author?: string | string[] | Contributor | Contributor[] | null
    language?: string | string[] | null
  }
  getCover?: () => Promise<Blob | null>
  destroy?: () => void
}

export async function readBookMeta(file: File): Promise<BookMeta> {
  // @ts-expect-error untyped vendor ESM module
  const { makeBook } = await import('@/vendor/foliate-js/view.js')
  const book = (await makeBook(file)) as ParsedBook
  try {
    const meta = book.metadata ?? {}
    return {
      title: formatTitle(meta.title).trim(),
      author: formatAuthors(meta.author, meta.language).trim(),
      // Must read before destroy: the cover is loaded lazily from the zip loader.
      cover: (await book.getCover?.()) ?? null,
    }
  } finally {
    book.destroy?.()
  }
}
