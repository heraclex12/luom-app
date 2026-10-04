/**
 * Device-level read-aloud memory: rate, voice preference, per-book resume anchor (`ttsLocation`).
 *
 * Runtime memory only (deviceMemory / localStorage, not persisted to the DB or synced).
 * Resume anchors are a capped MRU list keyed by book hash, independent of reading progress.
 */
import { defineDeviceMemory } from '@/lib/deviceMemory'
import { RATE_MAX, RATE_MIN } from './playback'
import { DEFAULT_VOICE, findVoice } from './voices'

/** Rate: clamp to 0.5–3; unrecognized values fall back to 1.0. */
export function sanitizeTtsRate(raw: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : 1
  return Math.min(Math.max(n, RATE_MIN), RATE_MAX)
}

const rateMemory = defineDeviceMemory<number>('qiyan.reading.ttsRate', 1, sanitizeTtsRate)
export const readTtsRate = rateMemory.read
export const storeTtsRate = rateMemory.store

/**
 * Accept only voice ids in the catalog; anything else (stale / legacy `{ en, zh }` objects) → default.
 * Singular key `ttsVoice` avoids the old `ttsVoices`, so no migration is needed.
 */
export function sanitizeTtsVoice(raw: unknown): string {
  return typeof raw === 'string' && findVoice(raw) ? raw : DEFAULT_VOICE
}

const voiceMemory = defineDeviceMemory<string>(
  'qiyan.reading.ttsVoice',
  DEFAULT_VOICE,
  sanitizeTtsVoice,
)
export const readTtsVoice = voiceMemory.read
export const storeTtsVoice = voiceMemory.store

/** A book's resume anchor (MRU order, newest first). */
export interface TtsLocationEntry {
  hash: string
  cfi: string
}

/** Anchor capacity: least-recently-read books drop out beyond this. */
export const MAX_TTS_LOCATIONS = 50

const isLocationEntry = (e: unknown): e is TtsLocationEntry => {
  const v = e as Partial<TtsLocationEntry> | null
  return typeof v?.hash === 'string' && !!v.hash && typeof v.cfi === 'string' && !!v.cfi
}

/** Sanitize into a valid MRU list: drop bad entries, dedupe by book (first wins), cap length. */
export function sanitizeTtsLocations(raw: unknown): TtsLocationEntry[] {
  if (!Array.isArray(raw)) return []
  const out: TtsLocationEntry[] = []
  const seen = new Set<string>()
  for (const e of raw) {
    if (!isLocationEntry(e) || seen.has(e.hash)) continue
    seen.add(e.hash)
    out.push({ hash: e.hash, cfi: e.cfi })
    if (out.length >= MAX_TTS_LOCATIONS) break
  }
  return out
}

/**
 * Insert / update a book's anchor at the front; sanitize drops the old entry and overflow
 * (first-wins dedupe means the new entry wins).
 */
export function upsertTtsLocation(
  entries: readonly TtsLocationEntry[],
  hash: string,
  cfi: string,
): TtsLocationEntry[] {
  return sanitizeTtsLocations([{ hash, cfi }, ...entries])
}

const locationMemory = defineDeviceMemory<TtsLocationEntry[]>(
  'qiyan.reading.ttsLocations',
  [],
  sanitizeTtsLocations,
)

export function readTtsLocation(bookHash: string): string | null {
  return locationMemory.read().find((e) => e.hash === bookHash)?.cfi ?? null
}

export function storeTtsLocation(bookHash: string, cfi: string): void {
  locationMemory.store(upsertTtsLocation(locationMemory.read(), bookHash, cfi))
}
