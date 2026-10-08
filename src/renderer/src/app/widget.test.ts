// What the desktop widget shows: the words you are learning, due ones first (seeing a word before its review helps
// it stick), each with a short meaning, one example that uses the word, and its seal.
import { describe, expect, it } from 'vitest'
import { buildWidgetData } from './widget'

const NOW = new Date(2026, 9, 15, 10, 0).getTime()
const H = 3_600_000
const entry = (meaning: string, examples: { en: string; vi: string }[] = []): string =>
  JSON.stringify({ word: 'x', meanings: meaning ? [{ pos: 'noun', terms: [meaning] }] : [], examples, synonyms: [] })

describe('buildWidgetData', () => {
  const words = [
    { dictId: 1, term: 'later', due: NOW + 48 * H, usPhonetic: 'ˈleɪtər', ukPhonetic: null, entry: entry('sau này') },
    { dictId: 2, term: 'pension', due: NOW - H, usPhonetic: null, ukPhonetic: 'ˈpenʃn', entry: entry('lương hưu', [
      { en: 'A good day.', vi: 'Một ngày đẹp.' },
      { en: 'She lives on her Pension.', vi: 'Bà sống bằng lương hưu.' },
    ]) },
    { dictId: 3, term: 'empty', due: NOW + H, usPhonetic: null, ukPhonetic: null, entry: entry('') },
    { dictId: 4, term: 'tonight', due: NOW + 5 * H, usPhonetic: null, ukPhonetic: null, entry: entry('tối nay') },
  ]

  it('lists due words first, then the ones due soonest, skipping words with no meaning', () => {
    const d = buildWidgetData(words, NOW)
    expect(d.words.map((w) => w.term)).toEqual(['pension', 'tonight', 'later'])
    expect(d.dueToday).toBe(2)
  })
  it('marks words due today as thirsty and carries phonetic, a meaning without its part of speech, example and seal', () => {
    const [pension, tonight, later] = buildWidgetData(words, NOW).words
    expect(pension).toMatchObject({ stage: 'thirsty', phonetic: 'ˈpenʃn', meaning: 'lương hưu' })
    expect(pension?.example).toEqual({ en: 'She lives on her Pension.', vi: 'Bà sống bằng lương hưu.' })
    expect(pension?.glyph).toHaveLength(5)
    expect(tonight).toMatchObject({ stage: 'thirsty', example: null })
    expect(later).toMatchObject({ stage: 'sprout', phonetic: 'ˈleɪtər' })
  })
  it('sends plain text: dictionary markup like <b>…</b> and entities are removed (the widget marks the word itself)', () => {
    const marked = [{
      dictId: 9, term: 'pension', due: NOW, usPhonetic: null, ukPhonetic: null,
      entry: entry('lương hưu', [{ en: 'He lives on his <b>pension</b> &amp; savings.', vi: 'Ông sống bằng <b>lương hưu</b>.' }]),
    }]
    expect(buildWidgetData(marked, NOW).words[0]?.example).toEqual({
      en: 'He lives on his pension & savings.',
      vi: 'Ông sống bằng lương hưu.',
    })
  })
  it('keeps at most `limit` words', () => {
    expect(buildWidgetData(words, NOW, 1).words).toHaveLength(1)
  })
})
