// Which text the capture hotkey uses: the live selection always wins (Accessibility read or a clean ⌘C);
// only when nothing is selected does the clipboard's existing text count. Paragraph-sized text is not vocabulary.
import { describe, expect, it } from 'vitest'
import { chooseCaptureText, parseHelperOutput } from './captureText'

describe('parseHelperOutput', () => {
  it('parses the helper JSON and tolerates garbage', () => {
    expect(parseHelperOutput('{"text":"bold","source":"ax","trusted":true}\n')).toEqual({ text: 'bold', source: 'ax', trusted: true })
    expect(parseHelperOutput('oops')).toBeNull()
    expect(parseHelperOutput('{"text":1}')).toBeNull()
  })
})

describe('chooseCaptureText', () => {
  it('prefers the selection over the clipboard', () => {
    expect(chooseCaptureText({ text: ' resilient ', source: 'ax', trusted: true }, 'old copied text')).toEqual({
      text: 'resilient',
      source: 'selection',
    })
    expect(chooseCaptureText({ text: 'resilient', source: 'copy', trusted: true }, 'x').source).toBe('selection')
  })
  it('falls back to the clipboard when nothing is selected or the helper is unavailable', () => {
    expect(chooseCaptureText({ text: '', source: 'none', trusted: true }, 'serendipity')).toEqual({
      text: 'serendipity',
      source: 'clipboard',
    })
    expect(chooseCaptureText(null, 'serendipity').source).toBe('clipboard')
    expect(chooseCaptureText({ text: '', source: 'none', trusted: false }, '  ')).toEqual({ text: '', source: 'none' })
  })
  it('collapses whitespace and rejects paragraph-sized text', () => {
    expect(chooseCaptureText({ text: 'break\n  the ice', source: 'ax', trusted: true }, '').text).toBe('break the ice')
    expect(chooseCaptureText({ text: 'x'.repeat(200), source: 'ax', trusted: true }, 'fallback')).toEqual({
      text: '',
      source: 'selection',
    })
  })
})
