// Bundled word lists (offline). Replaces the old server catalogue: categories → lists → entries.
// Lists ship as plain terms; opening a list maps its terms to local dict ids (placeholder rows are created
// on demand and filled online later), so the pick page works with dict ids like everywhere else.
import data from './wordLists.json'

/** A list category (General / Academic / Work & Business). */
export interface Category {
  id: number
  parentId: number
  title: string
  children?: Category[]
}

/** A bundled word list. */
export interface OfficialBook {
  id: number
  categoryId: number
  title: string
  coverUrl: string | null
  description: string | null
  wordCount: number
}

/** One entry in a list, in list order. */
export interface BookEntry {
  dictId: number
  term: string
  sortOrder: number
}

interface RawBook {
  id: number
  categoryId: number
  title: string
  description: string
  words: string[]
}

const BOOKS = data.books as RawBook[]

/** Attribution required by the CC BY-SA licence of the bundled lists. */
export const WORD_LIST_LICENSE: string = data.license

export function fetchCategories(): Promise<Category[]> {
  return Promise.resolve(data.categories.map((c) => ({ ...c })))
}

/** Lists, optionally filtered by category. */
export function fetchOfficialBooks(categoryId?: number): Promise<OfficialBook[]> {
  return Promise.resolve(
    BOOKS.filter((b) => categoryId == null || b.categoryId === categoryId).map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      title: b.title,
      coverUrl: null,
      description: b.description,
      wordCount: b.words.length,
    })),
  )
}

/** Raw terms of a list (empty for an unknown id). */
export function bookTerms(bookId: number): string[] {
  return BOOKS.find((b) => b.id === bookId)?.words ?? []
}

/** Entries of a list, resolving terms to dict ids through the provided mapper (dict.ensureTerms). */
export async function resolveBookEntries(
  bookId: number,
  ensureTerms: (terms: readonly string[]) => Promise<Map<string, number>>,
): Promise<BookEntry[]> {
  const terms = bookTerms(bookId)
  const ids = await ensureTerms(terms)
  return terms.flatMap((term, i) => {
    const dictId = ids.get(term)
    return dictId == null ? [] : [{ dictId, term, sortOrder: i }]
  })
}
