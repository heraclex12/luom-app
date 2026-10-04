// speak:// URLs — pronunciation audio synthesised on demand by main (Edge neural TTS) and cached on disk.
// Anything that plays a URL (<audio>, new Audio()) can pronounce words and example sentences through it.

export const SPEECH_SCHEME = 'speak'

export type Accent = 'us' | 'uk'

/** Edge neural voices used for pronunciation (clear, natural, free). */
export const SPEECH_VOICES: Record<Accent, string> = {
  us: 'en-US-AvaNeural',
  uk: 'en-GB-SoniaNeural',
}

/** Build the URL that pronounces `text` with the given accent. */
export function speechUrl(text: string, accent: Accent = 'us'): string {
  const params = new URLSearchParams({ voice: SPEECH_VOICES[accent], text: text.trim() })
  return `${SPEECH_SCHEME}://tts/?${params.toString()}`
}

/** Parse a speak:// URL back into voice + text; null when it is not a valid speech URL. */
export function parseSpeechUrl(url: string): { voice: string; text: string } | null {
  try {
    const u = new URL(url)
    if (u.protocol !== `${SPEECH_SCHEME}:` || u.hostname !== 'tts') return null
    const voice = u.searchParams.get('voice') ?? ''
    const text = (u.searchParams.get('text') ?? '').trim()
    if (!Object.values(SPEECH_VOICES).includes(voice) || !text || text.length > 500) return null
    return { voice, text }
  } catch {
    return null
  }
}
