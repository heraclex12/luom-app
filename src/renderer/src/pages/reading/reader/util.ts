/** Pure display helpers shared by reader panels (truncation, dates, page labels, highlight classes). */
import { cn } from '@/lib/cn'
import { HIGHLIGHT_PALETTE } from './constants'
import { isCfiInSection, type CfiRange, type HighlightColor, type HighlightStyle } from '@/reading'

/** Truncate text into a short title for bookmark/highlight lists. */
export function snippet(text: string, max = 48): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

/** Epoch ms of local midnight for a given moment. */
function localMidnight(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Creation date (YYYY-MM-DD, local time): the small line on highlight/bookmark items. */
export function formatDay(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Relative date (like readest's "N days ago"): based on **local calendar-day difference**, not a rolling 24h window,
 * otherwise something marked at 23:00 last night would show "Today" at 08:00. Display only; device clock is fine.
 */
export function relativeDay(ms: number): string {
  const days = Math.max(0, Math.round((localMidnight(Date.now()) - localMidnight(ms)) / 86400000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

/**
 * Page number -> display label "p N"; null (pagination not ready / CFI unresolved) shows no label.
 * No clamping: pages come from the pagination map and are always within [1, total] (see reading/engine/paginationMap).
 */
export function pageLabel(page: number | null): string | null {
  return page == null ? null : `p ${page}`
}

/**
 * Bottom-right page indicator: always `x / y` (spaces around the slash, like readest).
 * **Shown only when both current and total pages are known**; otherwise falls back to book percentage, so
 * we never flash something like `12 / null` before the total is filled in.
 */
export function pageIndicatorLabel(
  currentPage: number | null,
  totalPages: number | null,
  fraction: number,
): string {
  if (currentPage != null && totalPages != null) return `${currentPage} / ${totalPages}`
  return `${Math.round(fraction * 100)}%`
}

/**
 * Items within the visible range of the current screen: the **single shared rule** for the header bookmark toggle
 * and the "current" marker on sidebar bookmarks / highlights. Every item on screen matches, not just the nearest.
 *
 * `range` is the range-CFI endpoints from engine relocate (`engine.visibleCfiRange()`, start = first char on screen);
 * the rule is `cfi ∈ [start, end)`, independent of page numbers, so it stays exact after reflow.
 * The half-open rule matches section assignment for highlights, so we reuse `isCfiInSection` from `@/reading`.
 * Bookmark CFIs are range CFIs (start = first char on screen when created) and highlight CFIs are selection ranges;
 * `compareCfi` compares range CFIs by their start (vendor epubcfi.js:166), so items belong to the screen of their
 * **start**: a highlight starting on the previous screen and spilling into this one belongs to the previous screen.
 *
 * When `range` is null (engine hasn't reported a position yet), no item is on screen.
 */
export function itemsInRange<T extends { cfi: string }>(items: T[], range: CfiRange | null): T[] {
  if (!range) return []
  return items.filter((i) => isCfiInSection(i.cfi, range.start, range.end))
}

/** Style classes for highlighted text by color + style (fill / underline / squiggle). */
export function highlightTextClass(color: HighlightColor, style: HighlightStyle): string {
  const pal = HIGHLIGHT_PALETTE[color]
  return cn(
    'text-text-secondary',
    style === 'fill' && cn('rounded-[3px] px-0.5', pal.fill),
    style === 'underline' && cn('underline decoration-2 underline-offset-4', pal.line),
    style === 'wavy' && cn('underline decoration-wavy underline-offset-4', pal.line),
  )
}
