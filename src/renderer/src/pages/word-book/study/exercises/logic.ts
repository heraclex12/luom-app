// Pure helpers for the Study exercises (fallbacks, cloze pick, typo diff, combo, option keys).
import { clozeFor, type Cloze, type ExerciseKind } from '@/wordbook'
import type { Example } from '@/types/word'

export interface ExerciseContext {
  /** Distractor meanings available for multiple choice. */
  distractors: number
  /** Some example sentence can be blanked out. */
  hasCloze: boolean
  /** The word has a Vietnamese meaning (prompt for choice / type). */
  hasMeaning: boolean
  /** The word has playable audio (listen). */
  hasAudio: boolean
}

/**
 * The exercise actually shown, falling back when the chosen one can't be built:
 * choice needs a meaning and ≥2 distractors (else flip); listen needs audio (else type);
 * cloze needs a sentence (else type); type needs a meaning (else flip).
 */
export function resolveExercise(kind: ExerciseKind, ctx: ExerciseContext): ExerciseKind {
  if (kind === 'choice') return ctx.hasMeaning && ctx.distractors >= 2 ? 'choice' : 'flip'
  if (kind === 'listen' && !ctx.hasAudio) kind = 'type'
  if (kind === 'cloze' && !ctx.hasCloze) kind = 'type'
  if (kind === 'type' && !ctx.hasMeaning) return 'flip'
  return kind
}

/** "n. sự kiên cường" → { pos: 'n.', text: 'sự kiên cường' }. */
export function splitPos(line: string): { pos: string; text: string } {
  const m = /^([a-z]+\.)\s+(.*)$/i.exec(line)
  return m ? { pos: m[1]!, text: m[2]! } : { pos: '', text: line }
}

export interface PickedCloze extends Cloze {
  /** Vietnamese translation of the sentence (hint under it). */
  translation: string
}

/** First example whose headword can be blanked out. */
export function pickCloze(examples: readonly Pick<Example, 'english' | 'translation'>[], headword: string): PickedCloze | null {
  for (const ex of examples) {
    const c = clozeFor(ex.english, headword)
    if (c && c.answer.trim()) return { ...c, translation: ex.translation }
  }
  return null
}

/**
 * The target spelling with each letter flagged ok (present in the answer, in order) or not
 * (missing / wrong) — LCS alignment, case-insensitive. Shown after a typo or wrong answer.
 */
export function spellingDiff(answer: string, target: string): { char: string; ok: boolean }[] {
  const a = answer.toLowerCase()
  const t = target.toLowerCase()
  // dp[i][j] = LCS length of a[i:] and t[j:]
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(t.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = t.length - 1; j >= 0; j--)
      dp[i]![j] = a[i] === t[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
  const out: { char: string; ok: boolean }[] = []
  let i = 0
  let j = 0
  while (j < t.length) {
    if (i < a.length && a[i] === t[j]) {
      out.push({ char: target[j]!, ok: true })
      i++
      j++
    } else if (i < a.length && dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++ // extra / wrong letter in the answer
    } else {
      out.push({ char: target[j]!, ok: false })
      j++
    }
  }
  return out
}

/** Consecutive correct answers (Play mode). */
export const nextCombo = (combo: number, correct: boolean): number => (correct ? combo + 1 : 0)

/** Keys "1".."n" → option index. */
export function choiceIndexForKey(key: string, count: number): number | null {
  if (!/^[1-9]$/.test(key)) return null
  const n = Number(key)
  return n <= count ? n - 1 : null
}
