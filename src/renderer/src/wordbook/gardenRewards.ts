// Garden rewards beyond levels (pure): visitors that move in with a long streak (and stay), seasons and night once
// the garden is a sky kingdom (level 100), trophies for word lists and collections, and the news shown once when
// something new arrives. Worlds and islands themselves are in ./gardenWorld.
import { GARDEN_TIERS, gardenWorld } from './gardenWorld'

// ── Visitors ──

export type VisitorKind = 'hedgehog' | 'fox' | 'owl' | 'peacock' | 'turtle' | 'dragon'

export interface Visitor {
  kind: VisitorKind
  /** Best streak (days in a row) that brings it. */
  streak: number
  name: string
  /** What it does in the garden (UI copy). */
  about: string
}

export const VISITORS: readonly Visitor[] = [
  { kind: 'hedgehog', streak: 7, name: 'Hedgehog', about: 'Snuffles about the garden.' },
  { kind: 'fox', streak: 30, name: 'Fox', about: 'Trots round the island.' },
  { kind: 'owl', streak: 60, name: 'Owl', about: 'Keeps watch from its perch.' },
  { kind: 'peacock', streak: 100, name: 'Peacock', about: 'Shows off its tail.' },
  { kind: 'turtle', streak: 200, name: 'Turtle', about: 'Slow and steady, like your streak.' },
  { kind: 'dragon', streak: 365, name: 'Dragon', about: 'Flies round the garden: a whole year in a row!' },
]

/** Visitors living in the garden: every one whose streak was ever reached. */
export function visitorsFor(bestStreak: number): VisitorKind[] {
  return VISITORS.filter((v) => bestStreak >= v.streak).map((v) => v.kind)
}

export function nextVisitor(bestStreak: number): Visitor | null {
  return VISITORS.find((v) => bestStreak < v.streak) ?? null
}

// ── Seasons and night ──

export type GardenLook = 'auto' | 'spring' | 'summer' | 'autumn' | 'winter' | 'night'
export type ShownLook = Exclude<GardenLook, 'auto'>

/** Level from which the look can be chosen (the sky kingdom). */
export const LOOKS_LEVEL = 100

/** The look to draw. Auto: night from 7 pm to 6 am, otherwise the season of the month. */
export function lookFor(choice: GardenLook, level: number, now: Date): ShownLook {
  if (level < LOOKS_LEVEL) return 'summer'
  if (choice !== 'auto') return choice
  const h = now.getHours()
  if (h >= 19 || h < 6) return 'night'
  const m = now.getMonth()
  return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'
}

// ── Trophies ──

export type TrophyMedal = 'bronze' | 'silver' | 'gold'

export interface Trophy {
  /** Stable per list / collection (the medal can go up). */
  key: string
  medal: TrophyMedal
  title: string
  detail: string
}

/** Words learned from a list before its bronze trophy. */
const BRONZE_WORDS = 100
/** A collection needs at least this many words to count. */
const COLLECTION_MIN = 10

/** Learned = studied past the first steps (in review, relearning or mastered); `learned` holds lower-case terms. */
export function listTrophy(book: { id: number; title: string; terms: readonly string[] }, learned: ReadonlySet<string>): Trophy | null {
  const total = book.terms.length
  const n = book.terms.filter((t) => learned.has(t.toLowerCase())).length
  if (total === 0) return null
  const medal: TrophyMedal | null = n === total ? 'gold' : n >= total / 2 ? 'silver' : n >= Math.min(BRONZE_WORDS, total) ? 'bronze' : null
  if (!medal) return null
  return { key: `list:${book.id}`, medal, title: book.title, detail: n === total ? `All ${total} words learned` : `${n} of ${total} words learned` }
}

export function collectionTrophy(c: { id: number; name: string; total: number; learned: number }): Trophy | null {
  if (c.total < COLLECTION_MIN || c.learned < c.total) return null
  return { key: `col:${c.id}`, medal: 'gold', title: c.name, detail: `All ${c.total} words learned` }
}

// ── News ──

export interface GardenNews {
  /** Remembered once dismissed. */
  key: string
  /** What grows in on the garden while it is shown (see gardenLayout's reveal keys). */
  reveal: string
  /** Small handwritten line above the title. */
  note: string
  title: string
  body: string
}

const article = (name: string): string => (/^[aeiou]/i.test(name) ? 'an' : 'a')

/**
 * Unseen news, oldest kind first: the world just reached (only the current one), visitors that moved in, trophies won
 * or upgraded. Each is shown once, one at a time.
 */
export function gardenNews(s: {
  level: number
  tierSeen: number
  visitors: readonly VisitorKind[]
  trophies: readonly Trophy[]
  /** Keys of visitor and trophy news already dismissed. */
  seen: readonly string[]
}): GardenNews[] {
  const news: GardenNews[] = []
  const world = gardenWorld(s.level)
  if (world.tier > s.tierSeen) {
    const t = GARDEN_TIERS[world.tier]
    news.push({
      key: `tier:${world.tier}`,
      reveal: `tier:${world.tier}`,
      note: `Level ${s.level}!`,
      title: t.island ? `A new island joined your garden: ${t.name}` : `Your garden grew into ${article(t.name)} ${t.name.toLowerCase()}`,
      body: `${t.adds} Have a look around: drag to turn it.`,
    })
  }
  for (const v of VISITORS)
    if (s.visitors.includes(v.kind) && !s.seen.includes(`visitor:${v.kind}`))
      news.push({
        key: `visitor:${v.kind}`,
        reveal: `visitor:${v.kind}`,
        note: `${v.streak} days in a row!`,
        title: `${article(v.name) === 'an' ? 'An' : 'A'} ${v.name.toLowerCase()} moved in`,
        body: `${v.about} It stays in your garden for good.`,
      })
  for (const t of s.trophies) {
    const key = `trophy:${t.key}:${t.medal}`
    if (s.seen.includes(key)) continue
    news.push({
      key,
      reveal: `trophy:${t.key}`,
      note: t.detail,
      title: `${article(t.medal) === 'an' ? 'An' : 'A'} ${t.medal} trophy for “${t.title}”`,
      body: t.medal === 'gold' ? 'Every word learned. It stands in your garden now.' : 'It stands in your garden now, and turns gold when every word is learned.',
    })
  }
  return news
}
