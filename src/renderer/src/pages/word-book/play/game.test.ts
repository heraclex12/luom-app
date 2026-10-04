import { describe, expect, it } from 'vitest'
import { buildRound, initialMatch, isFinished, matchReducer, MIN_WORDS, shuffle, type MatchState } from './game'

/** Deterministic RNG (mulberry32). */
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

const word = (id: number, term = `w${id}`, meaning = `m${id}`) => ({ dictId: id, term, meaning })

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(input, seeded(1))
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...out].sort((a, b) => a - b)).toEqual(input)
  })
  it('is deterministic for the same RNG seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(7)))
  })
  it('with rng always 0 rotates by Fisher–Yates (last swaps with first)', () => {
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1])
  })
})

describe('buildRound', () => {
  it('returns null when fewer than MIN_WORDS usable words', () => {
    expect(MIN_WORDS).toBe(4)
    expect(buildRound([word(1), word(2), word(3)], 6, seeded(1))).toBeNull()
  })
  it('takes up to `size` pairs with independently shuffled columns', () => {
    const pool = Array.from({ length: 10 }, (_, i) => word(i + 1))
    const r = buildRound(pool, 6, seeded(3))!
    expect(r.pairs).toHaveLength(6)
    expect([...r.left].sort()).toEqual(r.pairs.map((p) => p.id).sort())
    expect([...r.right].sort()).toEqual(r.pairs.map((p) => p.id).sort())
  })
  it('uses all words when the pool is smaller than size but ≥ MIN_WORDS', () => {
    const r = buildRound([word(1), word(2), word(3), word(4)], 6, seeded(2))!
    expect(r.pairs).toHaveLength(4)
  })
  it('drops duplicate terms and duplicate meanings (ambiguous pairs), ignoring case/space', () => {
    const pool = [word(1, 'run', 'chạy'), word(2, 'Run ', 'điều hành'), word(3, 'jog', ' Chạy'), word(4), word(5), word(6)]
    const r = buildRound(pool, 6, () => 0.5)!
    const terms = r.pairs.map((p) => p.term.trim().toLowerCase())
    const meanings = r.pairs.map((p) => p.meaning.trim().toLowerCase())
    expect(new Set(terms).size).toBe(terms.length)
    expect(new Set(meanings).size).toBe(meanings.length)
    expect(r.pairs).toHaveLength(4)
  })
  it('skips words with empty term or meaning', () => {
    expect(buildRound([word(1), word(2), word(3), word(4, 'x', '  ')], 6, seeded(1))).toBeNull()
  })
})

describe('matchReducer', () => {
  const pick = (s: MatchState, side: 'left' | 'right', id: number) => matchReducer(s, { type: 'pick', side, id })

  it('selecting one side only stores the selection', () => {
    const s = pick(initialMatch, 'left', 1)
    expect(s.selLeft).toBe(1)
    expect(s.selRight).toBeNull()
    expect(s.matched).toEqual([])
  })
  it('picking the same item again deselects it; another item replaces it', () => {
    let s = pick(initialMatch, 'left', 1)
    s = pick(s, 'left', 1)
    expect(s.selLeft).toBeNull()
    s = pick(pick(s, 'right', 2), 'right', 3)
    expect(s.selRight).toBe(3)
  })
  it('a correct pair is matched, bumps combo and clears selection', () => {
    let s = pick(pick(initialMatch, 'left', 1), 'right', 1)
    expect(s.matched).toEqual([1])
    expect(s.combo).toBe(1)
    expect(s.lastMatch).toBe(1)
    expect(s.selLeft).toBeNull()
    s = pick(pick(s, 'right', 2), 'left', 2)
    expect(s.combo).toBe(2)
    expect(s.maxCombo).toBe(2)
  })
  it('a wrong pair counts a mistake, breaks the combo and flags both items', () => {
    let s = pick(pick(initialMatch, 'left', 1), 'right', 1)
    s = pick(pick(s, 'left', 2), 'right', 3)
    expect(s.mistakes).toBe(1)
    expect(s.combo).toBe(0)
    expect(s.maxCombo).toBe(1)
    expect(s.wrong).toEqual({ left: 2, right: 3, n: 1 })
    expect(s.selLeft).toBeNull()
    expect(s.selRight).toBeNull()
    s = matchReducer(s, { type: 'clearWrong' })
    expect(s.wrong).toBeNull()
  })
  it('ignores picks on already matched items', () => {
    const s = pick(pick(initialMatch, 'left', 1), 'right', 1)
    expect(pick(s, 'left', 1)).toBe(s)
  })
  it('isFinished when every pair is matched', () => {
    let s = initialMatch
    for (const id of [1, 2]) s = pick(pick(s, 'left', id), 'right', id)
    expect(isFinished(s, 2)).toBe(true)
    expect(isFinished(s, 3)).toBe(false)
  })
})
