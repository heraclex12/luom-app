// wordModel adapter: pins the EnViEntry → Word field mapping (the cards render Word only), plus defensive
// fallbacks (bad JSON / placeholder rows) and learning-state mapping.
import { describe, expect, it } from 'vitest'
import { dictRowToWord, firstMeaning, placeholderWord, toLearnState } from './wordModel'
import type { WordStateBrief } from './types'
import type { LocalDictRow } from '@/dict'
import type { EnViEntry } from '../../../shared/dictionary'

// now = 2026-01-15 10:00 local; the day window ends next day 4:00.
const NOW = new Date(2026, 0, 15, 10, 0, 0, 0).getTime()
const BEFORE_NEXT_DAY = new Date(2026, 0, 15, 20, 0, 0, 0).getTime()
const AFTER_NEXT_DAY = new Date(2026, 0, 20, 10, 0, 0, 0).getTime()

const ENTRY: EnViEntry = {
  word: 'abundance',
  ipaUK: 'əˈbʌnd(ə)ns',
  ipaUS: 'əˈbəndəns',
  translation: 'sự phong phú',
  meanings: [
    { pos: 'noun', terms: ['sự phong phú', 'vô số'] },
    { pos: 'adjective', terms: ['dồi dào'] },
  ],
  definitions: [
    {
      pos: 'noun',
      en: 'a very large quantity of something.',
      vi: 'một số lượng rất lớn của một cái gì đó',
      example: { en: 'an <b>abundance</b> of wildlife', vi: 'vô số động vật hoang dã' },
    },
    { pos: 'noun', en: 'a bid in solo whist.', vi: '' },
  ],
  examples: [{ en: 'vines grew in <b>abundance</b>', vi: 'cây nho mọc rất nhiều' }],
  synonyms: [{ pos: 'noun', words: ['plenty', 'profusion'] }],
  source: 'web',
}

function row(overrides: Partial<LocalDictRow> = {}): LocalDictRow {
  return {
    dictId: 1,
    term: 'abundance',
    ukPhonetic: 'əˈbʌnd(ə)ns',
    usPhonetic: 'əˈbəndəns',
    ukAudioUrl: 'speak://tts/?voice=uk',
    usAudioUrl: 'speak://tts/?voice=us',
    audioUrl: null,
    entry: JSON.stringify(ENTRY),
    ...overrides,
  }
}

