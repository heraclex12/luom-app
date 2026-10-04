import { describe, expect, it } from 'vitest'
import {
  buildPuzzles,
  currentAnswer,
  initialUnscramble,
  scramble,
  unscrambleDone,
  unscrambleReducer,
  unscrambleXp,
  wordPoints,
  type Puzzle,
  type UnscrambleAction,
  type UnscrambleState,
} from './unscramble'

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

const w = (id: number, term: string) => ({ dictId: id, term, meaning: `m${id}` })

/** A puzzle with tiles in a known order. */
function puzzle(term: string, order: string): Puzzle {
  return { dictId: 1, term, meaning: 'm', tiles: [...order].map((ch, id) => ({ id, ch })) }
}

const run = (ps: Puzzle[], actions: UnscrambleAction[], from: UnscrambleState = initialUnscramble) =>
  actions.reduce(unscrambleReducer(ps), from)

describe('scramble', () => {
  it('is a permutation that does not spell the word', () => {
    for (let seed = 1; seed < 30; seed++) {
      const tiles = scramble('apple', seeded(seed))
      expect(tiles.map((t) => t.ch).sort().join('')).toBe('aelpp')
      expect(tiles.map((t) => t.ch).join('')).not.toBe('apple')
    }
  })
  it('leaves a word of one repeated letter alone', () => {
    expect(scramble('aaa', seeded(1)).map((t) => t.ch).join('')).toBe('aaa')
  })
})

describe('buildPuzzles', () => {
  it('skips multi-word, too short and non-letter terms; null under 4 usable', () => {
    expect(buildPuzzles([w(1, 'ice cream'), w(2, 'go'), w(3, 'well-being'), w(4, 'apple'), w(5, 'river')])).toBeNull()
  })
  it('takes up to 8 lower-cased words', () => {
    const pool = Array.from({ length: 12 }, (_, i) => w(i + 1, `Word${'abcdefghijkl'[i]}`))
    const ps = buildPuzzles(pool, 8, seeded(2))!
    expect(ps).toHaveLength(8)
    for (const p of ps) {
      expect(p.term).toBe(p.term.toLowerCase())
      expect(p.tiles.map((t) => t.ch).sort().join('')).toBe([...p.term].sort().join(''))
    }
  })
})

describe('unscrambleReducer', () => {
  const ps = [puzzle('cat', 'tac'), puzzle('dog', 'gdo')]

  it('typing the word solves it and moves on with points', () => {
    const s = run(ps, ['c', 'a', 't'].map((ch) => ({ type: 'letter', ch }) as const))
    expect(s.index).toBe(1)
    expect(s.outcomes).toEqual(['solved'])
    expect(s.score).toBe(wordPoints('cat', 0))
    expect(s.last).toEqual({ term: 'cat', outcome: 'solved' })
  })
  it('clicking tiles works the same; a used tile cannot be picked twice', () => {
    let s = run(ps, [{ type: 'pick', tileId: 2 }, { type: 'pick', tileId: 2 }])
    expect(s.picked).toEqual([2])
    s = run(ps, [{ type: 'pick', tileId: 1 }, { type: 'pick', tileId: 0 }], s)
    expect(s.index).toBe(1)
  })
  it('ignores letters that are not available', () => {
    const s = run(ps, [{ type: 'letter', ch: 'z' }, { type: 'letter', ch: 'C' }, { type: 'letter', ch: 'c' }])
    expect(s.picked).toEqual([2])
  })
  it('a full wrong answer clears and bumps wrongN', () => {
    const s = run(ps, ['t', 'a', 'c'].map((ch) => ({ type: 'letter', ch }) as const))
    expect(s.index).toBe(0)
    expect(s.picked).toEqual([])
    expect(s.wrongN).toBe(1)
  })
  it('backspace removes the last letter but not hinted ones', () => {
    let s = run(ps, [{ type: 'letter', ch: 'c' }, { type: 'backspace' }])
    expect(s.picked).toEqual([])
    s = run(ps, [{ type: 'hint' }, { type: 'backspace' }])
    expect(currentAnswer(ps[0]!, s.picked)).toBe('c')
    expect(s.locked).toBe(1)
  })
  it('hint keeps the correct prefix, fixes the next letter and costs points', () => {
    let s = run(ps, [{ type: 'letter', ch: 'c' }, { type: 'letter', ch: 't' }, { type: 'hint' }])
    expect(currentAnswer(ps[0]!, s.picked)).toBe('ca')
    expect(s.locked).toBe(2)
    s = run(ps, [{ type: 'letter', ch: 't' }], s)
    expect(s.index).toBe(1)
    expect(s.score).toBe(wordPoints('cat', 1))
    expect(s.hintsTotal).toBe(1)
  })
  it('hinting the last letter solves the word', () => {
    const s = run(ps, [{ type: 'hint' }, { type: 'hint' }, { type: 'hint' }])
    expect(s.outcomes).toEqual(['solved'])
    expect(s.score).toBe(wordPoints('cat', 3))
  })
  it('handles repeated letters', () => {
    const s = run([puzzle('noon', 'onon')], ['n', 'o', 'o', 'n'].map((ch) => ({ type: 'letter', ch }) as const))
    expect(s.outcomes).toEqual(['solved'])
  })
  it('skip moves on with no points; done after the last word', () => {
    const s = run(ps, [{ type: 'skip' }, { type: 'skip' }])
    expect(s.outcomes).toEqual(['skipped', 'skipped'])
    expect(s.score).toBe(0)
    expect(unscrambleDone(s, ps)).toBe(true)
    expect(run(ps, [{ type: 'skip' }], s)).toBe(s)
  })
})

describe('scoring', () => {
  it('word points: base + letters, hints cost, floor', () => {
    expect(wordPoints('cat', 0)).toBe(16)
    expect(wordPoints('cat', 1)).toBe(11)
    expect(wordPoints('cat', 9)).toBe(2)
  })
  it('xp is half the score', () => {
    expect(unscrambleXp({ ...initialUnscramble, score: 45 })).toBe(23)
  })
})
