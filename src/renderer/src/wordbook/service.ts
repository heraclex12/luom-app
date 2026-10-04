// Fill missing entries: words in my list whose dict row is absent or still a placeholder (picked from a word list
// before being fetched). Best-effort and background: offline / errors stop the pass quietly; the next pass resumes
// (the missing set is recomputed every time, so no progress state is needed).
import { and, count, eq, isNull, or } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { dict, userWord } from '@/db/schema'
import { dictionaryBridge } from '@/platform'
import { getByDictId, saveEntry } from '@/dict/dict'

/** Pause between requests so a big list does not hammer the free endpoints. */
const DEFAULT_PACE_MS = 400

let filling = false

/** Words in my list (not deleted) whose dict content is missing. */
function missingWhere() {
  return and(eq(userWord.isDeleted, 0), or(isNull(dict.dictId), isNull(dict.entry)))
}

export async function missingDictIds(db: Db): Promise<number[]> {
  const rows = await db
    .select({ dictId: userWord.dictId })
    .from(userWord)
    .leftJoin(dict, eq(dict.dictId, userWord.dictId))
    .where(missingWhere())
    .orderBy(userWord.joinTime, userWord.dictId)
    .all()
  return rows.map((r) => r.dictId)
}

export async function missingDictCount(db: Db): Promise<number> {
  return (
    (
      await db
        .select({ n: count() })
        .from(userWord)
        .leftJoin(dict, eq(dict.dictId, userWord.dictId))
        .where(missingWhere())
        .get()
    )?.n ?? 0
  )
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Fetch entries for every missing word, one by one. A not-found word gets an empty entry (so it is not retried
 * forever); the first network failure ends the pass. Single-flight.
 */
export async function fillMissingDict(db: Db, paceMs = DEFAULT_PACE_MS): Promise<void> {
  if (filling) return
  filling = true
  try {
    for (const dictId of await missingDictIds(db)) {
      const row = await getByDictId(db, dictId)
      if (!row) continue // no term to look up (should not happen: rows are created before words are added)
      let res
      try {
        res = await dictionaryBridge.lookup(row.term)
      } catch {
        return // offline: resume next time
      }
      await saveEntry(
        db,
        res.status === 'found'
          ? res.entry
          : {
              word: row.term,
              ipaUK: '',
              ipaUS: '',
              translation: '',
              meanings: [],
              definitions: [],
              examples: [],
              synonyms: [],
              source: 'web',
            },
      )
      if (paceMs > 0) await sleep(paceMs)
    }
  } finally {
    filling = false
  }
}
