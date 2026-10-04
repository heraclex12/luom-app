// After an episode: one story question (from the AI) then up to three "what does this word mean?" questions about
// the words the episode used, with meanings from the learner's own dictionary (never from the AI).
import { describe, expect, it } from 'vitest'
import { episodeQuiz } from './quiz'

const pool = [
  { dictId: 1, term: 'meticulous', meaning: 'tỉ mỉ' },
  { dictId: 2, term: 'reluctant', meaning: 'miễn cưỡng' },
  { dictId: 3, term: 'brisk', meaning: 'nhanh nhẹn' },
  { dictId: 4, term: 'candid', meaning: 'thẳng thắn' },
  { dictId: 5, term: 'eager', meaning: 'háo hức' },
]
const seq = () => 0.42

describe('episodeQuiz', () => {
  it('starts with the story question, then word questions with the right meaning among the options', () => {
    const q = episodeQuiz({ text: 'Who wrote the letter?', options: ['Lan', 'Minh', 'Hoa'], answer: 1 }, [1, 2], pool, seq)
    expect(q[0]).toEqual({ kind: 'story', prompt: 'Who wrote the letter?', options: ['Lan', 'Minh', 'Hoa'], answer: 1 })
    expect(q.slice(1).map((x) => x.prompt)).toEqual(['meticulous', 'reluctant'])
    for (const w of q.slice(1)) {
      expect(w.kind).toBe('word')
      expect(w.options.length).toBeGreaterThanOrEqual(3)
      expect(w.options[w.answer]).toBe(pool.find((p) => p.term === w.prompt)!.meaning)
    }
  })
  it('caps word questions at three and skips words without a meaning', () => {
    expect(episodeQuiz(null, [1, 2, 3, 4, 99], pool, seq)).toHaveLength(3)
  })
})
