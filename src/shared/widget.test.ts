// Desktop widget contract: the links a widget opens land on the right page, and only well-formed data reaches the
// widget file (main writes whatever the renderer sends, so it is checked there).
import { describe, expect, it } from 'vitest'
import { parseWidgetRating, routeForWidgetUrl, sanitizeWidgetData, type WidgetData } from './widget'

describe('routeForWidgetUrl', () => {
  it('opens the word a widget shows, or the study page', () => {
    expect(routeForWidgetUrl('luom://word/42')).toBe('/wordbook/words?seg=all&dictId=42')
    expect(routeForWidgetUrl('luom://study')).toBe('/wordbook/study')
  })
  it('anything else opens My words', () => {
    expect(routeForWidgetUrl('luom://word/abc')).toBe('/wordbook')
    expect(routeForWidgetUrl('luom://')).toBe('/wordbook')
    expect(routeForWidgetUrl('https://example.com/word/1')).toBe('/wordbook')
    expect(routeForWidgetUrl('not a url')).toBe('/wordbook')
  })
})

describe('sanitizeWidgetData', () => {
  const word = {
    dictId: 7,
    term: 'pension',
    phonetic: 'ˈpenʃən',
    meaning: 'lương hưu',
    example: { en: 'She lives on her pension.', vi: 'Bà sống bằng lương hưu.' },
    stage: 'thirsty' as const,
    glyph: ['####.', '#...#', '####.', '#....', '#....'],
  }
  const data: WidgetData = { version: 1, updatedAt: 1000, dueToday: 3, rotateMinutes: 15, words: [word] }

  it('keeps well-formed data as is', () => {
    expect(sanitizeWidgetData(data)).toEqual(data)
  })
  it('rejects anything that is not widget data', () => {
    expect(sanitizeWidgetData(null)).toBeNull()
    expect(sanitizeWidgetData({ ...data, version: 2 })).toBeNull()
    expect(sanitizeWidgetData({ ...data, words: 'x' })).toBeNull()
  })
  it('drops malformed words, caps the list and trims long text', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...word, dictId: i + 1 }))
    const out = sanitizeWidgetData({ ...data, words: [{ dictId: 'x' }, ...many, { ...word, meaning: 'm'.repeat(900) }] })
    expect(out?.words).toHaveLength(24)
    expect(out?.words[0]?.dictId).toBe(1)
    const long = sanitizeWidgetData({ ...data, words: [{ ...word, meaning: 'm'.repeat(900), glyph: ['#'] }] })
    expect(long?.words[0]?.meaning.length).toBeLessThanOrEqual(200)
    expect(long?.words[0]?.glyph).toBeNull()
  })
})

describe('parseWidgetRating', () => {
  it('reads an answer the widget left in its inbox', () => {
    expect(parseWidgetRating('{"dictId":12,"action":"good","at":1000}')).toEqual({ dictId: 12, action: 'good', at: 1000 })
    expect(parseWidgetRating('{"dictId":12,"action":"again","at":1000}')).toEqual({ dictId: 12, action: 'again', at: 1000 })
  })
  it('ignores anything else (the inbox is writable by the widget only, but a bad file must not break the app)', () => {
    expect(parseWidgetRating('not json')).toBeNull()
    expect(parseWidgetRating('{"dictId":"12","action":"good","at":1}')).toBeNull()
    expect(parseWidgetRating('{"dictId":12,"action":"easy","at":1}')).toBeNull()
    expect(parseWidgetRating('{"dictId":12,"action":"good"}')).toBeNull()
  })
})
