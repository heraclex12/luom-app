/**
 * Chapter timeline: bakes the engine's sentence list into a virtual audio timeline.
 * Pure, no DOM. Duration estimate, in order of trust: measured (applyMeasuredDuration) > per-voice
 * calibrated char rate (updateCalibration) > script default rate. Fixed sentence/paragraph gaps.
 */
import { isCjk, normalizeSynthText } from './align'

/** Fixed sentence / paragraph gaps (seconds at rate 1.0; scaled by playback rate). */
export const SENTENCE_GAP = 0.28
export const PARAGRAPH_GAP = 0.62

/** Default speaking rates (typical for Edge neural voices): English by word, CJK by character. */
const WORDS_PER_SECOND_EN = 2.6
const CHARS_PER_SECOND_ZH = 4.5
/** Minimum for very short sentences: synthesized audio has startup overhead. */
const MIN_SENTENCE_SEC = 0.4
/** Trust calibration only after this many characters (small samples are noisy). */
const CALIBRATION_MIN_CHARS = 40

/** Worth sending to Edge? Pure-symbol separators (***, — · —) always fail, so filter them out. */
export function isSpeakable(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text)
}

/** Accumulated measured rate for a voice (chars / seconds = char rate). */
export interface VoiceCalibration {
  chars: number
  seconds: number
}

/** Voice id → calibration. Held by the hook, survives across chapter sessions (in-memory). */
export type CalibrationMap = Map<string, VoiceCalibration>

/** Record a measured sentence (accumulate, not overwrite). Skips non-positive durations / empty text. */
export function updateCalibration(
  map: CalibrationMap,
  voiceId: string,
  text: string,
  measuredSec: number,
): void {
  if (!(measuredSec > 0)) return
  const chars = normalizeSynthText(text).length
  if (!chars) return
  const cur = map.get(voiceId) ?? { chars: 0, seconds: 0 }
  map.set(voiceId, { chars: cur.chars + chars, seconds: cur.seconds + measuredSec })
}

/** Unclamped estimate: calibrated voice rate if trusted, else script default (CJK by char, English by word). */
function rawDuration(t: string, cal: VoiceCalibration | undefined): number {
  if (cal && cal.chars >= CALIBRATION_MIN_CHARS && cal.seconds > 0) {
    return t.length / (cal.chars / cal.seconds)
  }
  if (isCjk(t)) {
    return t.replace(/\s/g, '').length / CHARS_PER_SECOND_ZH
  }
  return t.split(/\s+/).filter(Boolean).length / WORDS_PER_SECOND_EN
}

/** Estimated seconds to read a sentence (rate 1.0). The minimum is applied only here. */
export function estimateDuration(
  text: string,
  voiceId: string,
  calibration: CalibrationMap,
): number {
  const t = normalizeSynthText(text)
  return Math.max(MIN_SENTENCE_SEC, rawDuration(t, calibration.get(voiceId)))
}

/** A timeline sentence: offset = start (s), gap = gap before the next sentence (0 for the last). */
export interface TimelineSentence {
  index: number
  text: string
  blockIndex: number
  offset: number
  duration: number
  /** Whether backfilled with the measured audio duration (never overwritten afterwards). */
  measured: boolean
  gap: number
}

/** Timeline input: sentence content and ownership; timing fields are filled by `buildTimeline`. */
type TimelineItem = Pick<TimelineSentence, 'text' | 'blockIndex'>

/** Bake sentences into a timeline: sentence gap within a block, paragraph gap across blocks, none after the last. */
export function buildTimeline(
  items: readonly TimelineItem[],
  estimate: (item: TimelineItem) => number,
): TimelineSentence[] {
  const out: TimelineSentence[] = []
  let at = 0
  items.forEach((it, i) => {
    const next = items[i + 1]
    const gap = next ? (next.blockIndex === it.blockIndex ? SENTENCE_GAP : PARAGRAPH_GAP) : 0
    const duration = estimate(it)
    out.push({
      index: i,
      text: it.text,
      blockIndex: it.blockIndex,
      offset: at,
      duration,
      measured: false,
      gap,
    })
    at += duration + gap
  })
  return out
}

/**
 * Backfill a sentence with its measured audio duration and recompute later offsets.
 * Already-measured sentences aren't overwritten; invalid durations (NaN/≤0) return the same reference.
 *
 * Only this sentence onward changes: the prefix is reused by reference to keep object identity stable.
 */
export function applyMeasuredDuration(
  timeline: readonly TimelineSentence[],
  index: number,
  seconds: number,
): readonly TimelineSentence[] {
  const target = timeline[index]
  if (!target || target.measured || !Number.isFinite(seconds) || seconds <= 0) return timeline
  const out = timeline.slice(0, index)
  let at = target.offset
  for (let i = index; i < timeline.length; i++) {
    const s = timeline[i]!
    const duration = i === index ? seconds : s.duration
    out.push({ ...s, duration, measured: s.measured || i === index, offset: at })
    at += duration + s.gap
  }
  return out
}

/** Total timeline duration (until the last sentence ends, excluding its trailing gap). */
export function totalDuration(timeline: readonly TimelineSentence[]): number {
  const last = timeline[timeline.length - 1]
  return last ? last.offset + last.duration : 0
}

/**
 * Chapter time → sentence index: binary search for the last `offset ≤ time`. Time in a trailing gap
 * counts as the previous sentence (no early highlight jump); out of range clamps; empty → -1.
 */
export function sentenceIndexAtTime(timeline: readonly TimelineSentence[], timeSec: number): number {
  if (!timeline.length) return -1
  let lo = 0
  let hi = timeline.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (timeline[mid]!.offset <= timeSec) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}
