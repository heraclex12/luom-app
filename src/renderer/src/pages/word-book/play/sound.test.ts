import { describe, expect, it } from 'vitest'
import {
  buildSoundQuestions,
  initialSound,
  nearestDistractors,
  soundDone,
  soundReducer,
  soundScore,
  soundXp,
  type SoundAction,
  type SoundQuestion,
} from './sound'

function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pool = ['accept', 'except', 'expect', 'access', 'banana', 'river', 'mountain'].map((term, i) => ({
  dictId: i + 1,
  term,
  meaning: `m${i + 1}`,
}))

describe('nearestDistractors', () => {
  it('prefers the closest spellings and never includes the target', () => {
    const d = nearestDistractors('accept', pool, 3, seeded(1))
    expect(d).toHaveLength(3)
    expect(new Set(d)).toEqual(new Set(['except', 'expect', 'access']))
  })
  it('is case-insensitive about the target', () => {
    expect(nearestDistractors('ACCEPT', pool, 3, seeded(2))).not.toContain('accept')
  })
})

describe('buildSoundQuestions', () => {
  it('null under 4 usable words', () => {
    expect(buildSoundQuestions(pool.slice(0, 3))).toBeNull()
  })
  it('10 questions, each with 4 distinct options including the answer', () => {
    const qs = buildSoundQuestions(pool, 10, seeded(3))!
    expect(qs).toHaveLength(10)
    for (const q of qs) {
      expect(new Set(q.options).size).toBe(4)
      expect(q.options[q.answerIndex]).toBe(q.target.term)
    }
  })
  it('cycles a small pool without back-to-back repeats', () => {
    for (let seed = 1; seed < 20; seed++) {
      const qs = buildSoundQuestions(pool.slice(0, 4), 10, seeded(seed))!
      expect(qs).toHaveLength(10)
      for (let i = 1; i < qs.length; i++) expect(qs[i]!.target.dictId).not.toBe(qs[i - 1]!.target.dictId)
    }
  })
})

describe('soundReducer', () => {
  const qs: SoundQuestion[] = [
    { target: pool[0]!, options: ['except', 'accept', 'expect', 'access'], answerIndex: 1 },
    { target: pool[4]!, options: ['banana', 'river', 'access', 'expect'], answerIndex: 0 },
  ]
  const run = (actions: SoundAction[]) => actions.reduce(soundReducer(qs), initialSound)

  it('records the first pick only, then next moves on', () => {
    let s = run([{ type: 'pick', option: 1 }, { type: 'pick', option: 0 }])
    expect(s.picked).toBe(1)
    expect(s.correct).toBe(1)
    expect(s.results).toEqual([true])
    s = soundReducer(qs)(s, { type: 'next' })
    expect(s.index).toBe(1)
    expect(s.picked).toBeNull()
  })
  it('next before answering does nothing; out of range picks are ignored', () => {
    expect(run([{ type: 'next' }])).toBe(initialSound)
    expect(run([{ type: 'pick', option: 4 }])).toBe(initialSound)
  })
  it('finishes after the last question and scores', () => {
    const s = run([
      { type: 'pick', option: 1 },
      { type: 'next' },
      { type: 'pick', option: 2 },
      { type: 'next' },
    ])
    expect(soundDone(s, qs)).toBe(true)
    expect(s.results).toEqual([true, false])
    expect(soundScore(s)).toBe(10)
    expect(soundXp(s, 2)).toBe(3)
    expect(soundXp({ ...s, correct: 2 }, 2)).toBe(16)
  })
})