describe('dictRowToWord', () => {
  it('maps Vietnamese meanings to simpleSenses with short part-of-speech labels', () => {
    const w = dictRowToWord(row(), null, NOW)
    expect(w.word).toBe('abundance')
    expect(w.phoneticUK).toBe('/əˈbʌnd(ə)ns/')
    expect(w.phoneticUS).toBe('/əˈbəndəns/')
    expect(w.simpleSenses).toEqual(['n. sự phong phú, vô số', 'adj. dồi dào'])
  })

  it('maps English definitions (with Vietnamese and examples) to the English view', () => {
    const w = dictRowToWord(row(), null, NOW)
    expect(w.collinsEntries[0]).toEqual({
      pos: 'n.',
      tran: 'a very large quantity of something.',
      tranVi: 'một số lượng rất lớn của một cái gì đó',
      examples: [{ en: 'an <b>abundance</b> of wildlife', vi: 'vô số động vật hoang dã' }],
    })
    expect(w.collinsEntries[1]!.examples).toEqual([])
  })

  it('maps bilingual examples with a speech URL for the plain English sentence', () => {
    const [ex] = dictRowToWord(row(), null, NOW).examples
    expect(ex!.english).toBe('vines grew in <b>abundance</b>')
    expect(ex!.translation).toBe('cây nho mọc rất nhiều')
    expect(ex!.audioUrl).toMatch(/^speak:/)
    expect(decodeURIComponent(ex!.audioUrl!.replace(/\+/g, ' '))).toContain('vines grew in abundance')
  })

  it('maps synonyms', () => {
    expect(dictRowToWord(row(), null, NOW).synonymGroups).toEqual([
      { pos: 'n.', meaning: '', words: ['plenty', 'profusion'], kind: 'synonym' },
    ])
  })

  it('maps antonyms after synonyms as antonym groups', () => {
    const e: EnViEntry = { ...ENTRY, antonyms: [{ pos: 'noun', words: ['scarcity', 'lack'] }] }
    expect(dictRowToWord(row({ entry: JSON.stringify(e) }), null, NOW).synonymGroups).toEqual([
      { pos: 'n.', meaning: '', words: ['plenty', 'profusion'], kind: 'synonym' },
      { pos: 'n.', meaning: '', words: ['scarcity', 'lack'], kind: 'antonym' },
    ])
  })

  it('maps word forms to inflections and the word family to "pos word — Vietnamese" lines', () => {
    const e: EnViEntry = {
      ...ENTRY,
      word: 'decide',
      forms: [
        { label: 'Past (V2)', value: 'decided' },
        { label: '-ing form', value: 'deciding' },
      ],
      family: [
        { pos: 'noun', word: 'decision', vi: 'sự quyết định' },
        { pos: 'adverb', word: 'decisively', vi: '' },
      ],
    }
    const w = dictRowToWord(row({ term: 'decide', entry: JSON.stringify(e) }), null, NOW)
    expect(w.inflections).toEqual([
      { label: 'Past (V2)', value: 'decided' },
      { label: '-ing form', value: 'deciding' },
    ])
    expect(w.derived).toEqual(['n. decision — sự quyết định', 'adv. decisively'])
  })

  it('entries stored before forms / family / antonyms existed map them to empty lists', () => {
    const w = dictRowToWord(row(), null, NOW)
    expect(w.inflections).toEqual([])
    expect(w.derived).toEqual([])
    expect(w.synonymGroups.filter((g) => g.kind === 'antonym')).toEqual([])
  })

  it('falls back to the headline translation when there are no meaning groups', () => {
    const phrase: EnViEntry = { ...ENTRY, word: 'break the ice', translation: 'phá băng', meanings: [] }
    const w = dictRowToWord(row({ term: 'break the ice', entry: JSON.stringify(phrase) }), null, NOW)
    expect(w.simpleSenses).toEqual(['phá băng'])
  })

  it('degrades to an empty card on bad JSON or placeholder rows', () => {
    for (const entry of ['{bad json', null]) {
      const w = dictRowToWord(row({ entry }), null, NOW)
      expect(w.word).toBe('abundance')
      expect(w.simpleSenses).toEqual([])
      expect(w.collinsEntries).toEqual([])
      expect(w.examples).toEqual([])
    }
  })

  it('firstMeaning gives a one-line gist', () => {
    expect(firstMeaning(JSON.stringify(ENTRY))).toBe('n. sự phong phú, vô số')
    expect(firstMeaning(null)).toBe('')
  })
})

describe('learning state', () => {
  it('maps numeric states 0-4 and falls back to new', () => {
    expect([0, 1, 2, 3, 4].map(toLearnState)).toEqual(['new', 'learning', 'review', 'relearning', 'mastered'])
    expect(toLearnState(9)).toBe('new')
  })

  it('due within today → today, later → later, none → undefined', () => {
    const today: WordStateBrief = { state: 2, due: BEFORE_NEXT_DAY }
    const later: WordStateBrief = { state: 2, due: AFTER_NEXT_DAY }
    expect(dictRowToWord(row(), today, NOW).due).toBe('today')
    expect(dictRowToWord(row(), later, NOW).due).toBe('later')
    expect(dictRowToWord(row(), { state: 0, due: null }, NOW).due).toBeUndefined()
    expect(dictRowToWord(row(), { state: 3, due: BEFORE_NEXT_DAY }, NOW).state).toBe('relearning')
  })
})

describe('placeholderWord', () => {
  it('keeps only the term and learning state', () => {
    const w = placeholderWord('phantom', { state: 1, due: null }, NOW)
    expect(w.word).toBe('phantom')
    expect(w.state).toBe('learning')
    expect(w.simpleSenses).toEqual([])
  })
})
