// FSRS-6 wrapper (ts-fsrs@5.4.1): the only scheduling algorithm entry point.
// Pure: row ↔ Card mapping + thin next/repeat wrappers + guard assertions. No DB, session or UI.
// Deterministic across devices: enable_fuzz=false + explicit default params + due as epoch ms
// (stability/difficulty are rounded to 8 decimals). Pre-rating snapshots (pre_*) come from the ts-fsrs log.
import {
  createEmptyCard,
  FSRS,
  type CardInput,
  type FSRSParameters,
  type Grade,
  Rating,
  State,
} from 'ts-fsrs'
import type { ReviewLogInput, WordRecord } from '../types'

/**
 * Explicit FSRS-6 config (all equal to the library defaults). Never pass 0 for request_retention /
 * maximum_interval — the library uses `||` and would silently fall back. `w` is an explicit copy of
 * the 21 default weights; drift is caught by `expect(OUR_PARAMS).toEqual(generatorParameters({}))`
 * in scheduler.test.ts (fails on library upgrades).
 */
export const OUR_PARAMS: FSRSParameters = {
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
  w: [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
    0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
  ],
}

/** Three grades (same values as the library enum): Don't know → Again(1), Unsure → Hard(2), Know → Good(3). Easy is unused. */
export type RateGrade = Rating.Again | Rating.Hard | Rating.Good

const f = new FSRS(OUR_PARAMS)

/** Schedulable states (New/Learning/Review/Relearning). state=4 (Mastered) would make next()/repeat() silently return undefined. */
function assertSchedulable(state: number, where: string): void {
  if (state < State.New || state > State.Relearning) {
    throw new Error(`[fsrs] ${where}: state=${state} cannot be scheduled (only 0-3; state=4 must be filtered out earlier)`)
  }
}

/**
 * Row → CardInput (non-New rows only; state=0 uses createEmptyCard since due is NULL).
 * elapsed_days is a placeholder 0 (required by the type; the library recomputes it from last_review).
 */
function rowToCard(word: WordRecord): CardInput {
  return {
    due: word.due as number, // non-New rows always have due
    stability: word.stability,
    difficulty: word.difficulty,
    elapsed_days: 0,
    scheduled_days: word.scheduledDays,
    learning_steps: word.learningSteps,
    reps: word.reps,
    lapses: word.lapses,
    state: word.state as State,
    last_review: word.lastReview ?? undefined,
  }
}

/** Row (or New placeholder) → Card input at the current time. */
function toCardInput(word: WordRecord, now: number): CardInput {
  assertSchedulable(word.state, 'toCardInput')
  return word.state === State.New ? (createEmptyCard(now) as CardInput) : rowToCard(word)
}

export interface ScheduleResult {
  /** The full row after rating (dictId carried over). */
  next: WordRecord
  /** Log payload apart from dictId/rating/durationMs (reviewTime + pre-rating snapshot). */
  log: Pick<ReviewLogInput, 'reviewTime' | 'preState' | 'preStability' | 'preDifficulty'>
}

/**
 * Rate a card (the only next() wrapper): pre-rating row + now + grade → post-rating row + log snapshot.
 * Pure computation; persistence is batched in words.applyRating. state=4 throws via assertSchedulable.
 */
export function schedule(word: WordRecord, now: number, rating: RateGrade): ScheduleResult {
  const card = toCardInput(word, now)
  const { card: c, log } = f.next(card, now, rating as Grade)
  return {
    next: {
      dictId: word.dictId,
      due: c.due.getTime(),
      stability: c.stability,
      difficulty: c.difficulty,
      scheduledDays: c.scheduled_days,
      learningSteps: c.learning_steps,
      reps: c.reps,
      lapses: c.lapses,
      state: c.state,
      lastReview: c.last_review ? c.last_review.getTime() : null,
    },
    // The log's state/stability/difficulty are the pre-rating snapshot (ts-fsrs buildLog) → pre_*.
    log: {
      reviewTime: log.review.getTime(),
      preState: log.state,
      preStability: log.stability,
      preDifficulty: log.difficulty,
    },
  }
}

/**
 * Preview the next due time (epoch ms) for each grade (rating button labels) via one repeat() call.
 * Same mapping as schedule: state=0 uses createEmptyCard, state=4 is rejected.
 */
export function previewDueDates(word: WordRecord, now: number): Record<RateGrade, number> {
  const card = toCardInput(word, now)
  const rec = f.repeat(card, now)
  return {
    [Rating.Again]: rec[Rating.Again].card.due.getTime(),
    [Rating.Hard]: rec[Rating.Hard].card.due.getTime(),
    [Rating.Good]: rec[Rating.Good].card.due.getTime(),
  }
}
