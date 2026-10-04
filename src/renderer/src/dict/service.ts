// Dictionary fetch orchestration: read-through lookups. Local rows with an entry are final; otherwise ask main
// (dictionary:lookup) and store the result. Network failures degrade to "unavailable" — never thrown to callers.
import type { Db } from '@/db/client'
import { dictionaryBridge } from '@/platform'
import * as dict from './dict'
import type { LocalDictRow } from './types'

/** Lookup outcome: hit (local or fetched) / not-found (no such word) / unavailable (offline, service error). */
export type LookupResult =
  | { status: 'hit'; row: LocalDictRow }
  | { status: 'not-found' }
  | { status: 'unavailable' }

/** Max query length. */
export const TERM_MAX_LENGTH = 120

/** Trim + collapse whitespace + strip surrounding punctuation/quotes (selections often grab them). */
export function normalizeTerm(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

/** Fetch an entry from main and store it; reports the three-state outcome. */
async function fetchAndStore(db: Db, term: string): Promise<LookupResult> {
  try {
    const res = await dictionaryBridge.lookup(term)
    if (res.status === 'not-found') return { status: 'not-found' }
    return { status: 'hit', row: await dict.saveEntry(db, res.entry) }
  } catch {
    return { status: 'unavailable' }
  }
}

/** Look up by term: local row with content is the answer; otherwise fetch online and store. */
export async function lookupByTerm(db: Db, raw: string): Promise<LookupResult> {
  const term = normalizeTerm(raw)
  if (!term || term.length > TERM_MAX_LENGTH) return { status: 'not-found' }
  const local = await dict.getByTerm(db, term)
  if (local?.entry) return { status: 'hit', row: local }
  return fetchAndStore(db, local?.term ?? term)
}

/** By id: a placeholder row (entry = null) is fetched once online; offline returns the placeholder as-is. */
export async function readThroughByDictId(db: Db, dictId: number): Promise<LocalDictRow | null> {
  const row = await dict.getByDictId(db, dictId)
  if (!row || row.entry) return row
  const res = await fetchAndStore(db, row.term)
  return res.status === 'hit' ? res.row : row
}
