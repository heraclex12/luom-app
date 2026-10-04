// The speaker button on a selection: a word or short phrase is pronounced on its own (what a learner wants when
// they select a word); a longer selection starts read-aloud from there. PDFs have no read-aloud, so they always
// pronounce the selected text.
import { describe, expect, it } from 'vitest'
import { speakTarget } from './speakTarget'

describe('speakTarget', () => {
  it('pronounces words and short phrases', () => {
    expect(speakTarget('meticulous', false)).toEqual({ kind: 'word', text: 'meticulous' })
    expect(speakTarget('  look after, ', false)).toEqual({ kind: 'word', text: 'look after' })
    expect(speakTarget('break the ice', false)).toEqual({ kind: 'word', text: 'break the ice' })
  })
  it('reads aloud from a longer selection', () => {
    expect(speakTarget('He was meticulous about his work.', false)).toEqual({ kind: 'read-aloud' })
  })
  it('always pronounces in fixed-layout books (PDF)', () => {
    expect(speakTarget('He was meticulous about his work.', true)).toEqual({
      kind: 'word',
      text: 'He was meticulous about his work.',
    })
  })
})
