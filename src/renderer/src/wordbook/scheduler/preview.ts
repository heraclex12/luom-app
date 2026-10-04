// Next-interval preview for the rating buttons: ts-fsrs repeat() gives the next due date for each
// grade, formatted with Anki's answer-button rules (rslib/scheduler/timespan.rs answer_button_time):
// "<" only below one minute; seconds/minutes/days rounded, hours/months/years to one decimal. Text only, no UI.
import { previewDueDates, type RateGrade } from './fsrs'
import type { WordRecord } from '../types'
import { Rating } from 'ts-fsrs'

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const YEAR = 365 * DAY
const MONTH = YEAR / 12 // = 365/12 days, same as Anki's MONTH

/** One decimal place (rounded, always one digit, e.g. 2 → "2.0"). */
function oneDecimal(x: number): string {
  return (Math.round(x * 10) / 10).toFixed(1)
}

/**
 * Interval (ms) → short duration label (Anki answer-button rules):
 * <1m / Xm / X.Xh / Xd / X.Xmo / X.Xy.
 */
export function formatInterval(ms: number): string {
  if (ms < MIN) return '<1m'
  if (ms < HOUR) return `${Math.round(ms / MIN)}m`
  if (ms < DAY) return `${oneDecimal(ms / HOUR)}h`
  const days = ms / DAY
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) return `${oneDecimal(ms / MONTH)}mo`
  return `${oneDecimal(ms / YEAR)}y`
}

export interface IntervalPreview {
  again: string
  hard: string
  good: string
}

/** Interval labels for the three grades (state=0 uses an empty card; state=4 is rejected, see fsrs.previewDueDates). */
export function previewIntervals(word: WordRecord, now: number): IntervalPreview {
  const due = previewDueDates(word, now)
  const fmt = (g: RateGrade): string => formatInterval(due[g] - now)
  return {
    again: fmt(Rating.Again),
    hard: fmt(Rating.Hard),
    good: fmt(Rating.Good),
  }
}
