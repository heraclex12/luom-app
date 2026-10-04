/**
 * Read-aloud voice catalog: Edge "Read Aloud" neural voices, all English (US / UK), grouped by locale.
 *
 * Voice is decoupled from content language: whatever the text, synthesis uses the user's selected
 * voice. Non-English text is rare in this app, and Edge English voices still read it fine.
 * Only one preferred voice is remembered (`ttsVoice`, device-level runtime state).
 *
 * Entries are copied from readest's Edge voice table (en-US / en-GB groups), alphabetical,
 * hardcoded (Edge's free endpoint has no voice-list API).
 */

export interface TtsVoice {
  /** Full Edge voice name (used as `<voice name>`), e.g. `en-US-AndrewNeural`. */
  id: string
  /** Display name: `Name (accent · gender[ · note])`. */
  label: string
  /**
   * Voice locale; doubles as the group key and the SSML `xml:lang`.
   * Edge ignores `xml:lang` in practice; we fill a valid value per the SSML spec.
   */
  locale: string
}

/** Edge English voices (17 en-US + 5 en-GB, alphabetical as in readest). */
export const TTS_VOICES: readonly TtsVoice[] = [
  { id: 'en-US-AnaNeural', label: 'Ana (US · female · child)', locale: 'en-US' },
  { id: 'en-US-AndrewMultilingualNeural', label: 'Andrew (US · male · multilingual)', locale: 'en-US' },
  { id: 'en-US-AndrewNeural', label: 'Andrew (US · male)', locale: 'en-US' },
  { id: 'en-US-AriaNeural', label: 'Aria (US · female)', locale: 'en-US' },
  { id: 'en-US-AvaMultilingualNeural', label: 'Ava (US · female · multilingual)', locale: 'en-US' },
  { id: 'en-US-AvaNeural', label: 'Ava (US · female)', locale: 'en-US' },
  { id: 'en-US-BrianMultilingualNeural', label: 'Brian (US · male · multilingual)', locale: 'en-US' },
  { id: 'en-US-BrianNeural', label: 'Brian (US · male)', locale: 'en-US' },
  { id: 'en-US-ChristopherNeural', label: 'Christopher (US · male)', locale: 'en-US' },
  { id: 'en-US-EmmaMultilingualNeural', label: 'Emma (US · female · multilingual)', locale: 'en-US' },
  { id: 'en-US-EmmaNeural', label: 'Emma (US · female)', locale: 'en-US' },
  { id: 'en-US-EricNeural', label: 'Eric (US · male)', locale: 'en-US' },
  { id: 'en-US-GuyNeural', label: 'Guy (US · male)', locale: 'en-US' },
  { id: 'en-US-JennyNeural', label: 'Jenny (US · female)', locale: 'en-US' },
  { id: 'en-US-MichelleNeural', label: 'Michelle (US · female)', locale: 'en-US' },
  { id: 'en-US-RogerNeural', label: 'Roger (US · male)', locale: 'en-US' },
  { id: 'en-US-SteffanNeural', label: 'Steffan (US · male)', locale: 'en-US' },
  { id: 'en-GB-LibbyNeural', label: 'Libby (UK · female)', locale: 'en-GB' },
  { id: 'en-GB-MaisieNeural', label: 'Maisie (UK · female · child)', locale: 'en-GB' },
  { id: 'en-GB-RyanNeural', label: 'Ryan (UK · male)', locale: 'en-GB' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia (UK · female)', locale: 'en-GB' },
  { id: 'en-GB-ThomasNeural', label: 'Thomas (UK · male)', locale: 'en-GB' },
]

/** Default voice when no preference is set. Avoids the child voices (Ana / Maisie) for long reads. */
export const DEFAULT_VOICE = 'en-US-AndrewNeural'

/** Look up voice metadata by id (undefined if not found). */
export function findVoice(id: string): TtsVoice | undefined {
  return TTS_VOICES.find((v) => v.id === id)
}

/** Voice list grouped by accent for the full player (Edge is the only engine). */
export interface TtsVoiceGroup {
  locale: string
  label: string
  voices: readonly TtsVoice[]
}

const LOCALE_LABELS: Record<string, string> = {
  'en-US': 'English · American',
  'en-GB': 'English · British',
}

/** Voices grouped by locale (order follows TTS_VOICES). */
export const VOICE_GROUPS: readonly TtsVoiceGroup[] = [
  ...new Set(TTS_VOICES.map((v) => v.locale)),
].map((locale) => ({
  locale,
  label: LOCALE_LABELS[locale] ?? locale,
  voices: TTS_VOICES.filter((v) => v.locale === locale),
}))

/** Voice id → display name; undefined if not in the catalog (caller provides a fallback). */
export function voiceName(id: string): string | undefined {
  return findVoice(id)?.label
}
