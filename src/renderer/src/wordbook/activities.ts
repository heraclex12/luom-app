// Shared rules of the 3D activities (pure; tested in activities.test.ts): word choice for a round, answer → review,
// Word Bridge / Bubble Tea spelling, tea patience and tips, look-alike spellings (Firefly Night), the aquarium
// (Word Fishing) and Frog Hop combos.
import { levenshtein } from './quiz'

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

// ── Bubble Tea Shop: the customer's patience and tip ──

/** Patience: a base time plus time per letter; each miss costs a slice. */
export const TEA_BASE_MS = 9_000
export const TEA_PER_LETTER_MS = 1_800
export const TEA_MISS_COST = 0.18

/** Patience left (0..1) after `elapsedMs` with `misses` wrong letters so far. */
export function patienceLeft(elapsedMs: number, letters: number, misses: number): number {
  const budget = TEA_BASE_MS + TEA_PER_LETTER_MS * Math.max(1, letters)
  return Math.min(1, Math.max(0, 1 - Math.max(0, elapsedMs) / budget - misses * TEA_MISS_COST))
}

export interface TeaOutcome {
  patience: number
  hinted: boolean
  gaveUp: boolean
}

/** Coins: nothing when given up; otherwise more for a patient customer, less with a revealed letter. */
export function teaTip(o: TeaOutcome): number {
  if (o.gaveUp) return 0
  const p = Math.min(1, Math.max(0, o.patience))
  return o.hinted ? 1 + Math.round(p * 3) : 2 + Math.round(p * 8)
}

/** Review: given up = Again; a revealed letter or a customer who ran out of patience (slow) = Hard; else Good. */
export const teaRating = (o: TeaOutcome): ActivityReview =>
  o.gaveUp ? 'again' : o.hinted || o.patience <= 0 ? 'hard' : 'good'

// ── Firefly Night: the spelling heard among look-alikes ──

/**
 * The target term plus the `n - 1` pool terms closest to it in spelling (edit distance; ties in random order),
 * shuffled. `answer` is the target's index.
 */
export function lookalikeOptions(
  target: { dictId: number; term: string },
  pool: readonly { dictId: number; term: string }[],
  n = 4,
  random: () => number = Math.random,
): { options: string[]; answer: number } {
  const t = target.term.trim().toLowerCase()
  const seen = new Set([t])
  const others: string[] = []
  for (const p of shuffled(pool, random)) {
    const k = p.term.trim().toLowerCase()
    if (!k || p.dictId === target.dictId || seen.has(k)) continue
    seen.add(k)
    others.push(p.term.trim())
  }
  const near = others
    .map((term, i) => ({ term, i, d: levenshtein(term.toLowerCase(), t) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, n - 1)
    .map((o) => o.term)
  const options = shuffled([target.term.trim(), ...near], random)
  return { options, answer: options.indexOf(target.term.trim()) }
}

// ── Word Fishing: the aquarium ──

/** Most fish kept in the aquarium (the oldest catches swim off). */
export const AQUARIUM_MAX = 40

/** Add a catch: one fish per word (a re-catch moves it to the newest), at most `max`. */
export function addCatch(list: readonly number[], dictId: number, max = AQUARIUM_MAX): number[] {
  return [...list.filter((id) => id !== dictId), dictId].slice(-max)
}

export interface FishLook {
  /** Body size (1 = a word in review). */
  size: number
  /** Index into the scene's palette. */
  color: number
  /** Tail / fin style 0..2. */
  kind: number
  /** Mastered words are golden. */
  golden: boolean
}

/** A fish grows with its word: fry while new, small while learning, full size in review, golden once mastered. */
export function fishLook(dictId: number, state: number, palette = 6): FishLook {
  const v = variantOf(dictId)
  const size = state === 0 ? 0.55 : state === 2 ? 1 : state === 4 ? 1.15 : 0.75
  return { size, color: Math.floor(v[0] * palette) % palette, kind: Math.floor(v[1] * 3) % 3, golden: state === 4 }
}

// ── Frog Hop: quick answers chain into a combo ──

/** An answer within this time is a "leap" (keeps the combo going). */
export const FROG_FAST_MS = 4_000

/** Combo after an answer: right and fast adds one, right but slow keeps it, wrong resets it. */
export function frogCombo(prev: number, o: { correct: boolean; elapsedMs: number }): number {
  if (!o.correct) return 0
  return o.elapsedMs <= FROG_FAST_MS ? prev + 1 : prev
}

// ── helpers ──

function shuffled<T>(xs: readonly T[], random: () => number): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Two stable numbers in [0, 1) for a word (its fish looks the same every visit). */
function variantOf(dictId: number): [number, number] {
  let h = (dictId ^ 0x5bd1e995) >>> 0
  const next = (): number => {
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
    h = (h ^ (h >>> 16)) >>> 0
    return h / 2 ** 32
  }
  return [next(), next()]
}
