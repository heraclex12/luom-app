// 3D activities (Word Bridge, Star Sentences, Echo Cave, Memory Palace) share these rules: which words a round uses
// (due now first, then words still in learning steps, then the newest), how an answer becomes a review, the
// letter-by-letter spelling of the bridge, the sentence question, and stable Memory Palace placements.
import { describe, expect, it } from 'vitest'
import {
  activityRating,
  applyKey,
  assignSpots,
  newSpelling,
  pickActivityWords,
  starQuestion,
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

describe('starQuestion', () => {
  const pool = [
    { dictId: 1, term: 'meticulous' },
    { dictId: 2, term: 'reluctant' },
    { dictId: 3, term: 'brisk' },
    { dictId: 4, term: 'candid' },
  ]
  it('blanks the word in an example and offers it among other words', () => {
    const q = starQuestion(
      { dictId: 1, term: 'meticulous', examples: [{ sentence: 'She is <b>meticulous</b> about details.', translation: 'Cô ấy tỉ mỉ.' }] },
      pool,
      () => 0.3,
    )
    expect(q).not.toBeNull()
    expect(q!.before).toBe('She is ')
    expect(q!.after).toBe(' about details.')
    expect(q!.answer).toBe('meticulous')
    expect(q!.vi).toBe('Cô ấy tỉ mỉ.')
    expect(q!.options).toContain('meticulous')
    expect(new Set(q!.options).size).toBe(q!.options.length)
  })
  it('is null when no example uses the word', () => {
    expect(starQuestion({ dictId: 1, term: 'meticulous', examples: [{ sentence: 'Nothing here.', translation: '' }] }, pool)).toBeNull()
  })
})

describe('assignSpots', () => {
  const spots = ['lamp', 'table', 'shelf', 'window']
  it('keeps existing placements, fills free spots with new words, frees spots of words no longer in play', () => {
    const out = assignSpots(spots, { lamp: 10, table: 11 }, [11, 12, 13])
    expect(out.table).toBe(11) // kept
    expect(out.lamp).not.toBe(10) // 10 left the palace; its spot is reused
    expect(Object.values(out).sort()).toEqual([11, 12, 13])
    expect(assignSpots(spots, out, [11, 12, 13])).toEqual(out) // stable
  })
  it('never places more words than spots', () => {
    expect(Object.keys(assignSpots(spots, {}, [1, 2, 3, 4, 5, 6]))).toHaveLength(4)
  })
})
