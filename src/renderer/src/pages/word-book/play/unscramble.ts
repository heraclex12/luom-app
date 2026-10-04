// Unscramble (spelling) rules, pure: build a round of single words with shuffled letter tiles and fold
// tile picks / typed letters / hints / skips into state. Multi-word terms are left out of the round.
import { MIN_WORDS, shuffle, uniquePool, type PoolWord } from './common'

export const UNSCRAMBLE_SIZE = 8
export const MIN_LETTERS = 3
export const MAX_LETTERS = 12
/** Points for a solved word: base + per letter, minus a cost per hint (never below the floor). */
export const POINTS_BASE = 10
export const POINTS_PER_LETTER = 2
export const HINT_COST = 5
export const POINTS_FLOOR = 2

export interface Tile {
  id: number
  ch: string
}

export interface Puzzle {
  dictId: number
  /** The answer, lower-case letters only. */
  term: string
  meaning: string
  tiles: Tile[]
}

const isPlayable = (term: string): boolean =>
  /^[a-z]+$/i.test(term) && term.length >= MIN_LETTERS && term.length <= MAX_LETTERS

/** Shuffle letters, retrying so the tiles never already spell the word (when that is possible). */
export function scramble(term: string, rng: () => number = Math.random): Tile[] {
  const letters = [...term]
  const tiles = letters.map((ch, id) => ({ id, ch }))
  const allSame = letters.every((c) => c === letters[0])
  let out = shuffle(tiles, rng)
  for (let i = 0; i < 10 && !allSame && out.map((t) => t.ch).join('') === term; i++) out = shuffle(tiles, rng)
  if (!allSame && out.map((t) => t.ch).join('') === term) out = [...out.slice(1), out[0]!]
  return out
}

/** Up to `size` puzzles from single-word terms, or null when fewer than MIN_WORDS qualify. */
export function buildPuzzles(
  pool: readonly PoolWord[],
  size = UNSCRAMBLE_SIZE,
  rng: () => number = Math.random,
): Puzzle[] | null {
  const usable = uniquePool(pool).filter((w) => isPlayable(w.term))
  if (usable.length < MIN_WORDS) return null
  return shuffle(usable, rng)
    .slice(0, size)
    .map((w) => {
      const term = w.term.toLowerCase()
      return { dictId: w.dictId, term, meaning: w.meaning, tiles: scramble(term, rng) }
    })
}

export type Outcome = 'solved' | 'skipped'

export interface UnscrambleState {
  index: number
  /** Tile ids placed in the answer slots, in order. */
  picked: number[]
  /** Leading picks fixed by hints (Backspace stops here). */
  locked: number
  hintsThisWord: number
  hintsTotal: number
  score: number
  outcomes: Outcome[]
  /** Increments on a full but wrong answer (drives the shake). */
  wrongN: number
  /** The word just finished, for the "Correct" / "It was" line. */
  last: { term: string; outcome: Outcome } | null
}

export const initialUnscramble: UnscrambleState = {
  index: 0,
  picked: [],
  locked: 0,
  hintsThisWord: 0,
  hintsTotal: 0,
  score: 0,
  outcomes: [],
  wrongN: 0,
  last: null,
}

export type UnscrambleAction =
  | { type: 'pick'; tileId: number }
  | { type: 'letter'; ch: string }
  | { type: 'backspace' }
  | { type: 'hint' }
  | { type: 'skip' }

export const wordPoints = (term: string, hints: number): number =>
  Math.max(POINTS_FLOOR, POINTS_BASE + POINTS_PER_LETTER * term.length - HINT_COST * hints)

export const currentAnswer = (p: Puzzle, picked: readonly number[]): string =>
  picked.map((id) => p.tiles.find((t) => t.id === id)!.ch).join('')

function advance(s: UnscrambleState, p: Puzzle, outcome: Outcome): UnscrambleState {
  return {
    ...s,
    index: s.index + 1,
    picked: [],
    locked: 0,
    hintsThisWord: 0,
    score: outcome === 'solved' ? s.score + wordPoints(p.term, s.hintsThisWord) : s.score,
    outcomes: [...s.outcomes, outcome],
    last: { term: p.term, outcome },
  }
}

/** After a placement: a full slot row either solves the word or bounces back to the locked prefix. */
function settle(s: UnscrambleState, p: Puzzle): UnscrambleState {
  if (s.picked.length < p.term.length) return s
  if (currentAnswer(p, s.picked) === p.term) return advance(s, p, 'solved')
  return { ...s, picked: s.picked.slice(0, s.locked), wrongN: s.wrongN + 1 }
}

export function unscrambleReducer(puzzles: readonly Puzzle[]) {
  return (s: UnscrambleState, a: UnscrambleAction): UnscrambleState => {
    const p = puzzles[s.index]
    if (!p) return s
    switch (a.type) {
      case 'pick': {
        if (s.picked.includes(a.tileId) || !p.tiles.some((t) => t.id === a.tileId)) return s
        return settle({ ...s, picked: [...s.picked, a.tileId] }, p)
      }
      case 'letter': {
        const ch = a.ch.toLowerCase()
        const tile = p.tiles.find((t) => t.ch === ch && !s.picked.includes(t.id))
        return tile ? settle({ ...s, picked: [...s.picked, tile.id] }, p) : s
      }
      case 'backspace':
        return s.picked.length > s.locked ? { ...s, picked: s.picked.slice(0, -1) } : s
      case 'hint': {
        // Keep the correct prefix of what is placed, then place the next correct letter and lock it all.
        let keep = 0
        while (keep < s.picked.length && currentAnswer(p, s.picked.slice(0, keep + 1)) === p.term.slice(0, keep + 1))
          keep++
        const prefix = s.picked.slice(0, keep)
        if (prefix.length >= p.term.length) return s
        const need = p.term[prefix.length]!
        const tile = p.tiles.find((t) => t.ch === need && !prefix.includes(t.id))!
        const next = {
          ...s,
          picked: [...prefix, tile.id],
          locked: prefix.length + 1,
          hintsThisWord: s.hintsThisWord + 1,
          hintsTotal: s.hintsTotal + 1,
        }
        return settle(next, p)
      }
      case 'skip':
        return advance(s, p, 'skipped')
    }
  }
}

export const unscrambleDone = (s: UnscrambleState, puzzles: readonly Puzzle[]): boolean =>
  puzzles.length > 0 && s.index >= puzzles.length

/** XP for a finished round: half the points, rounded. */
export const unscrambleXp = (s: UnscrambleState): number => Math.round(s.score / 2)
