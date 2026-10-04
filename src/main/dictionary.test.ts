import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildEntry,
  isNotFound,
  parseFreeDict,
  parseGoogle,
  splitTranslatedLines,
  stripTags,
} from './dictionary'

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, '__fixtures__', name), 'utf-8'))

describe('parseGoogle', () => {
  it('extracts translation, Vietnamese meanings by part of speech, definitions, examples and synonyms', () => {
    const g = parseGoogle(fixture('google-abundance.json'))!
    expect(g.translation).toBe('sự phong phú')
    expect(g.ipa).toBe('əˈbənd(ə)ns')
    expect(g.meanings).toEqual([{ pos: 'noun', terms: ['nhiều lắm', 'nhiều quá', 'phong phú', 'vô số'] }])
    expect(g.definitions[0]).toEqual({
      pos: 'noun',
      en: 'a very large quantity of something.',
      example: 'the tropical island boasts an abundance of wildlife',
    })
    // A definition without an example keeps example undefined.
    expect(g.definitions[1]!.example).toBeUndefined()
    // Examples keep the <b> markup around the headword.
    expect(g.examples).toContain('the growth of industry promised wealth and <b>abundance</b>')
    // Synonym groups flagged with a register (rare/informal/dated) are skipped in favour of plain ones.
    expect(g.synonyms[0]!.pos).toBe('noun')
    expect(g.synonyms[0]!.words).not.toContain('nimiety')
    expect(g.synonyms[0]!.words.length).toBeGreaterThan(0)
  })

  it('handles a phrase that only has a sentence translation', () => {
    const g = parseGoogle(fixture('google-break-the-ice.json'))!
    expect(g.translation).toBe('phá băng')
    expect(g.meanings).toEqual([])
    expect(g.definitions).toEqual([])
    expect(g.examples).toEqual([])
  })

  it('returns null for a malformed payload', () => {
    expect(parseGoogle({ nope: true })).toBeNull()
    expect(parseGoogle(null)).toBeNull()
  })
})

describe('isNotFound', () => {
  it('treats an untranslated term with no dictionary data as not found', () => {
    expect(isNotFound('qwzxv', parseGoogle(fixture('google-gibberish.json')))).toBe(true)
  })
  it('accepts phrases that translate even without dictionary data', () => {
    expect(isNotFound('break the ice', parseGoogle(fixture('google-break-the-ice.json')))).toBe(false)
  })
  it('a null parse is not found', () => {
    expect(isNotFound('x', null)).toBe(true)
  })
})

describe('parseFreeDict', () => {
  it('picks UK/US IPA by audio file suffix and collects definitions with examples', () => {
    const f = parseFreeDict(fixture('freedict-hello.json'))!
    expect(f.ipaUK).toBe('həˈləʊ')
    // The US phonetic has no audio; the remaining unlabeled phonetic is taken as US.
    expect(f.ipaUS).toBe('həˈloʊ')
    expect(f.definitions.find((d) => d.example === 'Hello, everyone.')?.pos).toBe('interjection')
    expect(f.synonyms).toEqual([{ pos: 'noun', words: ['greeting'] }])
  })
  it('returns null for the not-found shape', () => {
    expect(parseFreeDict({ title: 'No Definitions Found' })).toBeNull()
  })
})

describe('text helpers', () => {
  it('stripTags removes markup', () => {
    expect(stripTags('we will be <b>happy</b> to advise')).toBe('we will be happy to advise')
  })
  it('splitTranslatedLines returns null when the line count does not match', () => {
    expect(splitTranslatedLines('a\nb\nc', 3)).toEqual(['a', 'b', 'c'])
    expect(splitTranslatedLines('a\nb', 3)).toBeNull()
  })
})

describe('buildEntry', () => {
  it('merges Google + Free Dictionary and attaches translations in order', () => {
    const google = parseGoogle(fixture('google-happy.json'))!
    const free = parseFreeDict(fixture('freedict-hello.json'))!
    const entry = buildEntry('happy', google, free, (lines) => lines.map((l) => `VI:${l}`))
    expect(entry.word).toBe('happy')
    expect(entry.translation).toBe('vui mừng')
    expect(entry.ipaUK).toBe('həˈləʊ')
    // The headline translation is folded into the first meaning group when missing from it.
    expect(entry.meanings[0]!.terms[0]).toBe('vui mừng')
    // Definitions prefer Google (with up to 6 overall) and get Vietnamese translations.
    expect(entry.definitions.length).toBeGreaterThan(0)
    expect(entry.definitions.length).toBeLessThanOrEqual(6)
    expect(entry.definitions[0]!.vi).toBe(`VI:${entry.definitions[0]!.en}`)
    // Examples keep <b> in English, translate the stripped text, and are capped at 5.
    expect(entry.examples.length).toBeGreaterThan(0)
    expect(entry.examples.length).toBeLessThanOrEqual(5)
    expect(entry.examples[0]!.en).toContain('<b>')
    expect(entry.examples[0]!.vi).toBe(`VI:${stripTags(entry.examples[0]!.en)}`)
    expect(entry.source).toBe('web')
  })

  it('falls back to Google IPA and empty translations when extras are unavailable', () => {
    const google = parseGoogle(fixture('google-abundance.json'))!
    const entry = buildEntry('abundance', google, null, () => null)
    expect(entry.ipaUS).toBe('əˈbənd(ə)ns')
    expect(entry.ipaUK).toBe('')
    expect(entry.definitions[0]!.vi).toBe('')
    expect(entry.examples[0]!.vi).toBe('')
  })
})
