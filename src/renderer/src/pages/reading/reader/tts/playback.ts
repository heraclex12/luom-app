/**
 * Player readouts: turns elapsed seconds / total duration into what the player displays.
 * Computed every frame while playing, so all clamping and divide-by-zero guards live here.
 */

export interface PlaybackLabels {
  /** Elapsed time, `m:ss` / `h:mm:ss`. */
  elapsed: string
  /** Remaining time, always with a minus prefix (`-3:45`). */
  remaining: string
  /** Played fraction 0–100, used as progress width; NOT rounded, or the bar steps at low speeds. */
  percent: number
}

/** Format seconds as `m:ss` / `h:mm:ss`. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`
}

/** Slider value (0–100) → seconds within the chapter, clamped. */
export function percentToSeconds(percent: number, durationSec: number): number {
  const total = Math.max(0, durationSec)
  return Math.min(Math.max(0, (percent / 100) * total), total)
}

/**
 * Buffered (synthesized, not yet played) fraction 0–100.
 * Take the max: the synthesized ratio is a separate estimate and could lag behind the playhead,
 * which would make the buffer appear behind what's already played.
 */
export function bufferedPercent(playedPercent: number, measuredFraction: number): number {
  const measured = Math.min(Math.max(0, measuredFraction), 1) * 100
  return Math.max(playedPercent, measured)
}

export function playbackLabels(elapsedSec: number, durationSec: number): PlaybackLabels {
  const total = Math.max(0, durationSec)
  const played = Math.min(Math.max(0, elapsedSec), total)
  return {
    elapsed: formatClock(played),
    remaining: `-${formatClock(total - played)}`,
    percent: total > 0 ? (played / total) * 100 : 0,
  }
}

/** Rate 0.5–3×, default 1.0. 0.05 steps so 0.75 / 1.25 / 1.75 are reachable. */
export const RATE_MIN = 0.5
export const RATE_MAX = 3
export const RATE_STEP = 0.05

/** `1×` / `1.25×`, without pointless trailing zeros like `1.00×`. */
export function formatRate(rate: number): string {
  return `${parseFloat(rate.toFixed(2))}×`
}

/** The values the player actually displays (a structural subset of the session snapshot). */
export interface DisplayedPlayback {
  status: string
  sentenceIndex: number
  elapsed: number
  duration: number
  bufferedFraction: number
  repeating: boolean
  rate: number
}

/** Time display precision: 0.1s. */
const TIME_QUANTUM = 0.1
/** Buffer display precision: 1/1000 (about one pixel on a 1000px bar). */
const FRACTION_QUANTUM = 0.001

const sameAt = (a: number, b: number, quantum: number): boolean =>
  Math.round(a / quantum) === Math.round(b / quantum)

/**
 * Do two snapshots look the same in the player? Session time callbacks are rAF-driven (~60Hz),
 * but displayed values are much coarser; quantizing avoids re-rendering every frame. No previous frame → different.
 */
export function sameDisplayedPlayback(
  prev: DisplayedPlayback | null,
  next: DisplayedPlayback,
): boolean {
  return (
    prev !== null &&
    prev.status === next.status &&
    prev.sentenceIndex === next.sentenceIndex &&
    prev.duration === next.duration &&
    prev.repeating === next.repeating &&
    prev.rate === next.rate &&
    sameAt(prev.elapsed, next.elapsed, TIME_QUANTUM) &&
    sameAt(prev.bufferedFraction, next.bufferedFraction, FRACTION_QUANTUM)
  )
}
