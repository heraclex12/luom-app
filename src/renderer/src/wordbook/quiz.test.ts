// Auto-graded exercises: typed answers forgive case / spacing / one small typo (Hard) but not a different word
// (Again); multiple-choice options are unique and contain the answer exactly once; cloze blanks the headword.
import { describe, expect, it } from 'vitest'
import { buildChoices, clozeFor, gradeChoice, gradeTyped, levenshtein } from './quiz'

describe('gradeTyped', () => {
  it('exact (ignoring case, spaces, curly quotes) → correct / Good', () => {
    expect(gradeTyped('  Resilient ', 'resilient')).toEqual({ result: 'correct', rating: 3 })
    expect(gradeTyped('break   the ice', 'break the ice').result).toBe('correct')
    expect(gradeTyped('don’t', "don't").result).toBe('correct')
  })
  it('one typo (two from 8 letters) → typo / Hard', () => {
    expect(gradeTyped('resilant', 'resilient')).toEqual({ result: 'typo', rating: 2 })
    expect(gradeTyped('acommodation', 'accommodation').result).toBe('typo')
    expect(gradeTyped('acomodation', 'accommodation').result).toBe('typo')
  })
  it('short words allow no typo; empty or different → wrong / Again', () => {
    expect(gradeTyped('cat', 'car')).toEqual({ result: 'wrong', rating: 1 })
    expect(gradeTyped('', 'resilient').result).toBe('wrong')
    expect(gradeTyped('robust', 'resilient').result).toBe('wrong')
  })
  it('levenshtein basics', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('', 'abc')).toBe(3)
  })
})

describe('gradeChoice', () => {
  it('right & quick → Good, right but slow → Hard, wrong → Again', () => {
    expect(gradeChoice(true, 3000)).toBe(3)
    expect(gradeChoice(true, 15000)).toBe(2)
    expect(gradeChoice(false, 1000)).toBe(1)
  })
})

describe('buildChoices', () => {
  const pool = [
    { dictId: 2, meaning: 'con mèo' },
    { dictId: 3, meaning: 'con chó' },
    { dictId: 4, meaning: 'con mèo' }, // duplicate meaning
    { dictId: 5, meaning: 'quả táo' },
    { dictId: 6, meaning: '' },
  ]
  it('returns the answer plus unique, non-empty distractors', () => {
    const choices = buildChoices({ dictId: 1, meaning: 'con voi' }, pool, 4, () => 0.3)
    expect(choices).toHaveLength(4)
    expect(choices.filter((c) => c.correct)).toEqual([{ text: 'con voi', correct: true }])
    expect(new Set(choices.map((c) => c.text)).size).toBe(4)
    expect(choices.some((c) => c.text === '')).toBe(false)
  })
  it('never uses a distractor equal to the answer, and works with a tiny pool', () => {
    const choices = buildChoices({ dictId: 1, meaning: 'con mèo' }, pool, 4, () => 0.9)
    expect(choices.filter((c) => c.text === 'con mèo')).toHaveLength(1)
    expect(buildChoices({ dictId: 1, meaning: 'x' }, [], 4).length).toBe(1)
  })
})

describe('clozeFor', () => {
  it('blanks the bolded headword', () => {
    expect(clozeFor('vines grew in <b>abundance</b> here', 'abundance')).toEqual({
      before: 'vines grew in ',
      after: ' here',
      answer: 'abundance',
    })
  })
  it('finds inflected forms without bold and returns null when absent', () => {
    expect(clozeFor('She decided to stay.', 'decide')).toEqual({ before: 'She ', after: ' to stay.', answer: 'decided' })
    expect(clozeFor('Nothing here', 'decide')).toBeNull()
  })
})
