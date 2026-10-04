// Local EN→VI dictionary store (the `dict` table): read / save / placeholder creation.
// dict_id is allocated locally (max+1) and is what every learning table refers to, so a term keeps its id forever.
// Terms match case-insensitively (unique index on lower(term)). No HTTP here — service.ts orchestrates fetching.
import { count, eq, inArray, max, sql } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { dict } from '@/db/schema'
import type { EnViEntry } from '../../../shared/dictionary'
import { speechUrl } from '../../../shared/speech'
import type { LocalDictRow } from './types'

const lowerTerm = sql`lower(${dict.term})`

/** Row by id; null when absent. */
export async function getByDictId(db: Db, dictId: number): Promise<LocalDictRow | null> {
  return (await db.select().from(dict).where(eq(dict.dictId, dictId)).get()) ?? null
}

/** Row by term, case-insensitive; null when absent. */
export async function getByTerm(db: Db, term: string): Promise<LocalDictRow | null> {
  return (await db.select().from(dict).where(sql`${lowerTerm} = lower(${term})`).get()) ?? null
}

async function nextDictId(db: Db): Promise<number> {
  const row = await db.select({ m: max(dict.dictId) }).from(dict).get()
  return (row?.m ?? 0) + 1
}

/** Column values derived from an entry (phonetics + speech URLs). */
function entryColumns(e: EnViEntry): Omit<LocalDictRow, 'dictId' | 'term'> {
  return {
    ukPhonetic: e.ipaUK || null,
    usPhonetic: e.ipaUS || null,
    ukAudioUrl: speechUrl(e.word, 'uk'),
    usAudioUrl: speechUrl(e.word, 'us'),
    audioUrl: speechUrl(e.word, 'us'),
    entry: JSON.stringify(e),
  }
}

/**
 * Save (insert or overwrite) the entry for its term. An existing row with the same term in any case
 * keeps its id and spelling, so learning progress stays attached.
 */
export async function saveEntry(db: Db, e: EnViEntry): Promise<LocalDictRow> {
  const existing = await getByTerm(db, e.word)
  const cols = entryColumns(e)
  if (existing) {
    await db.update(dict).set(cols).where(eq(dict.dictId, existing.dictId)).run()
    return { ...existing, ...cols }
  }
  const row: LocalDictRow = { dictId: await nextDictId(db), term: e.word, ...cols }
  await db.insert(dict).values(row).run()
  return row
}

/**
 * Map each term to a dict id, creating placeholder rows (entry = null) for unknown terms.
 * Used when picking words from a word list before their entries are fetched. Keys are the input strings.
 */
export async function ensureTerms(db: Db, terms: readonly string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  const unique = [...new Set(terms.map((t) => t.trim()).filter(Boolean))]
  if (unique.length === 0) return result
  const lowered = [...new Set(unique.map((t) => t.toLowerCase()))]
  const existing = await db
    .select({ dictId: dict.dictId, term: dict.term })
    .from(dict)
    .where(inArray(lowerTerm, lowered))
    .all()
  const byLower = new Map(existing.map((r) => [r.term.toLowerCase(), r.dictId]))
  let next = await nextDictId(db)
  const inserts: LocalDictRow[] = []
  for (const term of unique) {
    const key = term.toLowerCase()
    if (!byLower.has(key)) {
      byLower.set(key, next)
      inserts.push({
        dictId: next++,
        term,
        ukPhonetic: null,
        usPhonetic: null,
        ukAudioUrl: speechUrl(term, 'uk'),
        usAudioUrl: speechUrl(term, 'us'),
        audioUrl: speechUrl(term, 'us'),
        entry: null,
      })
    }
  }
  for (let i = 0; i < inserts.length; i += 200) {
    await db.insert(dict).values(inserts.slice(i, i + 200)).run()
  }
  for (const t of terms) {
    const id = byLower.get(t.trim().toLowerCase())
    if (id != null) result.set(t, id)
  }
  return result
}

/** Number of dictionary rows (settings diagnostics). */
export async function cachedDictCount(db: Db): Promise<number> {
  return (await db.select({ n: count() }).from(dict).get())?.n ?? 0
}
