// Shared pure helpers for the word games: pool cleanup, edit distance, per-game best scores.
import type { PoolWord } from './game'

export type { PoolWord } from './game'
export { shuffle, MIN_WORDS } from './game'

export const norm = (s: string): string => s.trim().toLowerCase()

/** Pool words with a term and meaning, one per term and one per meaning (first wins). */
export function uniquePool(pool: readonly PoolWord[]): PoolWord[] {
  const terms = new Set<string>()
  const meanings = new Set<string>()
  const out: PoolWord[] = []
  for (const w of pool) {
    const t = norm(w.term)
    const m = norm(w.meaning)
    if (!t || !m || terms.has(t) || meanings.has(m)) continue
    terms.add(t)
    meanings.add(m)
    out.push({ dictId: w.dictId, term: w.term.trim(), meaning: w.meaning.trim() })
  }
  return out
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]!
}

/** Quick games, plus the activities that keep a best score. */
export type GameId = 'match' | 'unscramble' | 'lightning' | 'rain' | 'sound' | 'tea' | 'firefly' | 'frog'

/** The bit of Storage the bests store needs (so tests can pass a fake). */
export interface KeyValue {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const bestKey = (id: GameId): string => `envi.games.best.${id}`

function defaultStore(): KeyValue | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Best score for a game, or null when never played (or storage is unavailable). */
export function readBest(id: GameId, store: KeyValue | null = defaultStore()): number | null {
  try {
    const raw = store?.getItem(bestKey(id))
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

/** Save `score` if it beats the stored best. Returns the best after saving and whether it is new. */
export function submitBest(
  id: GameId,
  score: number,
  store: KeyValue | null = defaultStore(),
): { best: number; isNew: boolean } {
  const prev = readBest(id, store)
  if (prev !== null && prev >= score) return { best: prev, isNew: false }
  try {
    store?.setItem(bestKey(id), String(score))
  } catch {
    // Storage full or blocked: the best just isn't remembered.
  }
  return { best: score, isNew: prev !== null || score > 0 }
}
