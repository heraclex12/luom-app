// Sound Check (listening) rules, pure: each question plays a word and offers 4 spellings, the
// distractors being the pool words closest to it by edit distance (look-alike / sound-alike).
import { levenshtein, MIN_WORDS, norm, shuffle, uniquePool, type PoolWord } from './common'

export const SOUND_ROUNDS = 10
export const OPTIONS = 4
export const POINTS_PER_CORRECT = 10

export interface SoundQuestion {
  target: PoolWord
  options: string[]
  answerIndex: number
}

/** The `n` pool terms nearest to `target` by edit distance (ties broken by the rng shuffle). */
export function nearestDistractors(
  target: string,
  pool: readonly PoolWord[],
  n = OPTIONS - 1,
  rng: () => number = Math.random,
): string[] {
  const t = norm(target)
  const seen = new Set([t])
  const cands: string[] = []
  for (const w of shuffle(pool, rng)) {
    const k = norm(w.term)
    if (seen.has(k)) continue
    seen.add(k)
    cands.push(w.term)
  }
  return cands
    .map((term, i) => ({ term, i, d: levenshtein(norm(term), t) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, n)
    .map((c) => c.term)
}

/**
 * `rounds` questions (words cycle when the pool is smaller, never twice in a row), or null when
 * fewer than MIN_WORDS usable words.
 */
export function buildSoundQuestions(
  pool: readonly PoolWord[],
  rounds = SOUND_ROUNDS,
  rng: () => number = Math.random,
): SoundQuestion[] | null {
  const usable = uniquePool(pool)
  if (usable.length < MIN_WORDS) return null
  const targets: PoolWord[] = []
  while (targets.length < rounds) {
    let batch = shuffle(usable, rng)
    const prev = targets[targets.length - 1]
    if (prev && batch[0]!.dictId === prev.dictId) batch = [...batch.slice(1), batch[0]!]
    targets.push(...batch.slice(0, rounds - targets.length))
  }
  return targets.map((target) => {
    const options = shuffle([target.term, ...nearestDistractors(target.term, usable, OPTIONS - 1, rng)], rng)
    return { target, options, answerIndex: options.indexOf(target.term) }
  })
}

export interface SoundState {
  index: number
  /** Option picked for the current question (null = not answered yet). */
  picked: number | null
  correct: number
  results: boolean[]
}

export const initialSound: SoundState = { index: 0, picked: null, correct: 0, results: [] }

export type SoundAction = { type: 'pick'; option: number } | { type: 'next' }

export function soundReducer(questions: readonly SoundQuestion[]) {
  return (s: SoundState, a: SoundAction): SoundState => {
    const q = questions[s.index]
    if (!q) return s
    if (a.type === 'pick') {
      if (s.picked !== null || a.option < 0 || a.option >= q.options.length) return s
      const ok = a.option === q.answerIndex
      return { ...s, picked: a.option, correct: s.correct + (ok ? 1 : 0), results: [...s.results, ok] }
    }
    if (s.picked === null) return s
    return { ...s, index: s.index + 1, picked: null }
  }
}

export const soundDone = (s: SoundState, questions: readonly SoundQuestion[]): boolean =>
  questions.length > 0 && s.index >= questions.length

export const soundScore = (s: SoundState): number => s.correct * POINTS_PER_CORRECT

/** XP: 3 per right answer, +10 for a perfect round. */
export const soundXp = (s: SoundState, questions: number): number =>
  s.correct * 3 + (questions > 0 && s.correct === questions ? 10 : 0)
