/**
 * Remembers the last sentence translation provider (Google / Azure).
 *
 * Device-level memory (see [lib/deviceMemory.ts](../../../../lib/deviceMemory.ts)): stored in
 * localStorage, not synced — which provider works best depends on this machine's network.
 * Unknown values fall back to google.
 */
import { defineDeviceMemory } from '@/lib/deviceMemory'

/** Translation provider (matches `TranslateRequest['provider']`). */
export type TranslationProvider = TranslateRequest['provider']

const PROVIDERS: TranslationProvider[] = ['google', 'azure']

const memory = defineDeviceMemory<TranslationProvider>(
  'qiyan.reading.translationProvider',
  'google',
  (raw) => (PROVIDERS.includes(raw as TranslationProvider) ? (raw as TranslationProvider) : 'google'),
)

export const readTranslationProvider = memory.read
export const storeTranslationProvider = memory.store
