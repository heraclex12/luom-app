import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildEntry,
  headwordWikitext,
  isNotFound,
  parseFreeDict,
  parseGoogle,
  parseMicrosoftTranslations,
  fallbackResult,
  parseWiktionaryForms,
  parseWiktionaryIpa,
  parseWiktionaryRelations,
  selectForms,
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
    expect(f.antonyms).toEqual([{ pos: 'interjection', words: ['bye', 'goodbye'] }])
  })
  it('collects antonyms from meanings and definitions by part of speech', () => {
    const f = parseFreeDict([
      {
        word: 'happy',
        phonetics: [],
        meanings: [
          {
            partOfSpeech: 'adjective',
            antonyms: ['sad'],
            definitions: [{ definition: 'Contented.', antonyms: ['unhappy', 'sad'] }],
          },
        ],
      },
    ])!
    expect(f.antonyms).toEqual([{ pos: 'adjective', words: ['sad', 'unhappy'] }])
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

describe('parseWiktionaryIpa', () => {
  it('reads RP/UK and US/GA pronunciations and simplifies them for learners', () => {
    expect(parseWiktionaryIpa(fixture('wiktionary-abundance.json'))).toEqual({ uk: 'əˈbʌndn̩s', us: 'əˈbʌndn̩s' })
    // Accent from a parent bullet ({{a|en|RP}}) applies to its sub-bullets; tie bars and dots are dropped, ɹ → r.
    const sched = parseWiktionaryIpa(fixture('wiktionary-schedule.json'))
    expect(sched.uk).toBe('ˈʃɛdʒuːl')
    expect(sched.us).toBe('ˈskɛdʒʊl')
  })
  it('an untagged pronunciation fills both accents', () => {
    expect(parseWiktionaryIpa(fixture('wiktionary-resilient.json'))).toEqual({ uk: 'rɪˈzɪljənt', us: 'rɪˈzɪljənt' })
  })
  it('missing / malformed payload → empty', () => {
    expect(parseWiktionaryIpa({ error: { code: 'missingtitle' } })).toEqual({ uk: '', us: '' })
  })
})

describe('headwordWikitext', () => {
  const wikitext = (name: string): string => (fixture(name) as { parse: { wikitext: string } }).parse.wikitext
  it('keeps only part-of-speech / etymology headings and headword templates of the English section', () => {
    expect(headwordWikitext(wikitext('wiktionary-happy.json'))).toBe(
      '===Etymology===\n===Adjective===\n{{en-adj|er,more}}\n===Noun===\n{{en-noun}}\n===Verb===\n{{en-verb}}',
    )
    // "run" starts with a Translingual section: its headings / templates are not included.
    const run = headwordWikitext(wikitext('wiktionary-run.json'))
    expect(run.startsWith('===Etymology===\n===Verb===\n{{en-verb')).toBe(true)
    expect(run).not.toContain('Symbol')
  })
  it('empty when there is no English section or no headword template', () => {
    expect(headwordWikitext('==French==\n===Noun===\n{{fr-noun|m}}')).toBe('')
    expect(headwordWikitext('==English==\n===Etymology===\nFrom Latin.')).toBe('')
  })
})

describe('parseWiktionaryForms', () => {
  const forms = (name: string) => parseWiktionaryForms(fixture(name))
  it('reads irregular verb forms and noun plurals, grouped by part of speech (first form per kind)', () => {
    expect(forms('wiktionary-html-go.json')).toEqual([
      {
        pos: 'verb',
        forms: [
          { label: 'Past (V2)', value: 'went' },
          { label: 'Past participle (V3)', value: 'gone' },
          { label: '-ing form', value: 'going' },
          { label: '3rd person', value: 'goes' },
        ],
      },
      { pos: 'noun', forms: [{ label: 'Plural', value: 'goes' }] },
    ])
  })
  it('a regular verb (-ed form) fills both V2 and V3', () => {
    expect(forms('wiktionary-html-decide.json')).toEqual([
      {
        pos: 'verb',
        forms: [
          { label: 'Past (V2)', value: 'decided' },
          { label: 'Past participle (V3)', value: 'decided' },
          { label: '-ing form', value: 'deciding' },
          { label: '3rd person', value: 'decides' },
        ],
      },
    ])
  })
  it('adjective comparison skips periphrastic "more / most" forms', () => {
    const happy = forms('wiktionary-html-happy.json')
    expect(happy.map((g) => g.pos)).toEqual(['adjective', 'noun', 'verb'])
    expect(happy[0]!.forms).toEqual([
      { label: 'Comparative', value: 'happier' },
      { label: 'Superlative', value: 'happiest' },
    ])
  })
  it('irregular plural and the V3 of run', () => {
    const child = forms('wiktionary-html-child.json')
    expect(child[0]).toEqual({ pos: 'noun', forms: [{ label: 'Plural', value: 'children' }] })
    const run = forms('wiktionary-html-run.json')
    expect(run[0]!.forms).toContainEqual({ label: 'Past (V2)', value: 'ran' })
    expect(run[0]!.forms).toContainEqual({ label: 'Past participle (V3)', value: 'run' })
  })
  it('ignores archaic forms and malformed payloads', () => {
    const html =
      '<h3 id="Verb">Verb</h3><p><span class="headword-line"><strong>x</strong> ' +
      '<b class="Latn form-of lang-en archaic&#124;s-verb-form-form-of" lang="en">xeth</b> ' +
      '<b class="Latn form-of lang-en s-verb-form-form-of" lang="en"><a href="#">xes</a></b></span></p>'
    expect(parseWiktionaryForms({ parse: { text: html } })).toEqual([
      { pos: 'verb', forms: [{ label: '3rd person', value: 'xes' }] },
    ])
    expect(parseWiktionaryForms({ error: { code: 'missingtitle' } })).toEqual([])
  })
})

describe('selectForms', () => {
  const happy = parseWiktionaryForms(fixture('wiktionary-html-happy.json'))
  const go = parseWiktionaryForms(fixture('wiktionary-html-go.json'))
  it('keeps only the parts of speech Google lists (no rare verb forms for "happy")', () => {
    expect(selectForms(happy, ['adjective'])).toEqual([
      { label: 'Comparative', value: 'happier' },
      { label: 'Superlative', value: 'happiest' },
    ])
    expect(selectForms(go, ['verb', 'noun']).map((f) => f.value)).toEqual(['went', 'gone', 'going', 'goes', 'goes'])
  })
  it('without Google part-of-speech info uses the first section', () => {
    expect(selectForms(go, []).map((f) => f.label)).toEqual([
      'Past (V2)',
      'Past participle (V3)',
      '-ing form',
      '3rd person',
    ])
    expect(selectForms([], ['verb'])).toEqual([])
  })
})

describe('parseWiktionaryRelations', () => {
  it('word family from Related / Derived terms: same stem, single words, POS by suffix', () => {
    const r = parseWiktionaryRelations(fixture('wiktionary-decide.json'), 'decide')
    expect(r.family.slice(0, 3)).toEqual([
      { pos: 'noun', word: 'decider' },
      { pos: 'noun', word: 'decision' },
      { pos: 'adjective', word: 'decisive' },
    ])
    expect(r.family.map((f) => f.word)).toContain('decidable')
    // No suffix heuristic match / different stem → skipped.
    expect(r.family.map((f) => f.word)).not.toContain('decidophobia')
    expect(r.family.map((f) => f.word)).not.toContain('undecide')
    expect(r.antonyms).toEqual([])
  })
  it('happy: antonyms from {{ant}} (Thesaurus links skipped, capped at 8) and family members', () => {
    const r = parseWiktionaryRelations(fixture('wiktionary-happy.json'), 'happy')
    expect(r.antonyms[0]).toEqual({
      pos: 'adjective',
      words: ['blue', 'depressed', 'down', 'miserable', 'moody', 'morose', 'sad', 'unhappy'],
    })
    expect(r.family).toContainEqual({ pos: 'noun', word: 'happiness' })
    expect(r.family).toContainEqual({ pos: 'adverb', word: 'happily' })
    expect(r.family.length).toBeLessThanOrEqual(8)
    expect(r.family.every((f) => !/[\s-]/.test(f.word) && f.word !== 'happy')).toBe(true)
  })
  it('go: verb antonyms from {{ant}} / {{antonyms}}', () => {
    const r = parseWiktionaryRelations(fixture('wiktionary-go.json'), 'go')
    const verb = r.antonyms.find((a) => a.pos === 'verb')!
    expect(verb.words.slice(0, 3)).toEqual(['freeze', 'halt', 'remain'])
    expect(verb.words.length).toBe(8)
  })
  it('child: antonyms from an ====Antonyms==== section with {{l|en|…}} bullets', () => {
    const r = parseWiktionaryRelations(fixture('wiktionary-child.json'), 'child')
    expect(r.antonyms).toContainEqual({ pos: 'noun', words: ['father', 'mother', 'parent', 'adult'] })
  })
  it('family keeps suffix derivations and drops compounds', () => {
    const words = parseWiktionaryRelations(fixture('wiktionary-child.json'), 'child').family.map((f) => f.word)
    expect(words).toContain('childhood')
    expect(words).not.toContain('childminder')
    expect(words).not.toContain('childsitter')
    const run = parseWiktionaryRelations(fixture('wiktionary-run.json'), 'run').family.map((f) => f.word)
    expect(run[0]).toBe('runner')
    expect(run).not.toContain('runholder')
  })
  it('missing / malformed payload → empty', () => {
    expect(parseWiktionaryRelations({}, 'x')).toEqual({ antonyms: [], family: [] })
  })
})

describe('buildEntry with Wiktionary extras', () => {
  const google = parseGoogle(fixture('google-happy.json'))!
  const wiki = {
    forms: parseWiktionaryForms(fixture('wiktionary-html-happy.json')),
    ...parseWiktionaryRelations(fixture('wiktionary-happy.json'), 'happy'),
  }
  it('adds forms for Google parts of speech, antonyms and a translated word family (translations stay in order)', () => {
    const entry = buildEntry('happy', google, null, (lines) => lines.map((l) => `VI:${l}`), wiki)
    expect(entry.forms).toEqual([
      { label: 'Comparative', value: 'happier' },
      { label: 'Superlative', value: 'happiest' },
    ])
    expect(entry.antonyms![0]!.words).toContain('sad')
    const happiness = entry.family!.find((f) => f.word === 'happiness')!
    expect(happiness).toEqual({ pos: 'noun', word: 'happiness', vi: 'VI:happiness' })
    // Definitions / examples still line up with their own translations.
    expect(entry.definitions[0]!.vi).toBe(`VI:${entry.definitions[0]!.en}`)
    expect(entry.examples.at(-1)!.vi).toBe(`VI:${stripTags(entry.examples.at(-1)!.en)}`)
  })
  it('merges Free Dictionary antonyms into the same part of speech', () => {
    const free = parseFreeDict([
      { word: 'happy', phonetics: [], meanings: [{ partOfSpeech: 'adjective', antonyms: ['joyless', 'sad'], definitions: [] }] },
    ])!
    const entry = buildEntry('happy', google, free, () => null, { forms: [], antonyms: [], family: [] })
    expect(entry.antonyms).toEqual([{ pos: 'adjective', words: ['joyless', 'sad'] }])
    expect(entry.family).toEqual([])
    expect(entry.forms).toEqual([])
  })
  it('without Wiktionary the new fields are empty arrays', () => {
    const entry = buildEntry('happy', google, null, () => null)
    expect(entry.forms).toEqual([])
    expect(entry.family).toEqual([])
    expect(entry.antonyms).toEqual([])
  })
})

describe('Microsoft fallback (when Google rate-limits)', () => {
  it('parses an aligned batch of translations; null on shape or count mismatch', () => {
    const data = [{ translations: [{ text: 'kiên cường' }] }, { translations: [{ text: 'trẻ sơ sinh' }] }]
    expect(parseMicrosoftTranslations(data, 2)).toEqual(['kiên cường', 'trẻ sơ sinh'])
    expect(parseMicrosoftTranslations(data, 3)).toBeNull()
    expect(parseMicrosoftTranslations({ error: 1 }, 1)).toBeNull()
  })

  it('builds a Google-shaped result from the Microsoft translation + Free Dictionary data', () => {
    const free = parseFreeDict(fixture('freedict-hello.json'))!
    const g = fallbackResult('hello', 'xin chào', free)
    expect(g.translation).toBe('xin chào')
    expect(g.meanings).toEqual([{ pos: 'noun', terms: ['xin chào'] }])
    expect(g.definitions.length).toBeGreaterThan(0)
    expect(isNotFound('hello', g)).toBe(false)
  })

  it('with a primary part of speech, keeps only that part of speech (so forms are not mixed up)', () => {
    const free = parseFreeDict(fixture('freedict-hello.json'))!
    const g = fallbackResult('hello', 'xin chào', free, 'interjection')
    expect(g.meanings).toEqual([{ pos: 'interjection', terms: ['xin chào'] }])
    expect(new Set(g.definitions.map((d) => d.pos))).toEqual(new Set(['interjection']))
    // Unknown primary POS: keep everything rather than nothing.
    expect(fallbackResult('hello', 'xin chào', free, 'adverb').definitions.length).toBe(free.definitions.length)
  })

  it('an untranslated term with no dictionary data is still not found', () => {
    expect(isNotFound('qwzxv', fallbackResult('qwzxv', 'qwzxv', null))).toBe(true)
    expect(fallbackResult('break the ice', 'phá băng', null).meanings).toEqual([])
  })
})
