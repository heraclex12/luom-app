import { describe, expect, it } from 'vitest'
import { markWords,
  cleanStoryHtml,
  findUsedWords,
  normalizeStory,
  parseSavedStory,
  pickStoryWords,
  plainText,
  requestedWordFor,
  storyPrompt,
} from './story'

describe('cleanStoryHtml', () => {
  it('keeps <b> tags and drops every other tag', () => {
    expect(cleanStoryHtml('A <i>very</i> <b>brave</b> <span class="x">cat</span>.')).toBe('A very <b>brave</b> cat.')
  })

  it('normalises <strong> and tag case to <b>, strips attributes on b', () => {
    expect(cleanStoryHtml('<STRONG>Big</STRONG> and <B class="y">small</B>')).toBe('<b>Big</b> and <b>small</b>')
  })

  it('collapses whitespace and removes empty bold pairs', () => {
    expect(cleanStoryHtml('  Hello   <b></b>world \n again ')).toBe('Hello world again')
  })

  it('closes an unbalanced <b> and drops stray closing tags', () => {
    expect(cleanStoryHtml('</b>She was <b>tired')).toBe('She was <b>tired</b>')
  })

  it('removes markdown bold markers', () => {
    expect(cleanStoryHtml('A **quiet** day')).toBe('A <b>quiet</b> day')
  })
})

describe('plainText', () => {
  it('strips tags for speech', () => {
    expect(plainText('He <b>decided</b> to go.')).toBe('He decided to go.')
  })
})

describe('findUsedWords', () => {
  const words = ['decide', 'Apple', 'make', 'try', 'look forward to', 'ocean']

  it('matches case-insensitively, including common inflections and bold forms', () => {
    const text = 'She <b>decided</b> to eat an <b>apple</b>. They were <b>making</b> plans and <b>tried</b> hard. We <b>look forward to</b> it.'
    expect(findUsedWords(words, [text])).toEqual(['decide', 'Apple', 'make', 'try', 'look forward to'])
  })

  it('does not match inside other words', () => {
    expect(findUsedWords(['cat'], ['The category was wrong.'])).toEqual([])
  })

  it('looks across all paragraphs and keeps request order without duplicates', () => {
    expect(findUsedWords(['ocean', 'ocean', 'apple'], ['An apple.', 'The ocean.'])).toEqual(['ocean', 'apple'])
  })
})

describe('normalizeStory', () => {
  it('cleans paragraphs, drops empty ones and computes usedWords', () => {
    const story = normalizeStory(
      {
        title: '  The <i>Lost</i> Key ',
        paragraphs: [
          { en: 'Tom <b>decided</b> to <script>x</script>walk.', vi: ' Tom quyết định đi bộ. ' },
          { en: '   ', vi: '' },
          { en: 'He found an <b>apple</b>.', vi: 'Anh ấy tìm thấy một quả táo.' },
        ],
      },
      ['decide', 'apple', 'ocean'],
    )
    expect(story).toEqual({
      title: 'The Lost Key',
      paragraphs: [
        { en: 'Tom <b>decided</b> to xwalk.', vi: 'Tom quyết định đi bộ.' },
        { en: 'He found an <b>apple</b>.', vi: 'Anh ấy tìm thấy một quả táo.' },
      ],
      usedWords: ['decide', 'apple'],
    })
  })

  it('falls back to a default title and throws when no paragraph is left', () => {
    expect(normalizeStory({ title: '', paragraphs: [{ en: 'Hi.', vi: 'Chào.' }] }, []).title).toBe('A short story')
    expect(() => normalizeStory({ title: 'X', paragraphs: [{ en: '', vi: '' }] }, [])).toThrow()
  })
})

describe('pickStoryWords', () => {
  it('takes today first, then due, then pool; de-duplicates case-insensitively; caps at max', () => {
    expect(pickStoryWords([['Apple', 'tree'], ['apple', 'river'], ['sun', 'moon', 'star']], 4)).toEqual([
      'Apple',
      'tree',
      'river',
      'sun',
    ])
  })

  it('skips empty / null terms and trims', () => {
    expect(pickStoryWords([[' a ', null, ''], ['b']], 8)).toEqual(['a', 'b'])
  })
})

describe('parseSavedStory', () => {
  it('returns a story from valid JSON', () => {
    const s = { title: 'T', paragraphs: [{ en: 'a', vi: 'b' }], usedWords: ['a'] }
    expect(parseSavedStory(JSON.stringify(s))).toEqual(s)
  })

  it('returns null for missing / malformed data', () => {
    expect(parseSavedStory(null)).toBeNull()
    expect(parseSavedStory('{bad')).toBeNull()
    expect(parseSavedStory(JSON.stringify({ title: 'T', paragraphs: [] }))).toBeNull()
    expect(parseSavedStory(JSON.stringify({ title: 'T', paragraphs: [{ en: 1 }], usedWords: [] }))).toBeNull()
  })
})

describe('storyPrompt', () => {
  it('lists the cleaned words, the level and the theme', () => {
    const p = storyPrompt({ words: [' apple ', '', 'river'], level: 'A2', theme: 'Travel' })
    expect(p).toContain('Level: A2')
    expect(p).toContain('Words: apple, river')
    expect(p).toContain('Theme: Travel')
  })

  it('omits the theme line when there is none and caps the word list at 12', () => {
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`)
    const p = storyPrompt({ words, level: 'B2' })
    expect(p).not.toContain('Theme')
    expect(p).toContain('w11')
    expect(p).not.toContain('w12')
  })
})

describe('requestedWordFor', () => {
  it('maps a highlighted form back to the requested word, else returns the form itself', () => {
    expect(requestedWordFor('Decided', ['apple', 'decide'])).toBe('decide')
    expect(requestedWordFor('tried', ['try'])).toBe('try')
    expect(requestedWordFor('  went ', ['go'])).toBe('went')
  })
})

describe('markWords', () => {
  const words = ['accumulate', 'diligent', 'persevere', 'look up']
  it('marks the learner words (and their inflections) when the AI left the text unmarked', () => {
    expect(markWords('A diligent clerk saw costs accumulated and Diligent staff persevering.', words)).toBe(
      'A <b>diligent</b> clerk saw costs <b>accumulated</b> and <b>Diligent</b> staff <b>persevering</b>.',
    )
    expect(markWords('She will look up the word.', words)).toBe('She will <b>look up</b> the word.')
  })
  it('keeps the AI markup when there is some, and never marks parts of other words', () => {
    expect(markWords('A <b>diligent</b> clerk; diligent again.', words)).toBe('A <b>diligent</b> clerk; diligent again.')
    expect(markWords('Diligently and accumulates.', ['diligent', 'accumulate'])).toBe('Diligently and <b>accumulates</b>.')
    expect(markWords('Nothing here.', [])).toBe('Nothing here.')
  })
})
