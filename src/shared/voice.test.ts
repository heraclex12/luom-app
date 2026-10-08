// Say it / shadowing: what the Mac heard is compared with what the learner meant to say. A word passes when it was
// heard (inflections allowed); a sentence shows which words came through; mishearings become practice pairs.
import { describe, expect, it } from 'vitest'
import { alignSentence, checkWord, misheardPairs, type Recognition } from './voice'

const rec = (text: string, confidence = 0.9): Recognition => ({
  text,
  words: text.split(/\s+/).filter(Boolean).map((t) => ({ text: t, confidence })),
  alternatives: [],
})

describe('checkWord', () => {
  it('passes when the word (or a form of it) was heard', () => {
    expect(checkWord('resilient', rec('Resilient'))).toEqual({ ok: true, heard: 'Resilient', confidence: 0.9 })
    expect(checkWord('decide', rec('decided', 0.7))).toEqual({ ok: true, heard: 'decided', confidence: 0.7 })
    expect(checkWord('break the ice', rec('break the ice')).ok).toBe(true)
  })
  it('fails with what was heard instead, or nothing', () => {
    expect(checkWord('resilient', rec('resident', 0.98))).toEqual({ ok: false, heard: 'resident', confidence: 0.98 })
    expect(checkWord('resilient', rec(''))).toEqual({ ok: false, heard: '', confidence: null })
  })
  it('in a longer answer, the confidence is the target word’s own', () => {
    const r: Recognition = {
      text: 'I said resilient',
      words: [
        { text: 'I', confidence: 0.99 },
        { text: 'said', confidence: 0.95 },
        { text: 'resilient', confidence: 0.4 },
      ],
      alternatives: [],
    }
    expect(checkWord('resilient', r)).toEqual({ ok: true, heard: 'I said resilient', confidence: 0.4 })
  })
})

describe('alignSentence', () => {
  it('marks each word of the sentence as heard or missed, in order', () => {
    const a = alignSentence('She stayed resilient after the setback.', 'she stayed resident after the setback')
    expect(a.tokens.filter((t) => t.hit !== null).map((t) => [t.text, t.hit])).toEqual([
      ['She', true],
      ['stayed', true],
      ['resilient', false],
      ['after', true],
      ['the', true],
      ['setback', true],
    ])
    expect(a.score).toBeCloseTo(5 / 6)
    // Spaces and punctuation are kept for display and never count.
    expect(a.tokens.map((t) => t.text).join('')).toBe('She stayed resilient after the setback.')
  })
  it('handles curly apostrophes and an empty answer', () => {
    expect(alignSentence('It’s fine.', "it's fine").score).toBe(1)
    expect(alignSentence('Hello there.', '').score).toBe(0)
  })
})

describe('misheardPairs', () => {
  it('words the Mac heard as another word, most often first, short mishearings only', () => {
    const pairs = misheardPairs([
      { dictId: 1, target: 'resilient', heard: 'resident', ok: false },
      { dictId: 1, target: 'resilient', heard: 'Resident', ok: false },
      { dictId: 2, target: 'sheep', heard: 'ship', ok: false },
      { dictId: 2, target: 'sheep', heard: 'sheep', ok: true },
      { dictId: 3, target: 'thought', heard: '', ok: false },
      { dictId: 4, target: 'law', heard: 'I like the low price today', ok: false },
    ])
    expect(pairs).toEqual([
      { dictId: 1, target: 'resilient', heard: 'resident', count: 2 },
      { dictId: 2, target: 'sheep', heard: 'ship', count: 1 },
    ])
  })
})
