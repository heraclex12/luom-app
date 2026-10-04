import { describe, expect, it } from 'vitest'
import { levenshtein, readBest, submitBest, uniquePool, type KeyValue } from './common'

function memStore(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

describe('uniquePool', () => {
  it('drops blanks and repeated terms or meanings, trimming the rest', () => {
    const out = uniquePool([
      { dictId: 1, term: ' Apple ', meaning: 'quả táo' },
      { dictId: 2, term: 'apple', meaning: 'táo' },
      { dictId: 3, term: 'pear', meaning: 'Quả táo ' },
      { dictId: 4, term: '', meaning: 'x' },
      { dictId: 5, term: 'plum', meaning: 'mận' },
    ])
    expect(out).toEqual([
      { dictId: 1, term: 'Apple', meaning: 'quả táo' },
      { dictId: 5, term: 'plum', meaning: 'mận' },
    ])
  })
})

describe('levenshtein', () => {
  it('counts edits', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('same', 'same')).toBe(0)
  })
})

describe('bests', () => {
  it('reads null when nothing stored or storage missing', () => {
    expect(readBest('rain', memStore())).toBeNull()
    expect(readBest('rain', null)).toBeNull()
  })
  it('keeps the higher score and flags a new best', () => {
    const s = memStore()
    expect(submitBest('sound', 40, s)).toEqual({ best: 40, isNew: true })
    expect(submitBest('sound', 30, s)).toEqual({ best: 40, isNew: false })
    expect(submitBest('sound', 50, s)).toEqual({ best: 50, isNew: true })
    expect(readBest('sound', s)).toBe(50)
    expect(readBest('rain', s)).toBeNull()
  })
  it('ignores junk values and survives throwing storage', () => {
    const s = memStore()
    s.data.set('envi.games.best.match', 'abc')
    expect(readBest('match', s)).toBeNull()
    const broken: KeyValue = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readBest('match', broken)).toBeNull()
    expect(submitBest('match', 10, broken)).toEqual({ best: 10, isNew: true })
  })
  it('a first score of zero is not a new best', () => {
    expect(submitBest('lightning', 0, memStore())).toEqual({ best: 0, isNew: false })
  })
})
