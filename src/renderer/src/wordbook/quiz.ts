// Pure helpers for auto-graded exercises: grading typed / chosen answers into FSRS ratings, building
// multiple-choice options and cloze (fill-the-blank) sentences.

/** FSRS rating: 1 Again, 2 Hard, 3 Good. */
export type QuizRating = 1 | 2 | 3

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

const normalize = (s: string): string =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/** Typed answer → result + rating. Long words tolerate small typos (Hard); anything else wrong is Again. */
export function gradeTyped(answer: string, target: string): { result: 'correct' | 'typo' | 'wrong'; rating: QuizRating } {
  const a = normalize(answer)
  const t = normalize(target)
  if (!a) return { result: 'wrong', rating: 1 }
  if (a === t) return { result: 'correct', rating: 3 }
  const allowed = t.length >= 8 ? 2 : t.length >= 5 ? 1 : 0
  return levenshtein(a, t) <= allowed ? { result: 'typo', rating: 2 } : { result: 'wrong', rating: 1 }
}

/** Slow but right answers count as Hard. */
export const SLOW_ANSWER_MS = 10_000

export function gradeChoice(correct: boolean, elapsedMs: number): QuizRating {
  if (!correct) return 1
  return elapsedMs > SLOW_ANSWER_MS ? 2 : 3
}

export interface Choice {
  text: string
  correct: boolean
}

/** Answer + up to (n-1) unique distractor meanings, shuffled. */
export function buildChoices(
  target: { dictId: number; meaning: string },
  pool: readonly { dictId: number; meaning: string }[],
  n = 4,
  random: () => number = Math.random,
): Choice[] {
  const seen = new Set([target.meaning])
  const candidates = pool.filter((p) => {
    if (p.dictId === target.dictId || !p.meaning || seen.has(p.meaning)) return false
    seen.add(p.meaning)
    return true
  })
  // Fisher–Yates with the injected RNG (deterministic in tests).
  const shuffle = <T>(xs: T[]): T[] => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[xs[i], xs[j]] = [xs[j]!, xs[i]!]
    }
    return xs
  }
  const distractors = shuffle([...candidates]).slice(0, n - 1)
  return shuffle([
    { text: target.meaning, correct: true },
    ...distractors.map((d) => ({ text: d.meaning, correct: false })),
  ])
}

export interface Cloze {
  before: string
  after: string
  /** The exact form used in the sentence (may be inflected: decided). */
  answer: string
}

/** Blank the headword in an example sentence: the <b>…</b> part, else a word starting with the headword's stem. */
export function clozeFor(sentence: string, headword: string): Cloze | null {
  const bold = /<b>(.*?)<\/b>/i.exec(sentence)
  if (bold) {
    const plain = (s: string): string => s.replace(/<[^>]+>/g, '')
    return {
      before: plain(sentence.slice(0, bold.index)),
      after: plain(sentence.slice(bold.index + bold[0].length)),
      answer: plain(bold[1]!),
    }
  }
  const stem = headword.toLowerCase().replace(/e$/, '')
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`\\b${escaped}\\w*`, 'i').exec(sentence)
  if (!m) return null
  return { before: sentence.slice(0, m.index), after: sentence.slice(m.index + m[0].length), answer: m[0] }
}
