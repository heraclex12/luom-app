// Ending a Write back session: each word counts once (its first real attempt, or the learner's own choice), words
// never used do not count, and every attempt is kept as one of the word's sentences.
import { describe, expect, it } from 'vitest'
import type { Feedback, PracticeWord } from '../../../shared/practice'
import { planFinish, suggestedActions } from './session'

const w = (dictId: number, term: string): PracticeWord => ({ dictId, term, meaning: 'm', state: 2 })
const fb = (words: Feedback['words'], better = ''): Feedback => ({ words, summary: '', better, tip: '', followUp: null })

const words = [w(1, 'resilient'), w(2, 'setback'), w(3, 'cope')]
const turns = [
  {
    reply: 'We was resilient after the setback.',
    feedback: fb(
      [
        { term: 'resilient', verdict: 'understandable', note: '' },
        { term: 'setback', verdict: 'natural', note: '' },
        { term: 'cope', verdict: 'missing', note: '' },
      ],
      'We were resilient after the setback.',
    ),
  },
  {
    reply: 'We will cope with it.',
    feedback: fb([
      { term: 'resilient', verdict: 'missing', note: '' },
      { term: 'setback', verdict: 'missing', note: '' },
      { term: 'cope', verdict: 'off', note: '' },
    ], 'We will cope with it.'),
  },
]

describe('suggestedActions', () => {
  it('suggests a review per word from its first real attempt; unused words are not counted', () => {
    expect(suggestedActions(words, turns)).toEqual({ resilient: 'hard', setback: 'good', cope: 'again' })
    expect(suggestedActions(words, turns.slice(0, 1))).toEqual({ resilient: 'hard', setback: 'good', cope: 'skip' })
  })
})

describe('planFinish', () => {
  it('rates with the learner’s choices and keeps every attempt as a sentence', () => {
    const plan = planFinish(words, 'chat', turns, { resilient: 'good', setback: 'good', cope: 'skip' }, 500)
    expect(plan.ratings).toEqual([
      { dictId: 1, action: 'good' },
      { dictId: 2, action: 'good' },
    ])
    expect(plan.sentences).toEqual([
      { dictId: 1, text: 'We was resilient after the setback.', better: 'We were resilient after the setback.', verdict: 'understandable', kind: 'chat', createdAt: 500 },
      { dictId: 2, text: 'We was resilient after the setback.', better: 'We were resilient after the setback.', verdict: 'natural', kind: 'chat', createdAt: 500 },
      // The "better" version equal to the reply is not repeated.
      { dictId: 3, text: 'We will cope with it.', better: '', verdict: 'off', kind: 'chat', createdAt: 500 },
    ])
  })
})
