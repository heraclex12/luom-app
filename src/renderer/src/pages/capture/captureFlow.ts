// Quick-capture flow (popup window): look the term up and save it to my words in one go.
import type { LocalDictRow, LookupResult } from '@/dict'

export type CaptureOutcome =
  | { kind: 'idle' }
  | { kind: 'hit'; row: LocalDictRow; saved: 'added' | 'existing' }
  | { kind: 'not-found'; term: string }
  | { kind: 'unavailable'; term: string }

export interface CaptureDeps {
  lookup: (term: string) => Promise<LookupResult>
  /** Learning state of a dict id in my words; null when not in my words. */
  getState: (dictId: number) => Promise<{ state: number; due: number | null } | null>
  addWord: (dictId: number) => Promise<void>
  addToCollection: (collectionId: number, dictId: number) => Promise<void>
  recordHistory: (row: LocalDictRow) => Promise<void>
}

/** Look up, save to My words (unless already there) and file into `collectionId` when given. */
export async function runCapture(raw: string, deps: CaptureDeps, collectionId?: number): Promise<CaptureOutcome> {
  const term = raw.replace(/\s+/g, ' ').trim()
  if (!term) return { kind: 'idle' }
  const res = await deps.lookup(term)
  if (res.status !== 'hit') return { kind: res.status, term }
  const existing = await deps.getState(res.row.dictId)
  if (!existing) await deps.addWord(res.row.dictId)
  if (collectionId != null) await deps.addToCollection(collectionId, res.row.dictId)
  await deps.recordHistory(res.row)
  return { kind: 'hit', row: res.row, saved: existing ? 'existing' : 'added' }
}
