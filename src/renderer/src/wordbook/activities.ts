// Shared rules of the 3D activities (pure; tested in activities.test.ts): word choice for a round, answer → review,
// Word Bridge spelling, Star Sentences question, Memory Palace placements.
import { clozeFor } from './quiz'

// ── words for a round ──

export interface ActivityItem {
  dictId: number
  term: string
  state: number
  due: number | null
}

/** Due now first (soonest first), then words in learning steps, then the newest of the rest; mastered words skipped. */
export function pickActivityWords<T extends ActivityItem>(items: readonly T[], now: number, max: number): T[] {
  const live = items.filter((w) => w.state !== 4 && w.term)
  const dueNow = live.filter((w) => w.state >= 1 && w.due != null && w.due <= now).sort((a, b) => a.due! - b.due!)
  const learning = live
    .filter((w) => (w.state === 1 || w.state === 3) && !dueNow.includes(w))
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
  const rest = live.filter((w) => !dueNow.includes(w) && !learning.includes(w)).sort((a, b) => b.dictId - a.dictId)
  return [...dueNow, ...learning, ...rest].slice(0, max)
}

// ── answer → review ──

export type ActivityReview = 'good' | 'hard' | 'again'

export const activityRating = (o: { correct: boolean; hinted: boolean }): ActivityReview =>
  !o.correct ? 'again' : o.hinted ? 'hard' : 'good'

// ── Word Bridge: type the word letter by letter ──

export interface Spelling {
  target: string
  /** The letters to type (lower case; spaces, hyphens and apostrophes are laid automatically). */
  letters: string[]
  /** Letters already laid. */
  pos: number
  /** Misses on the current letter. */
  mistakes: number
  /** A letter was revealed for this word. */
  hinted: boolean
  done: boolean
  expected: string | null
}

const LETTER = /^[\p{L}\p{N}]$/u

export function newSpelling(target: string): Spelling {
  const letters = [...target.toLowerCase()].filter((c) => LETTER.test(c))
  return { target, letters, pos: 0, mistakes: 0, hinted: false, done: letters.length === 0, expected: letters[0] ?? null }
}

/** Misses on one letter before it is revealed. */
export const MISSES_BEFORE_HINT = 2

export function applyKey(
  s: Spelling,
  key: string,
): { state: Spelling; event: 'plank' | 'crack' | 'hint' | 'done' | 'ignored' } {
  if (s.done || key.length !== 1 || !LETTER.test(key)) return { state: s, event: 'ignored' }
  const lay = (hinted: boolean): { state: Spelling; event: 'plank' | 'hint' | 'done' } => {
    const pos = s.pos + 1
    const done = pos >= s.letters.length
    const state = { ...s, pos, mistakes: 0, hinted: s.hinted || hinted, done, expected: s.letters[pos] ?? null }
    return { state, event: done ? 'done' : hinted ? 'hint' : 'plank' }
  }
  if (key.toLowerCase() === s.expected) return lay(false)
  if (s.mistakes + 1 >= MISSES_BEFORE_HINT) return lay(true)
  return { state: { ...s, mistakes: s.mistakes + 1 }, event: 'crack' }
}

// ── Star Sentences: the word missing from one of its example sentences ──

export interface StarQuestion {
  before: string
  after: string
  /** The form used in the sentence (decided). */
  answer: string
  /** The word to pick (decide). */
  term: string
  options: string[]
  /** Vietnamese translation of the sentence. */
  vi: string
}

export function starQuestion(
  word: { dictId: number; term: string; examples: readonly { sentence: string; translation: string }[] },
  pool: readonly { dictId: number; term: string }[],
  random: () => number = Math.random,
): StarQuestion | null {
  for (const ex of word.examples) {
    const cloze = clozeFor(ex.sentence, word.term)
    if (!cloze || !cloze.before.trim() && !cloze.after.trim()) continue
    const seen = new Set([word.term.toLowerCase()])
    const others = pool.filter((p) => !seen.has(p.term.toLowerCase()) && seen.add(p.term.toLowerCase()))
    shuffle(others, random)
    const options = [word.term, ...others.slice(0, 3).map((o) => o.term)]
    shuffle(options, random)
    return { before: cloze.before, after: cloze.after, answer: cloze.answer, term: word.term, options, vi: ex.translation }
  }
  return null
}

function shuffle<T>(a: T[], random: () => number): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
}

// ── Memory Palace: which word lives on which object ──

/**
 * Placements (spot → dict id): keep words still in play where they are, free the spots of words that left (mastered
 * or removed), then fill free spots in order with words not placed yet. Stable when nothing changes.
 */
export function assignSpots(
  spots: readonly string[],
  existing: Readonly<Record<string, number>>,
  inPlay: readonly number[],
): Record<string, number> {
  const keep = new Set(inPlay)
  const out: Record<string, number> = {}
  for (const s of spots) if (existing[s] != null && keep.has(existing[s])) out[s] = existing[s]
  const placed = new Set(Object.values(out))
  const waiting = inPlay.filter((id) => !placed.has(id))
  for (const s of spots) if (out[s] == null && waiting.length) out[s] = waiting.shift()!
  return out
}
