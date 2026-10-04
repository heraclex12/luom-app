import { describe, expect, it } from 'vitest'
import { parseSpeechUrl, SPEECH_MAX_CHARS, speechUrl } from './speech'

describe('speech URLs', () => {
  it('round-trips voice and text', () => {
    expect(parseSpeechUrl(speechUrl('hello there', 'uk'))).toEqual({ voice: 'en-GB-SoniaNeural', text: 'hello there' })
  })

  it('accepts a whole story paragraph (up to SPEECH_MAX_CHARS)', () => {
    expect(SPEECH_MAX_CHARS).toBe(1500)
    const para = 'word '.repeat(280).trim() // ~1400 chars
    expect(parseSpeechUrl(speechUrl(para))?.text).toBe(para)
  })

  it('rejects longer text, unknown voices and other schemes', () => {
    expect(parseSpeechUrl(speechUrl('a'.repeat(SPEECH_MAX_CHARS + 1)))).toBeNull()
    expect(parseSpeechUrl('speak://tts/?voice=evil&text=hi')).toBeNull()
    expect(parseSpeechUrl('https://tts/?voice=en-US-AvaNeural&text=hi')).toBeNull()
  })
})
