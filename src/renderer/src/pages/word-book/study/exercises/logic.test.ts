// Study exercise helpers: fallbacks when an exercise can't be built, the first usable cloze, the
// typo diff shown on the correct spelling, the Play-mode combo, and the 1–4 option keys.
import { describe, expect, it } from 'vitest'
import { choiceIndexForKey, leafBurst, nextCombo, pickCloze, resolveExercise, spellingDiff, splitPos } from './logic'

describe('resolveExercise', () => {
  const ok = { distractors: 3, hasCloze: true, hasMeaning: true, hasAudio: true }
  it('choice needs at least 2 distractors, else flip', () => {
    expect(resolveExercise('choice', ok)).toBe('choice')
    expect(resolveExercise('choice', { ...ok, distractors: 2 })).toBe('choice')
    expect(resolveExercise('choice', { ...ok, distractors: 1 })).toBe('flip')
  })
  it('cloze without a usable sentence falls back to type', () => {
    expect(resolveExercise('cloze', ok)).toBe('cloze')
    expect(resolveExercise('cloze', { ...ok, hasCloze: false })).toBe('type')
  })
  it('listen without audio falls back to type', () => {
    expect(resolveExercise('listen', ok)).toBe('listen')
    expect(resolveExercise('listen', { ...ok, hasAudio: false })).toBe('type')
  })
  it('no Vietnamese meaning → choice / type become flip (nothing to prompt with)', () => {
    const none = { ...ok, hasMeaning: false }
    expect(resolveExercise('choice', none)).toBe('flip')
    expect(resolveExercise('type', none)).toBe('flip')
    expect(resolveExercise('listen', { ...none, hasAudio: false })).toBe('flip')
    expect(resolveExercise('listen', none)).toBe('listen')
    expect(resolveExercise('cloze', none)).toBe('cloze')
  })
  it('flip passes through', () => {
    expect(resolveExercise('flip', ok)).toBe('flip')
  })
})

describe('splitPos', () => {
  it('splits a leading part-of-speech tag off a meaning line', () => {
    expect(splitPos('n. sự kiên cường, khả năng phục hồi')).toEqual({ pos: 'n.', text: 'sự kiên cường, khả năng phục hồi' })
    expect(splitPos('adj. kiên cường')).toEqual({ pos: 'adj.', text: 'kiên cường' })
  })
  it('no tag → whole line', () => {
    expect(splitPos('xin chào')).toEqual({ pos: '', text: 'xin chào' })
  })
})

describe('pickCloze', () => {
  it('takes the first example that can be blanked, with its translation', () => {
    const r = pickCloze(
      [
        { english: 'Nothing to see here.', translation: 'x' },
        { english: 'She <b>decided</b> to stay.', translation: 'Cô ấy quyết định ở lại.' },
      ],
      'decide',
    )
    expect(r).toEqual({ before: 'She ', after: ' to stay.', answer: 'decided', translation: 'Cô ấy quyết định ở lại.' })
  })
  it('null when no example works or none exist', () => {
    expect(pickCloze([{ english: 'Unrelated.', translation: '' }], 'decide')).toBeNull()
    expect(pickCloze([], 'decide')).toBeNull()
  })
  it('skips an empty blank', () => {
    expect(pickCloze([{ english: 'A <b></b> b.', translation: '' }], 'x')).toBeNull()
  })
})

describe('spellingDiff', () => {
  const marks = (a: string, t: string): string =>
    spellingDiff(a, t)
      .map((s) => (s.ok ? s.char : `[${s.char}]`))
      .join('')
  it('marks target letters missing or wrong in the answer', () => {
    expect(marks('resilant', 'resilient')).toBe('resil[i][e]nt')
    expect(marks('acomodation', 'accommodation')).toBe('ac[c]om[m]odation')
  })
  it('case-insensitive; exact answer → all ok', () => {
    expect(marks('Resilient', 'resilient')).toBe('resilient')
  })
  it('empty answer → everything marked', () => {
    expect(marks('', 'cat')).toBe('[c][a][t]')
  })
})

describe('nextCombo', () => {
  it('counts consecutive correct answers, resets on a miss', () => {
    expect(nextCombo(0, true)).toBe(1)
    expect(nextCombo(4, true)).toBe(5)
    expect(nextCombo(4, false)).toBe(0)
  })
})

describe('choiceIndexForKey', () => {
  it('maps 1..n to 0..n-1, anything else null', () => {
    expect(choiceIndexForKey('1', 4)).toBe(0)
    expect(choiceIndexForKey('4', 4)).toBe(3)
    expect(choiceIndexForKey('4', 3)).toBeNull()
    expect(choiceIndexForKey('0', 4)).toBeNull()
    expect(choiceIndexForKey('a', 4)).toBeNull()
  })
})

describe('leafBurst', () => {
  it('fans leaves upward and outward, the same for the same seed', () => {
    const leaves = leafBurst(14, 7)
    expect(leaves).toHaveLength(14)
    expect(leafBurst(14, 7)).toEqual(leaves)
    expect(leafBurst(14, 8)).not.toEqual(leaves)
    for (const l of leaves) {
      expect(Math.hypot(l.dx, l.dy)).toBeGreaterThan(40)
      expect(Math.hypot(l.dx, l.dy)).toBeLessThan(170)
      expect(l.dy).toBeLessThan(64) // up and out, at most 25° below the horizon (screen y grows downward)
      expect(l.size).toBeGreaterThanOrEqual(8)
      expect(l.size).toBeLessThanOrEqual(16)
      expect(l.delay).toBeGreaterThanOrEqual(0)
      expect(l.delay).toBeLessThan(120)
    }
    expect(new Set(leaves.map((l) => l.color)).size).toBeGreaterThan(1)
  })
})
