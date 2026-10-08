// Write back: the situation fits how well the words are known (guided for new words, open for known ones), the
// AI's feedback is checked against what the learner actually wrote, and only real attempts count as reviews.
import { describe, expect, it } from 'vitest'
import {
  CONVERSATION_KINDS,
  localSituation,
  MAX_TURNS,
  normalizeFeedback,
  normalizeSituation,
  pickKind,
  ratingFor,
  sessionVerdicts,
  type PracticeWord,
  type Situation,
} from './practice'

const word = (term: string, state: number, example?: { en: string; vi: string }): PracticeWord => ({
  dictId: term.length,
  term,
  meaning: 'nghĩa',
  state,
  example,
})

/** A random() that returns the given values in turn. */
const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]!
}

describe('pickKind', () => {
  it('new or shaky words get guided kinds; known words get open ones', () => {
    const learning = [word('resilient', 1)]
    const known = [word('resilient', 2)]
    const guided = new Set(['finish', 'translate', 'chat'])
    const open = new Set(['chat', 'email', 'fix', 'scene', 'translate'])
    for (let r = 0; r < 1; r += 0.05) {
      expect(guided.has(pickKind(learning, () => r))).toBe(true)
      expect(open.has(pickKind(known, () => r))).toBe(true)
    }
    // A round with one shaky word stays guided.
    expect(guided.has(pickKind([word('a', 2), word('b', 3)], () => 0.99))).toBe(true)
  })
  it('varies with chance: both one-round and conversation kinds come up', () => {
    const kinds = new Set(Array.from({ length: 20 }, (_, i) => pickKind([word('resilient', 2)], () => i / 20)))
    expect([...kinds].some((k) => CONVERSATION_KINDS.has(k))).toBe(true)
    expect([...kinds].some((k) => !CONVERSATION_KINDS.has(k))).toBe(true)
  })
})

describe('localSituation', () => {
  it('a single word with a Vietnamese example can be translated without the AI', () => {
    const w = word('resilient', 1, { en: 'Children are often very resilient.', vi: 'Trẻ em thường rất kiên cường.' })
    expect(localSituation('translate', [w])).toEqual({
      kind: 'translate',
      title: 'Say it in English',
      speaker: '',
      setup: '',
      prompt: 'Trẻ em thường rất kiên cường.',
      task: 'Write this in English using “resilient”.',
      words: ['resilient'],
    })
  })
  it('anything else needs the AI', () => {
    expect(localSituation('translate', [word('resilient', 1)])).toBeNull()
    expect(localSituation('translate', [word('a', 1, { en: 'x', vi: 'y' }), word('b', 1, { en: 'x', vi: 'y' })])).toBeNull()
    expect(localSituation('chat', [word('a', 1, { en: 'x', vi: 'y' })])).toBeNull()
  })
})

describe('normalizeSituation', () => {
  it('cleans the text and always asks for the round’s words', () => {
    const s = normalizeSituation(
      { title: ' A text from Linh ', speaker: 'Linh', setup: '<b>Late</b> evening.', prompt: 'The client moved the deadline again!', task: '' },
      'chat',
      ['resilient', 'setback'],
    )
    expect(s).toEqual({
      kind: 'chat',
      title: 'A text from Linh',
      speaker: 'Linh',
      setup: 'Late evening.',
      prompt: 'The client moved the deadline again!',
      task: 'Reply using “resilient” and “setback”.',
      words: ['resilient', 'setback'],
    })
  })
  it('keeps the message’s line breaks, including ones the AI wrote as a literal \\n', () => {
    const s = normalizeSituation(
      { title: 'x', speaker: 'Minh', setup: '', prompt: 'Hi team,\\nI’ve attached the draft.\n\n\nThanks!  Minh', task: 't' },
      'email',
      ['a'],
    )
    expect(s.prompt).toBe('Hi team,\nI’ve attached the draft.\n\nThanks! Minh')
  })
  it('throws when there is nothing to answer', () => {
    expect(() => normalizeSituation({ title: 'x', speaker: '', setup: '', prompt: '  ', task: 't' }, 'chat', ['a'])).toThrow()
  })
})

describe('normalizeFeedback', () => {
  const situation: Situation = {
    kind: 'chat',
    title: 'A text from Linh',
    speaker: 'Linh',
    setup: '',
    prompt: 'Deadline moved again!',
    task: 'Reply',
    words: ['resilient', 'setback'],
  }
  const raw = {
    words: [
      { term: 'Resilient', verdict: 'natural', note: 'Nice.' },
      { term: 'setback', verdict: 'natural', note: 'Good.' },
      { term: 'invented', verdict: 'off', note: '?' },
    ],
    summary: 'Great reply!',
    better: 'We have been resilient so far.',
    tip: '',
    followUp: 'Haha true. What do we tell the boss?',
  }

  it('a word the reply does not contain is missing, whatever the AI said; unknown words are dropped', () => {
    const f = normalizeFeedback(raw, situation, 'We stayed resilient, as always.', 0)
    expect(f.words).toEqual([
      { term: 'resilient', verdict: 'natural', note: 'Nice.' },
      { term: 'setback', verdict: 'missing', note: 'You didn’t use “setback” this time.' },
    ])
  })
  it('inflected forms count as using the word', () => {
    const f = normalizeFeedback(raw, situation, 'Two setbacks, but we stayed resilient.', 0)
    expect(f.words.map((w) => w.verdict)).toEqual(['natural', 'natural'])
  })
  it('a word the AI skipped gets a neutral note', () => {
    const f = normalizeFeedback({ ...raw, words: [] }, situation, 'resilient setback', 0)
    expect(f.words.map((w) => w.verdict)).toEqual(['understandable', 'understandable'])
  })
  it('conversations continue up to the turn limit; one-round kinds never do', () => {
    expect(normalizeFeedback(raw, situation, 'resilient', 0).followUp).toBe('Haha true. What do we tell the boss?')
    expect(normalizeFeedback(raw, situation, 'resilient', MAX_TURNS - 1).followUp).toBeNull()
    expect(normalizeFeedback({ ...raw, followUp: ' ' }, situation, 'resilient', 0).followUp).toBeNull()
    expect(normalizeFeedback(raw, { ...situation, kind: 'finish' }, 'resilient', 0).followUp).toBeNull()
  })
  it('an unknown verdict reads as understandable', () => {
    const f = normalizeFeedback({ ...raw, words: [{ term: 'resilient', verdict: 'great', note: '' }] }, situation, 'resilient', 0)
    expect(f.words[0]!.verdict).toBe('understandable')
  })
})

describe('ratings', () => {
  it('maps verdicts to reviews; a word not used does not count', () => {
    expect(ratingFor('natural')).toBe('good')
    expect(ratingFor('understandable')).toBe('hard')
    expect(ratingFor('off')).toBe('again')
    expect(ratingFor('missing')).toBeNull()
  })
  it('across turns, the first real attempt at a word is the one that counts', () => {
    const v = sessionVerdicts(
      ['resilient', 'setback', 'cope'],
      [
        [
          { term: 'resilient', verdict: 'off', note: '' },
          { term: 'setback', verdict: 'missing', note: '' },
          { term: 'cope', verdict: 'missing', note: '' },
        ],
        [
          { term: 'resilient', verdict: 'natural', note: '' },
          { term: 'setback', verdict: 'understandable', note: '' },
          { term: 'cope', verdict: 'missing', note: '' },
        ],
      ],
    )
    expect(v).toEqual({ resilient: 'off', setback: 'understandable', cope: 'missing' })
  })
})
