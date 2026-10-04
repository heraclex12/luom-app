/**
 * Long-lived reader display constants: highlighter palette and fixed typography, shared across the reader.
 *
 * Body content, pagination and TOC are handled by the foliate engine (via the `@/reading` facade).
 */
import type { HighlightColor, HighlightStyle, OverlayStyle } from '@/reading'
import type { FixedTypography } from './types'

// ─────────────────────────── Highlighter palette (mapped to CDS chip semantic tokens) ───────────────────────────

/**
 * Highlighter presets, expressed with CDS chip semantic tokens (auto light/dark).
 * fill: background fill; line: underline/squiggle color; swatch: color-picker dot.
 */
export const HIGHLIGHT_PALETTE: Record<
  HighlightColor,
  { label: string; fill: string; line: string; swatch: string }
> = {
  yellow: { label: 'Yellow', fill: 'bg-bg-warning-chip', line: 'decoration-warning-200', swatch: 'bg-bg-warning-chip ring-border-warning' },
  green: { label: 'Green', fill: 'bg-bg-success-chip', line: 'decoration-success-200', swatch: 'bg-bg-success-chip ring-border-success' },
  blue: { label: 'Blue', fill: 'bg-bg-accent-chip', line: 'decoration-accent-200', swatch: 'bg-bg-accent-chip ring-border-accent' },
  red: { label: 'Red', fill: 'bg-bg-danger-chip', line: 'decoration-danger-200', swatch: 'bg-bg-danger-chip ring-border-danger' },
}

export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'red']

/**
 * Literal highlight colors used on the **engine-rendered body**: foliate draws highlights as an SVG overlay
 * inside the book iframe (opacity .3 + mix-blend), where Tailwind token classes can't reach, so concrete CSS colors are needed.
 * Uses Tailwind's 400 shades (same as readest, close to the chip colors above).
 */
export const HIGHLIGHT_INK: Record<HighlightColor, string> = {
  yellow: '#facc15',
  green: '#4ade80',
  blue: '#60a5fa',
  red: '#f87171',
}

/**
 * Literal color for the read-aloud current-sentence highlight on the engine body (same constraint as above).
 * Tailwind sky-400: a bit more cyan than highlighter blue (blue-400), so a sentence that is both
 * highlighted blue and being read still shows two distinct layers.
 * opacity/mix-blend use the overlayer defaults (.3 + normal).
 * Single value for both themes, so it lives here rather than in system.css.
 */
export const TTS_HIGHLIGHT_INK = '#38bdf8'

/** Highlight style -> foliate overlayer style (shared by new highlights and redraw on open). */
export const OVERLAY_STYLE: Record<HighlightStyle, OverlayStyle> = {
  fill: 'highlight',
  underline: 'underline',
  wavy: 'squiggly',
}

// ─────────────────────────── Fixed typography ───────────────────────────

/** Read a numeric CDS --reading-* token (falls back if styles aren't ready). See styles/system.css. */
function readingToken(name: string, fallback: number): number {
  if (typeof document === 'undefined') return fallback
  const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(n) ? n : fallback
}

/**
 * Typography **hard-coded** for now: line height / paragraph spacing / line width / margins / columns / justify / hyphenation.
 * Numeric values read CDS `--reading-*` tokens (styles/system.css); the parameters exist but aren't user-adjustable yet.
 *
 * The two user-adjustable values (font size / family) live in `user_setting`, read via `@/settings`.
 */
export function getFixedTypography(): FixedTypography {
  return {
    lineHeight: readingToken('--reading-line-height', 1.6),
    maxWidth: readingToken('--reading-measure', 720),
    justify: false,
    paragraphSpacing: readingToken('--reading-para-gap', 12),
    marginPx: readingToken('--reading-margin-x', 48),
    hyphenate: false,
    // Double = max-column-count 2: two columns on wide screens, one on narrow (foliate's adaptive default).
    columns: 'double',
  }
}

/**
 * Bottom band height in px: must equal the `h-12` of `chrome/ReaderFooterBar.tsx`'s root (keep in sync;
 * no compile-time guard). The page number lives on the right of this band (readest's `marginBottomPx` model, see PageIndicator),
 * and the footer bar covers the whole band when shown.
 * The paginator's margin-bottom must be at least this so the page number never overlaps the last line.
 * Actual bottom margin = `max(user margin, this)`, so a larger user margin is never narrower at the bottom.
 */
const BOTTOM_BAND_PX = 48

/**
 * Read-aloud mini bar height in px: must equal the `h-14` row in `tts/TtsBarPlayer.tsx`. A constant rather than
 * a DOM measurement because the body must make room on the same frame playback starts (readest hard-codes 56 too).
 */
const TTS_BAR_HEIGHT_PX = 56

/**
 * Body bottom margin in px: the paginator's `margin-bottom` (set only via `applyAppearance`).
 *
 * Base = `max(user margin, band height)`: the band holds the page number. During a read-aloud session the mini
 * bar height is added on top (48 + 56 = 104), since the bar sits above the band as an extra layer,
 * so it is added **outside** the max.
 *
 * Room is based on the bar's **resting** position: when the footer appears the bar lifts 8px, but reflowing for an
 * overlay would make the body jitter on hover, so reflow is driven only by session start/stop (same trade-off as readest).
 */
export function readerMarginBottomPx(marginPx: number, ttsActive: boolean): number {
  return Math.max(marginPx, BOTTOM_BAND_PX) + (ttsActive ? TTS_BAR_HEIGHT_PX : 0)
}
