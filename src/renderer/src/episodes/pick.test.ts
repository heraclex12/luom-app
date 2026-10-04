// Words for today's episode: due reviews first (meeting a word in a story is a good review), then words learned
// today, then the newest saved words; skip words used in the last two episodes so the story does not repeat itself.
import { describe, expect, it } from 'vitest'
import { pickEpisodeWords } from './pick'

const w = (dictId: number, term: string) => ({ dictId, term })

describe('pickEpisodeWords', () => {
  it('fills by priority without duplicates, up to max', () => {
    const out = pickEpisodeWords(
      { due: [w(1, 'abandon'), w(2, 'brisk')], today: [w(2, 'brisk'), w(3, 'candid')], recent: [w(4, 'daunting'), w(5, 'eager')] },
      [],
      4,
    )
    expect(out.map((x) => x.term)).toEqual(['abandon', 'brisk', 'candid', 'daunting'])
  })
  it('avoids recently used words unless there is nothing else', () => {
    const lists = { due: [w(1, 'abandon')], today: [], recent: [w(2, 'brisk'), w(3, 'candid')] }
    expect(pickEpisodeWords(lists, [1], 2).map((x) => x.dictId)).toEqual([2, 3])
    expect(pickEpisodeWords({ due: [w(1, 'abandon')], today: [], recent: [] }, [1], 2).map((x) => x.dictId)).toEqual([1])
  })
  it('skips multi-word junk and empty terms', () => {
    expect(pickEpisodeWords({ due: [w(1, ''), w(2, 'look after')], today: [], recent: [] }, [], 3).map((x) => x.term)).toEqual([
      'look after',
    ])
  })
})
