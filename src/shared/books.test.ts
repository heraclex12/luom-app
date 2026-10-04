// Two gatekeepers on the format table: what can be imported (formatFromFileName) and what can be opened
// (isBookFormat). Both take free-form strings that end up in file paths, so each rule is pinned here.
// Adding a format should only require new positive cases.
import { describe, expect, it } from 'vitest'
import { BOOK_EXTENSIONS, formatFromFileName, isBookFormat } from './books'

describe('formatFromFileName', () => {
  it('detects supported formats by extension', () => {
    expect(formatFromFileName('The Old Man and the Sea.epub')).toBe('epub')
  })

  it('is case-insensitive: .EPUB and .epub are the same', () => {
    expect(formatFromFileName('MOBY-DICK.EPUB')).toBe('epub')
  })

  it('returns null for unknown or missing extensions', () => {
    expect(formatFromFileName('notes.txt')).toBeNull()
    expect(formatFromFileName('README')).toBeNull()
    // "epub" in the name but not the extension must not match.
    expect(formatFromFileName('epub-guide.pdf')).toBeNull()
  })

  it('recognises every extension the dialog accepts', () => {
    for (const ext of BOOK_EXTENSIONS) expect(formatFromFileName(`book.${ext}`)).not.toBeNull()
  })
})

describe('isBookFormat', () => {
  it('accepts known formats and rejects others', () => {
    expect(isBookFormat('epub')).toBe(true)
    // Formats unknown to this version are not openable.
    expect(isBookFormat('pdf')).toBe(false)
  })

  it('rejects shapes that would corrupt the `book.<format>` path', () => {
    expect(isBookFormat('../../etc/passwd')).toBe(false)
    expect(isBookFormat('')).toBe(false)
    // Prototype keys don't count: `in` would wrongly accept toString / constructor.
    expect(isBookFormat('toString')).toBe(false)
    expect(isBookFormat('constructor')).toBe(false)
  })
})
