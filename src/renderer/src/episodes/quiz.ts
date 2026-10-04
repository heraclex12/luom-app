// Quiz after an episode (pure; tested in quiz.test.ts): the AI's story question, then up to three meaning questions
// built from the learner's own dictionary.
import { buildChoices } from '@/wordbook'
import type { Episode } from '../../../shared/episodes'

export interface QuizItem {
  kind: 'story' | 'word'
  /** Question text (story) or the English word (word). */
  prompt: string
  options: string[]
  answer: number
}

const MAX_WORD_QUESTIONS = 3

export function episodeQuiz(
  question: Episode['question'],
  wordIds: readonly number[],
  pool: readonly { dictId: number; term: string; meaning: string }[],
  random: () => number = Math.random,
): QuizItem[] {
  const items: QuizItem[] = []
  if (question) items.push({ kind: 'story', prompt: question.text, options: question.options, answer: question.answer })
  for (const id of wordIds) {
    if (items.filter((i) => i.kind === 'word').length >= MAX_WORD_QUESTIONS) break
    const target = pool.find((p) => p.dictId === id)
    if (!target) continue
    const choices = buildChoices(target, pool, 4, random)
    if (choices.length < 3) continue
    items.push({
      kind: 'word',
      prompt: target.term,
      options: choices.map((c) => c.text),
      answer: choices.findIndex((c) => c.correct),
    })
  }
  return items
}
