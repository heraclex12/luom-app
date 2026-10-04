// dict module facade: the read-through entry point for lookup, wordbook (word list + study) and reader popups.
// Bound to the db singleton.
import { db } from '@/db/client'
import { aiBridge, enrichBridge } from '@/platform'
import { aiConfigFrom, getSettings } from '@/settings'
import * as dict from './dict'
import * as service from './service'
import type { LocalDictRow } from './types'

export type { LocalDictRow } from './types'
export type { LookupResult } from './service'
export { normalizeTerm } from './service'

/** Look a term up (local first, then online): hit / not-found / unavailable. */
export const lookup = (term: string): Promise<service.LookupResult> => service.lookupByTerm(db, term)
/** Row by id; placeholder rows are fetched online on first read. */
export const getDict = (dictId: number): Promise<LocalDictRow | null> =>
  service.readThroughByDictId(db, dictId)
/** Map terms to dict ids, creating placeholder rows for new terms (word-list picks). */
export const ensureTerms = (terms: readonly string[]): Promise<Map<string, number>> =>
  dict.ensureTerms(db, terms)
/** Number of dictionary rows (settings diagnostics). */
export const cachedDictCount = (): Promise<number> => dict.cachedDictCount(db)

/**
 * Replace a term's entry with an AI-written one (provider from Settings → AI). Keeps the dict id, so learning progress stays.
 * Throws a user-readable Error (no key, offline, refused…).
 */
export async function improveWithAi(term: string, context?: string): Promise<LocalDictRow> {
  const entry = await enrichBridge.run({ term, context, ai: aiConfigFrom(await getSettings()) })
  return dict.saveEntry(db, entry)
}
/** Whether the chosen AI provider is ready (key saved / bridge running): shows the "Improve with AI" action. */
export async function aiReady(): Promise<boolean> {
  try {
    return (await aiBridge.status(aiConfigFrom(await getSettings()))).ready
  } catch {
    return false
  }
}
