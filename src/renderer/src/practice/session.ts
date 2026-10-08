// Write back session rules (pure): what each word counts as when the learner is done, and what is kept.
import {
  ratingFor,
  sessionVerdicts,
  type Feedback,
  type PracticeWord,
  type SituationKind,
} from '../../../shared/practice'
import type { SentenceRow } from './data'

/** good / hard / again = a review; skip = the word does not count this time. */
export type PracticeAction = 'good' | 'hard' | 'again' | 'skip'

export interface TurnRecord {
  reply: string
  feedback: Feedback
}

/** Per word, the review its first real attempt suggests (skip when it was never used). */
export function suggestedActions(words: readonly PracticeWord[], turns: readonly TurnRecord[]): Record<string, PracticeAction> {
  const verdicts = sessionVerdicts(
    words.map((w) => w.term),
    turns.map((t) => t.feedback.words),
  )
  return Object.fromEntries(words.map((w) => [w.term, ratingFor(verdicts[w.term]!) ?? 'skip']))
}

/** The reviews to record (the learner's choices) and every attempt as one of the word's sentences. */
export function planFinish(
  words: readonly PracticeWord[],
  kind: SituationKind,
  turns: readonly TurnRecord[],
  actions: Readonly<Record<string, PracticeAction>>,
  now: number,
): { ratings: { dictId: number; action: 'good' | 'hard' | 'again' }[]; sentences: SentenceRow[] } {
  const ratings = words.flatMap((w) => {
    const action = actions[w.term] ?? 'skip'
    return action === 'skip' ? [] : [{ dictId: w.dictId, action }]
  })
  const byTerm = new Map(words.map((w) => [w.term, w]))
  const sentences = turns.flatMap((t) =>
    t.feedback.words.flatMap((f): SentenceRow[] => {
      const word = byTerm.get(f.term)
      if (!word || f.verdict === 'missing') return []
      const better = t.feedback.better.trim() === t.reply.trim() ? '' : t.feedback.better
      return [{ dictId: word.dictId, text: t.reply, better, verdict: f.verdict, kind, createdAt: now }]
    }),
  )
  return { ratings, sentences }
}
