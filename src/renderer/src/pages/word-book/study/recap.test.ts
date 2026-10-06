// Finish screen recap, from what the session saw: cards rated, Good vs Hard vs Again, and the words that reached a
// new stage (a new word learned with a final Good, or a word marked as known), in first-seen order.
import { describe, expect, it } from 'vitest'
import { sessionRecap, type SessionEvent } from './recap'

const ev = (dictId: number, rating: SessionEvent['rating'], before: SessionEvent['before'], after: SessionEvent['after']): SessionEvent => ({
  dictId,
  term: `w${dictId}`,
  rating,
  before,
  after,
})

describe('sessionRecap', () => {
  it('empty session', () => {
    expect(sessionRecap([])).toEqual({ reviewed: 0, good: 0, hard: 0, again: 0, known: 0, grew: [] })
  })

  it('counts ratings (Good includes Easy) and marked-as-known separately', () => {
    const r = sessionRecap([
      ev(1, 3, 'thirsty', 'sprout'),
      ev(2, 1, 'thirsty', 'sprout'),
      ev(3, 2, 'thirsty', 'sprout'),
      ev(2, 4, 'sprout', 'sprout'),
      ev(4, 'known', 'sprout', 'bloom'),
    ])
    expect(r).toMatchObject({ reviewed: 4, good: 2, hard: 1, again: 1, known: 1 })
  })

  it('a new word grows when its last rating is Good; a review just watered does not', () => {
    const r = sessionRecap([
      ev(1, 1, 'seed', 'sprout'),
      ev(2, 3, 'seed', 'sprout'),
      ev(3, 3, 'thirsty', 'sprout'),
      ev(1, 3, 'sprout', 'sprout'),
      ev(4, 3, 'seed', 'sprout'),
      ev(4, 1, 'sprout', 'sprout'),
    ])
    expect(r.grew).toEqual([
      { dictId: 1, term: 'w1', stage: 'sprout', mastered: false },
      { dictId: 2, term: 'w2', stage: 'sprout', mastered: false },
    ])
  })

  it('marked as known → bloom, flagged as newly mastered', () => {
    const r = sessionRecap([ev(5, 3, 'thirsty', 'sprout'), ev(5, 'known', 'sprout', 'bloom')])
    expect(r.grew).toEqual([{ dictId: 5, term: 'w5', stage: 'bloom', mastered: true }])
  })
})
