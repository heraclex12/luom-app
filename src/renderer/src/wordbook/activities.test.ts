// 3D activities share these rules: which words a round uses (due now first, then words still in learning steps,
// then the newest), how an answer becomes a review, letter-by-letter spelling, tea patience / tips, look-alike
// spellings, the aquarium and Frog Hop combos.
import { describe, expect, it } from 'vitest'
import {
  activityRating,
  applyKey,
  addCatch,
  AQUARIUM_MAX,
  fishLook,
  frogCombo,
  lookalikeOptions,
  newSpelling,
  patienceLeft,
  pickActivityWords,
  TEA_MISS_COST,
  teaRating,
  teaTip,
} from './activities'

const now = Date.UTC(2026, 9, 6, 9)
const w = (dictId: number, state: number, due: number | null, term = `w${dictId}`) => ({ dictId, term, state, due })

describe('pickActivityWords', () => {
  it('takes due-now words first, then learning, then the newest others, up to max', () => {
    const items = [w(1, 0, null), w(2, 2, now + 86_400_000), w(3, 2, now - 1000), w(4, 1, now + 600_000), w(5, 4, null), w(6, 0, null)]
    expect(pickActivityWords(items, now, 4).map((x) => x.dictId)).toEqual([3, 4, 6, 2])
  })
})

describe('activityRating', () => {
  it('maps the outcome to a review', () => {
    expect(activityRating({ correct: true, hinted: false })).toBe('good')
    expect(activityRating({ correct: true, hinted: true })).toBe('hard')
    expect(activityRating({ correct: false, hinted: false })).toBe('again')
  })
})

describe('Word Bridge spelling', () => {
  it('lays a plank per right letter, skipping spaces and hyphens, ignoring case', () => {
    let s = newSpelling('Look-up it')
    expect(s.expected).toBe('l')
    for (const k of ['L', 'o', 'o', 'k', 'u', 'p', 'i']) s = applyKey(s, k).state
    expect(s.pos).toBe(s.letters.length - 1)
    const last = applyKey(s, 't')
    expect(last.event).toBe('done')
    expect(last.state.done).toBe(true)
  })
  it('cracks on a wrong letter and reveals the next letter after two misses (hinted)', () => {
    let r = applyKey(newSpelling('cat'), 'x')
    expect(r.event).toBe('crack')
    r = applyKey(r.state, 'z')
    expect(r.event).toBe('hint')
    expect(r.state.hinted).toBe(true)
    expect(r.state.pos).toBe(1) // the hint lays the plank
    expect(applyKey(r.state, 'a').event).toBe('plank')
  })
  it('ignores non-letter keys', () => {
    expect(applyKey(newSpelling('cat'), 'Shift').event).toBe('ignored')
  })
})

describe('Bubble Tea patience and tips', () => {
  it('starts full, drains with time and misses, never below 0', () => {
    expect(patienceLeft(0, 5, 0)).toBe(1)
    expect(patienceLeft(4000, 5, 0)).toBeLessThan(1)
    expect(patienceLeft(0, 5, 1)).toBeCloseTo(1 - TEA_MISS_COST)
    expect(patienceLeft(10 ** 7, 5, 9)).toBe(0)
  })
  it('longer words get more time', () => {
    expect(patienceLeft(8000, 10, 0)).toBeGreaterThan(patienceLeft(8000, 3, 0))
  })
  it('tips more for a patient customer, less with help, nothing when given up', () => {
    expect(teaTip({ patience: 1, hinted: false, gaveUp: false })).toBe(10)
    expect(teaTip({ patience: 0, hinted: false, gaveUp: false })).toBe(2)
    expect(teaTip({ patience: 1, hinted: true, gaveUp: false })).toBe(4)
    expect(teaTip({ patience: 1, hinted: false, gaveUp: true })).toBe(0)
  })
  it('rates: given up = again, help or out of patience = hard, else good', () => {
    expect(teaRating({ patience: 0.5, hinted: false, gaveUp: true })).toBe('again')
    expect(teaRating({ patience: 0.5, hinted: true, gaveUp: false })).toBe('hard')
    expect(teaRating({ patience: 0, hinted: false, gaveUp: false })).toBe('hard')
    expect(teaRating({ patience: 0.2, hinted: false, gaveUp: false })).toBe('good')
  })
})

describe('lookalikeOptions', () => {
  const pool = [
    { dictId: 1, term: 'affect' },
    { dictId: 2, term: 'effect' },
    { dictId: 3, term: 'elephant' },
    { dictId: 4, term: 'infect' },
    { dictId: 5, term: 'affection' },
    { dictId: 6, term: 'Effect' }, // same term, different case: once
    { dictId: 7, term: 'zebra' },
  ]
  it('offers the closest spellings, each once, with the answer index', () => {
    const q = lookalikeOptions({ dictId: 1, term: 'affect' }, pool, 4, () => 0.42)
    expect(q.options).toHaveLength(4)
    expect(q.options[q.answer]).toBe('affect')
    expect(q.options.map((o) => o.toLowerCase()).sort()).toEqual(['affect', 'affection', 'effect', 'infect'])
  })
  it('works with a small pool', () => {
    const q = lookalikeOptions({ dictId: 1, term: 'affect' }, pool.slice(0, 2))
    expect(q.options.sort()).toEqual(['affect', 'effect'])
  })
})

describe('aquarium', () => {
  it('keeps one fish per word, newest last, at most the cap', () => {
    expect(addCatch([1, 2, 3], 2)).toEqual([1, 3, 2])
    expect(addCatch([1, 2], 3, 2)).toEqual([2, 3])
    expect(addCatch(Array.from({ length: AQUARIUM_MAX }, (_, i) => i), 999)).toHaveLength(AQUARIUM_MAX)
  })
  it('a fish grows with its word and is stable', () => {
    expect(fishLook(5, 0).size).toBeLessThan(fishLook(5, 1).size)
    expect(fishLook(5, 1).size).toBeLessThan(fishLook(5, 2).size)
    expect(fishLook(5, 4).golden).toBe(true)
    expect(fishLook(5, 2).golden).toBe(false)
    expect(fishLook(42, 2)).toEqual(fishLook(42, 2))
  })
})

describe('frogCombo', () => {
  it('fast right answers chain, slow ones keep, a miss resets', () => {
    expect(frogCombo(2, { correct: true, elapsedMs: 1500 })).toBe(3)
    expect(frogCombo(2, { correct: true, elapsedMs: 9000 })).toBe(2)
    expect(frogCombo(2, { correct: false, elapsedMs: 900 })).toBe(0)
  })
})
