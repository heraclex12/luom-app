// Matching game rules (pure): build a round from the quiz pool and fold clicks into game state.

export interface PoolWord {
  dictId: number
  term: string
  meaning: string
}

export interface Pair {
  id: number
  term: string
  meaning: string
}

export interface Round {
  pairs: Pair[]
  /** Pair ids in English-column order. */
  left: number[]
  /** Pair ids in Vietnamese-column order (shuffled independently). */
  right: number[]
}

/** Fewest words a round needs. */
export const MIN_WORDS = 4
export const ROUND_SIZE = 6

/** Fisher–Yates shuffle into a new array; rng returns [0, 1). */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

const norm = (s: string): string => s.trim().toLowerCase()

/**
 * A round of up to `size` pairs, or null when fewer than MIN_WORDS usable words.
 * Words with a repeated term or meaning are dropped (first one wins) so every pair is unambiguous.
 */
export function buildRound(pool: readonly PoolWord[], size = ROUND_SIZE, rng: () => number = Math.random): Round | null {
  const terms = new Set<string>()
  const meanings = new Set<string>()
  const usable: Pair[] = []
  for (const w of pool) {
    const t = norm(w.term)
    const m = norm(w.meaning)
    if (!t || !m || terms.has(t) || meanings.has(m)) continue
    terms.add(t)
    meanings.add(m)
    usable.push({ id: w.dictId, term: w.term.trim(), meaning: w.meaning.trim() })
  }
  if (usable.length < MIN_WORDS) return null
  const pairs = shuffle(usable, rng).slice(0, size)
  const ids = pairs.map((p) => p.id)
  return { pairs, left: shuffle(ids, rng), right: shuffle(ids, rng) }
}

export type Side = 'left' | 'right'

export interface MatchState {
  matched: number[]
  selLeft: number | null
  selRight: number | null
  combo: number
  maxCombo: number
  mistakes: number
  /** Last wrong attempt (n increments so the same pair can shake again). */
  wrong: { left: number; right: number; n: number } | null
  lastMatch: number | null
}

export const initialMatch: MatchState = {
  matched: [],
  selLeft: null,
  selRight: null,
  combo: 0,
  maxCombo: 0,
  mistakes: 0,
  wrong: null,
  lastMatch: null,
}

export type MatchAction = { type: 'pick'; side: Side; id: number } | { type: 'clearWrong' }

export function matchReducer(s: MatchState, a: MatchAction): MatchState {
  if (a.type === 'clearWrong') return s.wrong ? { ...s, wrong: null } : s
  if (s.matched.includes(a.id)) return s
  const key = a.side === 'left' ? 'selLeft' : 'selRight'
  const next = { ...s, [key]: s[key] === a.id ? null : a.id }
  if (next.selLeft === null || next.selRight === null) return next
  if (next.selLeft === next.selRight) {
    const combo = s.combo + 1
    return {
      ...next,
      matched: [...s.matched, a.id],
      selLeft: null,
      selRight: null,
      combo,
      maxCombo: Math.max(s.maxCombo, combo),
      lastMatch: a.id,
    }
  }
  return {
    ...next,
    selLeft: null,
    selRight: null,
    combo: 0,
    mistakes: s.mistakes + 1,
    wrong: { left: next.selLeft, right: next.selRight, n: (s.wrong?.n ?? 0) + 1 },
  }
}

export const isFinished = (s: MatchState, pairCount: number): boolean => pairCount > 0 && s.matched.length >= pairCount
