// dict row (EnViEntry JSON) + learning state → the rich Word model every card renders.
// Pages only consume Word (types/word.ts); this adapter is the single translation point. Defensive throughout:
// bad JSON / placeholder rows (entry = null) degrade to an empty card instead of throwing.
import type { CollinsEntry, Example, Inflection, LearnState, SynonymGroup, Word } from '@/types/word'
import type { WordStateBrief } from './types'
import type { LocalDictRow } from '@/dict'
import type { EnViEntry } from '../../../shared/dictionary'
import { speechUrl } from '../../../shared/speech'
import { nextDayAt } from './time'

const POS_SHORT: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'interj.',
  exclamation: 'excl.',
  abbreviation: 'abbr.',
  article: 'art.',
  determiner: 'det.',
  prefix: 'prefix',
  suffix: 'suffix',
  phrase: 'phr.',
  'auxiliary verb': 'aux.',
}

/** "noun" → "n." (unknown labels pass through). */
export const shortPos = (pos: string): string => POS_SHORT[pos.toLowerCase()] ?? pos

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, '')

/** Parse entry JSON; null for missing / malformed text. */
export function parseEntry(text: string | null): EnViEntry | null {
  if (!text) return null
  try {
    const v = JSON.parse(text) as unknown
    return v && typeof v === 'object' && typeof (v as EnViEntry).word === 'string' ? (v as EnViEntry) : null
  } catch {
    return null
  }
}

function simpleSensesOf(e: EnViEntry): string[] {
  const lines = (e.meanings ?? [])
    .filter((m) => m.terms?.length)
    .map((m) => `${m.pos ? `${shortPos(m.pos)} ` : ''}${m.terms.join(', ')}`)
  if (lines.length === 0 && e.translation) return [e.translation]
  return lines
}

/** One-line gist of an entry (lists, notes, history). */
export function firstMeaning(entryText: string | null): string {
  const e = parseEntry(entryText)
  return e ? (simpleSensesOf(e)[0] ?? '') : ''
}

const STATE_BY_NUM: readonly LearnState[] = ['new', 'learning', 'review', 'relearning', 'mastered']

/** Numeric state 0-4 → LearnState (out of range → 'new'). */
export function toLearnState(state: number): LearnState {
  return STATE_BY_NUM[state] ?? 'new'
}

/** due relative to the end of today's window → 'today' (due or overdue) / 'later'; none → undefined. */
function toDueLabel(due: number | null, now: number): 'today' | 'later' | undefined {
  if (due == null) return undefined
  return due < nextDayAt(now) ? 'today' : 'later'
}

const fmtPhonetic = (p: string | null | undefined): string => (p ? `/${p}/` : '')

function emptyWord(term: string): Word {
  return {
    word: term,
    phoneticUK: '',
    phoneticUS: '',
    simpleSenses: [],
    collinsEntries: [],
    inflections: [],
    examples: [],
    derived: [],
    phraseGroup: [],
    synonymGroups: [],
  }
}

function withState(word: Word, status: WordStateBrief | null, now: number): Word {
  if (status) {
    word.state = toLearnState(status.state)
    word.due = toDueLabel(status.due, now)
  }
  return word
}

/** dict row + learning state → Word. status null = no learning state (lookup of a word not in the list). */
export function dictRowToWord(row: LocalDictRow, status: WordStateBrief | null, now: number): Word {
  const e = parseEntry(row.entry)
  const word = emptyWord(e?.word || row.term)
  word.phoneticUK = fmtPhonetic(row.ukPhonetic)
  word.phoneticUS = fmtPhonetic(row.usPhonetic)
  if (e) {
    word.simpleSenses = simpleSensesOf(e)
    word.collinsEntries = (e.definitions ?? []).map(
      (d): CollinsEntry => ({
        pos: shortPos(d.pos),
        tran: d.en,
        tranVi: d.vi,
        examples: d.example ? [{ en: d.example.en, vi: d.example.vi }] : [],
      }),
    )
    word.examples = (e.examples ?? []).map(
      (x): Example => ({ english: x.en, translation: x.vi, audioUrl: speechUrl(stripTags(x.en), 'us') }),
    )
    // Fields below arrived after the first stored entries: old JSON lacks them (→ empty lists).
    word.inflections = (e.forms ?? []).map((f): Inflection => ({ label: f.label, value: f.value }))
    word.derived = (e.family ?? []).map((f) => `${shortPos(f.pos)} ${f.word}${f.vi ? ` — ${f.vi}` : ''}`)
    const groups = (sets: EnViEntry['synonyms'] | undefined, kind: SynonymGroup['kind']): SynonymGroup[] =>
      (sets ?? [])
        .filter((s) => s.words?.length)
        .map((s): SynonymGroup => ({ pos: shortPos(s.pos), meaning: '', words: s.words, kind }))
    word.synonymGroups = [...groups(e.synonyms, 'synonym'), ...groups(e.antonyms, 'antonym')]
  }
  return withState(word, status, now)
}

/** Placeholder Word for a row that has no content yet (only the spelling + learning state). */
export function placeholderWord(term: string, status: WordStateBrief | null, now: number): Word {
  return withState(emptyWord(term), status, now)
}
