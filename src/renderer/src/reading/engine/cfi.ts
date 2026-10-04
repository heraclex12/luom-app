// CFI comparison and "which chapter does this cfi belong to" — the third entry point into vendor `epubcfi.js`
// (the others: foliateEngine builds the view, bookMeta extracts metadata). Pure functions with no DOM, so a
// static import is fine (the engine itself is dynamically imported because it registers custom elements).
// Chapter grouping and in-group ordering of highlights/bookmarks rely on these.
//
// `findTocItemByCfi` binary search copied from readest `apps/readest-app/src/services/nav/lookup.ts::findTocItemBS` (AGPL-3.0).
// @ts-expect-error untyped vendor ESM module
import * as CFI from '@/vendor/foliate-js/epubcfi.js'
import type { TocNode } from './foliateEngine'

const compare = (CFI as { compare: (a: string, b: string) => number }).compare
const collapse = (CFI as { collapse: (x: string, toEnd?: boolean) => string }).collapse

/** Compare two CFIs: <0 before, 0 equal, >0 after. Unparseable (malformed) CFIs compare equal so sorting never throws. */
export function compareCfi(a: string, b: string): number {
  try {
    return compare(a, b)
  } catch {
    return 0
  }
}

/**
 * Whether a cfi falls within a chapter's CFI range `[start, end)` (`end` null = last chapter, open to the end of the book).
 * Chapter bounds are each spine section's *start* CFI, so the right bound must be open: the next chapter's
 * start CFI belongs to the next chapter. Used to pick a chapter's highlights to redraw on entry (see Reader overlay redraw).
 */
export function isCfiInSection(cfi: string, start: string, end: string | null): boolean {
  return compareCfi(cfi, start) >= 0 && (end === null || compareCfi(cfi, end) < 0)
}

/**
 * Binary-search the TOC for the item a cfi belongs to (TOC items are ordered by `cfi`, i.e. document order).
 * Descends into children to return the deepest match; returns null if not found (cfi before the first chapter / TOC lacks cfi).
 */
export function findTocItemByCfi(toc: TocNode[], cfi: string): TocNode | null {
  if (!cfi) return null
  // TOC items without a cfi (missing href / unresolved) must be filtered out first: vendor `compare('', x)`
  // always returns -1 (doesn't throw), so leaving them in plants "always first" items in the sorted array and
  // the binary search can pick them over the correct chapter. TOCs are small, so filtering each time is cheap.
  const items = toc.filter((t) => t.cfi)
  let left = 0
  let right = items.length - 1
  let result: TocNode | null = null

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const item = items[mid]
    const comparison = compareCfi(item.cfi ?? '', cfi)
    if (comparison === 0) {
      return findInSubitems(item, cfi) ?? item
    } else if (comparison < 0) {
      result = findInSubitems(item, cfi) ?? item
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return result
}

function findInSubitems(item: TocNode, cfi: string): TocNode | null {
  if (!item.subitems.length) return null
  return findTocItemByCfi(item.subitems, cfi)
}

/** The two endpoints of a CFI range, always half-open `[start, end)` (same as the visible range / chapter range). */
export interface CfiRange {
  start: string
  end: string
}

/**
 * Split a (possibly range) CFI into `[start, end]` endpoint CFIs (vendor `collapse`; a non-range CFI yields equal ends).
 * relocate's `loc.cfi` is a "screen start → screen end" range CFI, so its endpoints are the visible range —
 * the header bookmark toggle / sidebar "current" check uses "bookmark cfi ∈ [start, end)" (same half-open rule as `isCfiInSection`).
 * Returns null if unparseable; never throws.
 */
export function cfiRangeEndpoints(cfi: string): CfiRange | null {
  try {
    return { start: collapse(cfi), end: collapse(cfi, true) }
  } catch {
    return null
  }
}
