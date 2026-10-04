/**
 * Term extraction rules for select-to-look-up — pure string functions with no DOM, so they can be unit-tested in node.
 *
 * Rule: **the extracted term only serves lookup**. It is emitted separately as `EngineSelection.lookupTerm` and never
 * written back to the selection's `text` / `cfi` — highlights cover exactly what the user dragged.
 *
 * **Look up exactly what the user selected**: only normalize (strip whitespace and punctuation), never guess.
 * Half a word selected means half a word looked up; a miss shows "no entry" and falls back to Translate.
 * Silently "completing" the word would look up something the user didn't select, which is worse than a miss.
 *
 * Invisible / confusable characters in regexes must be written as `\u` escapes, never as raw literals.
 */

/** Soft hyphen (U+00AD, invisible) inserted by EPUB line-break hyphenation: unless stripped, a split `soap` never matches. */
const SOFT_HYPHEN = /­/g

/** Body text uses curly apostrophes (U+2019 / U+02BC) but the dictionary uses ASCII: `don’t` must be normalized to match. */
const CURLY_APOSTROPHE = /[’ʼ]/g

/** Max words for phrase lookup: covers things like `get away with it`, excludes whole sentences. */
export const LOOKUP_MAX_WORDS = 5

/** Max lookup term length. */
export const LOOKUP_MAX_LENGTH = 120

/** Strip non-alphanumerics from both ends of a word (so in-word `'` and `-` are kept). */
function stripEdgePunctuation(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}]+$/u, '')
}

/**
 * Clean into a lookup term: strip soft hyphens → normalize curly apostrophes → strip edge punctuation **per word** → collapse whitespace.
 * Per word rather than whole string, otherwise the comma in `soap, and water` would remain in the term.
 *
 * Case is preserved: `term` matches by exact code points and `Polish`/`polish` are different entries; fuzzy
 * case / inflection resolution is the dictionary layer's job.
 */
export function cleanLookupTerm(raw: string): string {
  return raw
    .replace(SOFT_HYPHEN, '')
    .replace(CURLY_APOSTROPHE, "'")
    .split(/\s+/)
    .map(stripEdgePunctuation)
    .filter(Boolean)
    .join(' ')
}

/** Word count of a (cleaned) lookup term; 0 for the empty string. */
export function countLookupWords(term: string): number {
  return term ? term.split(' ').length : 0
}

/**
 * Lookup eligibility after extraction:
 * - `none`: empty after cleaning (all punctuation / symbols) → toolbar hides "Look up"
 * - `ok`: 1–5 words and not too long → look up normally
 * - `too-long`: too many words or too long → no request; the popup shows the fallback state (primary action: Translate)
 */
export type LookupTermVerdict = 'none' | 'ok' | 'too-long'

export function judgeLookupTerm(term: string): LookupTermVerdict {
  const words = countLookupWords(term)
  if (words === 0) return 'none'
  if (words > LOOKUP_MAX_WORDS || term.length > LOOKUP_MAX_LENGTH) return 'too-long'
  return 'ok'
}
