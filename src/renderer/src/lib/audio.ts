// Pronunciation playback, shared by word audio on cards / study and example sentence audio.
import type { LocalDictRow } from '@/dict/types'

/** The three audio URL columns needed for word audio (subset of LocalDictRow). */
export type WordAudioColumns = Pick<LocalDictRow, 'ukAudioUrl' | 'usAudioUrl' | 'audioUrl'>

// Global mutex: remember the current Audio and stop it before playing another, so only one
// sound plays at a time (no overlapping example + word audio, no echo from double clicks).
let current: HTMLAudioElement | null = null

/**
 * Playback state (the single source for speaker animations). The mutex already knows what's
 * playing, so we publish it and the UI subscribes — no per-button state, and a pre-empted clip
 * stops animating automatically.
 *
 * loading is separate from playing because audio may come over the network: without it the
 * button would sit still on a slow connection and look unresponsive.
 */
export type AudioPhase = 'idle' | 'loading' | 'playing'

/** A clip's identity is its URL (every button for the same audio lights up together). */
interface PlayingClip {
  url: string
  phase: Exclude<AudioPhase, 'idle'>
}

let playing: PlayingClip | null = null
const listeners = new Set<() => void>()

/** Set the phase and notify; skips no-op updates. */
function setPlaying(next: PlayingClip | null): void {
  if (playing?.url === next?.url && playing?.phase === next?.phase) return
  playing = next
  for (const listener of listeners) listener()
}

/** Minimal pub/sub store for useSyncExternalStore (snapshot = playing clip, or null). */
export const audioStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot(): PlayingClip | null {
    return playing
  },
}

/** Phase of a given audio URL; always idle when url is empty (no audio). */
export function getAudioPhase(url: string | null | undefined): AudioPhase {
  if (!url || playing?.url !== url) return 'idle'
  return playing.phase
}

/**
 * Long-running audio occupant (currently the reading page's read-aloud session). The clip mutex
 * can't just pause it — its <audio> is driven by its own state machine, and pausing behind its back
 * would leave the UI showing "playing" with no sound. Instead: before a clip plays we call
 * interrupt() (the occupant pauses and remembers it was interrupted); when the clip ends we call
 * resume() (the occupant decides whether to continue).
 */
export interface SpeakerOccupant {
  interrupt(): void
  resume(): void
}

let occupant: SpeakerOccupant | null = null

/** Register the long-running occupant (at most one; a new one replaces the old). Returns an unregister function. */
export function occupySpeaker(o: SpeakerOccupant): () => void {
  occupant = o
  return () => {
    if (occupant === o) occupant = null
  }
}

/** The reverse direction: long-running audio is about to play, so stop the current clip. */
export function interruptClip(): void {
  current?.pause()
  current = null
  setPlaying(null)
}

/**
 * Play an audio URL (new Audio): stop the previous clip and let the occupant yield (global
 * mutex), then try to play. Fails silently — pronunciation is a helper, not worth interrupting for.
 */
export async function playAudioUrl(url: string): Promise<void> {
  current?.pause()
  occupant?.interrupt()
  const audio = new Audio(url)
  current = audio
  // Set loading immediately (without waiting for the network) so the button feels responsive.
  setPlaying({ url, phase: 'loading' })
  /** Clip releases the speaker (ended / failed / rejected): hand control back only if still current. */
  const done = (): void => {
    if (current !== audio) return // pre-empted by a newer clip or read-aloud: not ours to resume
    current = null
    setPlaying(null)
    occupant?.resume()
  }
  audio.addEventListener('playing', () => {
    if (current === audio) setPlaying({ url, phase: 'playing' })
  })
  audio.addEventListener('ended', done)
  audio.addEventListener('error', done)
  try {
    await audio.play()
    // play() resolving means playback started; fallback if the playing event doesn't fire (setPlaying dedupes).
    if (current === audio) setPlaying({ url, phase: 'playing' })
  } catch {
    // offline / bad URL / playback rejected → silent; error events aren't guaranteed, so call done here too (idempotent)
    done()
  }
}

/**
 * Whether the word has any playable audio (any of the three URLs). If not, don't show a speaker
 * button — there is no TTS, and a button that does nothing is worse.
 */
export function hasWordAudio(row: WordAudioColumns): boolean {
  return !!(row.ukAudioUrl || row.usAudioUrl || row.audioUrl)
}

/**
 * Which accent the word card shows (shared by phonetics, playback and the playback identity).
 *
 * Some words only have one phonetic. With both, follow the user's preference; with one, pin to
 * that side so a carried-over preference doesn't show an empty phonetic. With neither it doesn't
 * matter (only the fallback audio_url); the preferred side is returned for the playback identity.
 */
export function resolveShownAccent(
  phonetics: { hasUS: boolean; hasUK: boolean },
  preferred: 'us' | 'uk',
): 'us' | 'uk' {
  if (phonetics.hasUS && phonetics.hasUK) return preferred
  if (phonetics.hasUK) return 'uk'
  if (phonetics.hasUS) return 'us'
  return preferred
}

/**
 * Accent → audio column priority: chosen accent column → fallback column. Empty URLs are skipped.
 * Also the identity used by the UI to subscribe to playback, so it must match what playWordAudio plays.
 */
export function resolveWordAudioUrl(row: WordAudioColumns, accent: 'us' | 'uk'): string | null {
  const primary = accent === 'uk' ? row.ukAudioUrl : row.usAudioUrl
  return primary || row.audioUrl || null
}

/** Play the word in the chosen accent; silent if there's no URL. */
export async function playWordAudio(row: WordAudioColumns, accent: 'us' | 'uk'): Promise<void> {
  const url = resolveWordAudioUrl(row, accent)
  if (url) await playAudioUrl(url)
}
