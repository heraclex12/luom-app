// Garden rewards from the local DB: trophies (learned words per word list and collection), the chosen look, and which
// garden news was already shown (meta). Pure rules live in ./gardenRewards.
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { getMeta, setMeta } from '@/db/meta'
import { collection, collectionWord, dict, userWord } from '@/db/schema'
import { collectionTrophy, listTrophy, type GardenLook, type Trophy } from './gardenRewards'
import { bookTerms, fetchOfficialBooks } from './wordLists'

const META_TIER = 'garden.seenTier'
const META_SEEN = 'garden.seenNews'
const META_LOOK = 'garden.look'
const LOOKS: readonly GardenLook[] = ['auto', 'spring', 'summer', 'autumn', 'winter', 'night']

/** States that count as learned: past the first steps (2 Review, 3 Relearning, 4 Mastered). */
const LEARNED = [2, 3, 4]

export interface GardenExtras {
  trophies: Trophy[]
  look: GardenLook
  /** Last world announced (0 = seed patch). */
  tierSeen: number
  /** Visitor / trophy news already dismissed. */
  seen: string[]
}

export async function gardenExtras(db: Db): Promise<GardenExtras> {
  const [learnedRows, collections, tier, seen, look] = await Promise.all([
    db
      .select({ term: sql<string>`lower(${dict.term})` })
      .from(userWord)
      .innerJoin(dict, eq(dict.dictId, userWord.dictId))
      .where(and(eq(userWord.isDeleted, 0), inArray(userWord.state, LEARNED)))
      .all(),
    db
      .select({
        id: collection.collectionId,
        name: collection.name,
        total: sql<number>`count(${userWord.dictId})`,
        learned: sql<number>`sum(case when ${userWord.state} in (2, 3, 4) then 1 else 0 end)`,
      })
      .from(collection)
      .innerJoin(collectionWord, eq(collectionWord.collectionId, collection.collectionId))
      .innerJoin(userWord, and(eq(userWord.dictId, collectionWord.dictId), eq(userWord.isDeleted, 0)))
      .groupBy(collection.collectionId)
      .all(),
    getMeta(db, META_TIER),
    getMeta(db, META_SEEN),
    getMeta(db, META_LOOK),
  ])
  const learned = new Set(learnedRows.map((r) => r.term))
  const books = await fetchOfficialBooks()
  const trophies = [
    ...books.map((b) => listTrophy({ id: b.id, title: b.title, terms: bookTerms(b.id) }, learned)),
    ...collections.map((c) => collectionTrophy({ ...c, learned: Number(c.learned ?? 0) })),
  ].filter((t): t is Trophy => t !== null)
  return {
    trophies,
    look: LOOKS.includes(look as GardenLook) ? (look as GardenLook) : 'summer',
    tierSeen: Number(tier ?? '0') || 0,
    seen: parseList(seen),
  }
}

function parseList(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Remember a dismissed news item (`tier:N` moves the world mark; others join the seen list). */
export async function markNewsSeen(db: Db, key: string): Promise<void> {
  if (key.startsWith('tier:')) {
    const tier = Number(key.slice(5))
    const was = Number((await getMeta(db, META_TIER)) ?? '0') || 0
    if (tier > was) await setMeta(db, META_TIER, String(tier))
    return
  }
  const seen = parseList(await getMeta(db, META_SEEN))
  if (!seen.includes(key)) await setMeta(db, META_SEEN, JSON.stringify([...seen, key]))
}

export const setLook = (db: Db, look: GardenLook): Promise<void> => setMeta(db, META_LOOK, look)
