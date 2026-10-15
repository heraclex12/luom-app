// Play next (pure; tested in next.test.ts): one suggested game with a reason, and Surprise me, so the games list does
// not leave the learner choosing. Due words still being learned get a recognition game first (choose the meaning or
// the word); familiar due words are spelled or heard from memory; with nothing due, the learner uses the words
// (Write back, Say it) and then plays a quick drill. Within a kind, the game played longest ago comes next.
import { MIN_WORDS } from './game'
import type { KeyValue } from './common'

export type { KeyValue } from './common'

/** Everything the games list can open (review rounds, speak and write, quick drills). */
export type PlayId =
  | 'bridge'
  | 'tea'
  | 'fishing'
  | 'garden'
  | 'firefly'
  | 'frog'
  | 'write'
  | 'say'
  | 'pairs'
  | 'match'
  | 'unscramble'
  | 'lightning'
  | 'rain'
  | 'sound'

export type LastPlayed = Partial<Record<PlayId, number>>

export interface PlayNextInput {
  /** Words usable in a game (term + Vietnamese meaning). */
  ready: number
  /** Due now and still in learning steps (learning / relearning). */
  shaky: number
  /** Due now and in review (the learner has known them for a while). */
  steady: number
}

export interface Suggestion {
  id: PlayId
  reason: string
}

const RECOGNISE: PlayId[] = ['frog', 'fishing', 'garden']
const PRODUCE: PlayId[] = ['bridge', 'tea', 'firefly']
const REVIEW_ROUNDS: PlayId[] = [...RECOGNISE, ...PRODUCE]
const DRILLS: PlayId[] = ['match', 'unscramble', 'lightning', 'rain', 'sound']
const ALL_GAMES: PlayId[] = [...REVIEW_ROUNDS, ...DRILLS]

/** Written or spoken within this long counts as done for today. */
const USED_RECENTLY_MS = 20 * 3_600_000

const HOW: Partial<Record<PlayId, string>> = {
  frog: 'pick the meaning of each one',
  fishing: 'catch the word for each meaning',
  garden: 'water each plant by recalling its word',
  bridge: 'spell each one from memory',
  tea: 'spell each one from memory',
  firefly: 'pick out each one by its sound',
}

/** The candidate played longest ago (never played first); ties broken at random. */
function leastRecent(ids: readonly PlayId[], played: LastPlayed, random: () => number): PlayId {
  const oldest = Math.min(...ids.map((id) => played[id] ?? 0))
  const tied = ids.filter((id) => (played[id] ?? 0) === oldest)
  return tied[Math.min(tied.length - 1, Math.floor(random() * tied.length))]!
}

/** The game to play next and why; null when there are too few words to play. */
export function suggestGame(input: PlayNextInput, played: LastPlayed, now: number, random: () => number = Math.random): Suggestion | null {
  if (input.ready < MIN_WORDS) return null
  const due = input.shaky + input.steady
  if (due > 0) {
    const are = due === 1 ? `1 word is due` : `${due} words are due`
    if (input.shaky * 2 >= due) {
      const id = leastRecent(RECOGNISE, played, random)
      const which = input.steady === 0 ? (due === 1 ? 'still new to you' : 'all still new to you') : 'most still new to you'
      return { id, reason: `${are}, ${which}. Start easy: ${HOW[id]}.` }
    }
    const id = leastRecent(PRODUCE, played, random)
    const which = input.shaky === 0 ? (due === 1 ? 'it' : 'them') : 'most of them'
    return { id, reason: `${are} and you know ${which}. Make ${due === 1 ? 'it' : 'them'} stick: ${HOW[id]}.` }
  }
  const usedToday = (id: PlayId): boolean => now - (played[id] ?? 0) < USED_RECENTLY_MS
  if (!usedToday('write')) return { id: 'write', reason: 'Nothing is due right now. Write a reply with your words: using them is how they become yours.' }
  if (!usedToday('say')) return { id: 'say', reason: 'Nothing is due right now. Say your words out loud to train your speaking.' }
  return { id: leastRecent(DRILLS, played, random), reason: 'Nothing is due and you have practised today. A quick drill keeps your words fresh.' }
}

/** A random game: a review round while words are due (the answers count), otherwise any game; never the last one played. */
export function surpriseGame(input: PlayNextInput, played: LastPlayed, random: () => number = Math.random): PlayId | null {
  if (input.ready < MIN_WORDS) return null
  const pool = input.shaky + input.steady > 0 ? REVIEW_ROUNDS : ALL_GAMES
  const last = Object.entries(played).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0]
  const options = pool.filter((id) => id !== last)
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))]!
}

// ── when each game was last opened (this Mac only) ──

const LAST_PLAYED_KEY = 'envi.games.lastPlayed'
const PLAY_IDS = new Set<string>([...ALL_GAMES, 'write', 'say', 'pairs'])

function defaultStore(): KeyValue | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readLastPlayed(store: KeyValue | null = defaultStore()): LastPlayed {
  try {
    const raw = JSON.parse(store?.getItem(LAST_PLAYED_KEY) ?? '{}') as unknown
    if (typeof raw !== 'object' || raw === null) return {}
    return Object.fromEntries(
      Object.entries(raw).filter(([k, v]) => PLAY_IDS.has(k) && typeof v === 'number' && Number.isFinite(v)),
    ) as LastPlayed
  } catch {
    return {}
  }
}

export function markPlayed(id: PlayId, now: number, store: KeyValue | null = defaultStore()): void {
  try {
    store?.setItem(LAST_PLAYED_KEY, JSON.stringify({ ...readLastPlayed(store), [id]: now }))
  } catch {
    /* storage unavailable: suggestions just rotate less */
  }
}
