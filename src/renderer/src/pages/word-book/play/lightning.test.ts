import { describe, expect, it } from 'vitest'
import {
  answer,
  dealCard,
  LIGHTNING_MS,
  lightningDeck,
  lightningXp,
  multiplierFor,
  startLightning,
  tick,
  type Card,
} from './lightning'

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

const deck = Array.from({ length: 6 }, (_, i) => ({ dictId: i + 1, term: `w${i + 1}`, meaning: `m${i + 1}` }))
const card = (truth: boolean): Card => ({ term: 'w1', meaning: truth ? 'm1' : 'm2', truth, dictId: 1 })

describe('lightningDeck', () => {
  it('needs 4 unique words', () => {
    expect(lightningDeck(deck.slice(0, 3))).toBeNull()
    expect(lightningDeck(deck)).toHaveLength(6)
  })
})

describe('dealCard', () => {
  it('true cards carry the word meaning, false cards another word meaning', () => {
    const rng = seeded(5)
    let trues = 0
    for (let i = 0; i < 400; i++) {
      const c = dealCard(deck, rng)
      const own = deck.find((w) => w.dictId === c.dictId)!
      expect(c.term).toBe(own.term)
      if (c.truth) {
        trues++
        expect(c.meaning).toBe(own.meaning)
      } else expect(c.meaning).not.toBe(own.meaning)
    }
    expect(trues).toBeGreaterThan(160)
    expect(trues).toBeLessThan(240)
  })
  it('does not repeat the previous word', () => {
    const rng = seeded(9)
    for (let i = 0; i < 50; i++) expect(dealCard(deck, rng, 3).dictId).not.toBe(3)
  })
})

describe('multiplier', () => {
  it('steps up every 5 in a row, capped at 4', () => {
    expect([0, 4, 5, 9, 10, 15, 40].map(multiplierFor)).toEqual([1, 1, 2, 2, 3, 4, 4])
  })
})

describe('answer', () => {
  it('scores right answers with the streak multiplier and resets on a miss', () => {
    let s = startLightning(card(true))
    for (let i = 0; i < 5; i++) s = answer(s, true, card(true))
    expect(s.streak).toBe(5)
    expect(s.score).toBe(10 * 4 + 20)
    s = answer(s, true, card(false))
    expect(s.score).toBe(80)
    s = answer(s, true, card(false)) // card was false, said true
    expect(s.streak).toBe(0)
    expect(s.bestStreak).toBe(6)
    expect(s.correct).toBe(6)
    expect(s.total).toBe(7)
    expect(s.feedback).toEqual({ correct: false, n: 7 })
    s = answer(s, false, card(true)) // said false on a false card
    expect(s.correct).toBe(7)
    expect(s.streak).toBe(1)
  })
})

describe('tick', () => {
  it('counts down and ends at zero; answers after the end are ignored', () => {
    let s = tick(startLightning(card(true)), 1_000)
    expect(s.timeLeftMs).toBe(LIGHTNING_MS - 1_000)
    s = tick(s, LIGHTNING_MS)
    expect(s.timeLeftMs).toBe(0)
    expect(s.done).toBe(true)
    expect(answer(s, true, card(true))).toBe(s)
    expect(tick(s, 10)).toBe(s)
  })
  it('ignores negative dt', () => {
    expect(tick(startLightning(card(true)), -50).timeLeftMs).toBe(LIGHTNING_MS)
  })
})

describe('lightningXp', () => {
  it('is score / 10, capped at 80', () => {
    expect(lightningXp({ ...startLightning(card(true)), score: 254 })).toBe(25)
    expect(lightningXp({ ...startLightning(card(true)), score: 5000 })).toBe(80)
  })
})
