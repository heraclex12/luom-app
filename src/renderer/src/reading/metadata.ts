// EPUB metadata normalization: dc:title / dc:creator can be a string, a language map, or an array;
// flatten to single-line text before writing user_book. Pure functions, no engine, easy to unit test.
//
// Normalization logic copied from readest `apps/readest-app/src/utils/book.ts` (AGPL-3.0).

/** Language map: one title in several languages (`{ en: 'Title', vi: 'Tiêu đề' }`). */
export interface LanguageMap {
  [key: string]: string
}

/** Contributor (author / translator…): the name itself may be a language map. */
export interface Contributor {
  name: LanguageMap
}

/** Preferred language when a language map has several entries. */
const UI_LANG = 'en'

/** Language map → single-line text: prefer UI_LANG, otherwise the first entry in the book. */
function formatLanguageMap(x: string | LanguageMap | null | undefined): string {
  if (!x) return ''
  if (typeof x === 'string') return x
  const first = Object.keys(x)[0]
  if (!first) return ''
  return x[UI_LANG] || x[first] || ''
}

/** The book's primary language code (`zh-CN` → `zh`): decides how multiple authors are joined. */
function bookLangCode(lang: string | string[] | null | undefined): string {
  const primary = typeof lang === 'string' ? lang : lang?.[0]
  return primary ? primary.split('-')[0] : ''
}

// Joining multiple authors: Chinese books use the narrow form (`A B`, space-separated), since the long form
// inserts a conjunction that reads awkwardly between names; other languages use the long form ("A, B, and C").
function listFormatter(langCode: string): Intl.ListFormat {
  if (langCode === 'zh') return new Intl.ListFormat('en', { style: 'narrow', type: 'unit' })
  try {
    return new Intl.ListFormat(langCode || UI_LANG, { style: 'long', type: 'conjunction' })
  } catch {
    // Fall back on bad language codes: `dc:language` is raw book data (often `en_US`, `zh_CN` or even non-ASCII),
    // and an invalid tag makes Intl throw RangeError — not worth failing the whole import over a conjunction.
    return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })
  }
}

export function formatTitle(title: string | LanguageMap | null | undefined): string {
  return typeof title === 'string' ? title : formatLanguageMap(title)
}

export function formatAuthors(
  contributors: string | string[] | Contributor | Contributor[] | null | undefined,
  bookLang?: string | string[] | null,
): string {
  const langCode = bookLangCode(bookLang) || 'en'
  if (Array.isArray(contributors)) {
    return listFormatter(langCode).format(
      contributors.map((c) => (typeof c === 'string' ? c : formatLanguageMap(c?.name))),
    )
  }
  return typeof contributors === 'string' ? contributors : formatLanguageMap(contributors?.name)
}
