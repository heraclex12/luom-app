// Finish screen recap (pure): derived from the session's own record of ratings, no extra queries.
import type { PlantStage } from '@/wordbook'

/** One thing that happened to a card this session: a rating (1 Again … 3 Good, 4 Easy) or Mark as known. */
export interface SessionEvent {
  dictId: number
  term: string
  rating: 1 | 2 | 3 | 4 | 'known'
  /** Seal stage just before and just after. */
  before: PlantStage
  after: PlantStage
}

export interface SessionRecap {
  /** Ratings given (a card rated twice counts twice). */
  reviewed: number
  /** Good or Easy. */
  good: number
  hard: number
  again: number
  /** Marked as known. */
  known: number
  /** Words that reached a new stage, first-seen order; `mastered` = marked as known (pressed seal). */
  grew: { dictId: number; term: string; stage: PlantStage; mastered: boolean }[]
}

/** Progress rank: a learned word moves off seed; thirsty → sprout is only watering, not a new stage. */
const RANK: Record<PlantStage, number> = { seed: 0, sprout: 1, thirsty: 1, bloom: 2 }

/**
 * Count the ratings, then per word compare where it started with where it ended: it grew if it ranks higher now
 * and its last event was a Good / Easy rating or Mark as known (a new word last rated Again isn't learned yet).
 */
export function sessionRecap(events: readonly SessionEvent[]): SessionRecap {
  const recap: SessionRecap = { reviewed: 0, good: 0, hard: 0, again: 0, known: 0, grew: [] }
  const words = new Map<number, { term: string; first: PlantStage; last: SessionEvent }>()
  for (const e of events) {
    if (e.rating === 'known') recap.known++
    else {
      recap.reviewed++
      if (e.rating >= 3) recap.good++
      else if (e.rating === 2) recap.hard++
      else recap.again++
    }
    const w = words.get(e.dictId)
    if (w) w.last = e
    else words.set(e.dictId, { term: e.term, first: e.before, last: e })
  }
  for (const [dictId, w] of words) {
    const done = w.last.rating === 'known' || w.last.rating >= 3
    if (done && RANK[w.last.after] > RANK[w.first]) {
      recap.grew.push({ dictId, term: w.term, stage: w.last.after, mastered: w.last.rating === 'known' })
    }
  }
  return recap
}
