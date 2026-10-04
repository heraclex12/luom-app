// CSV export: one row per word with the Vietnamese gist and learning state; fields are quoted safely so commas,
// quotes and newlines in meanings never break the file (Excel / Google Sheets / Anki import).
import { describe, expect, it } from 'vitest'
import { toCsv } from './export'

describe('toCsv', () => {
  it('writes a header and escapes fields', () => {
    const csv = toCsv([
      { word: 'abundance', phonetic: 'əˈbʌndəns', meaning: 'n. sự phong phú, vô số', state: 'review', due: new Date(2026, 9, 5).getTime() },
      { word: 'say "hi"', phonetic: '', meaning: 'line1\nline2', state: 'new', due: null },
    ])
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe('word,phonetic,vietnamese,state,next_review')
    expect(lines[1]).toBe('abundance,əˈbʌndəns,"n. sự phong phú, vô số",review,2026-10-05')
    expect(csv).toContain('"say ""hi"""')
    expect(csv).toContain('"line1\nline2"')
    // BOM so Excel opens UTF-8 Vietnamese correctly.
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })
})
