// Page number = foliate location character ticks (one tick per SIZE_PER_LOC bytes), so it's layout-independent:
// changing font size / toggling the sidebar / resizing the window leaves page numbers and totals unchanged.
//
// Three notes:
// 1. Turning one screen may move the page by +0 / +1 / +2 (ticks are unrelated to screens) — by design, not a bug.
// 2. The single source of truth for page numbers app-wide is pageOfCfi (character-count domain, cached): the footer
//    uses the screen-start cfi from observe; bookmarks/highlights/notes use their own cfi — same function, same cache.
//    relocate's visual estimate (location.current) is only a placeholder until the screen start resolves; rendering
//    measurements (columns/pixels/renderer.page) must never feed page numbers. This note is the sole authority on that rule.
// 3. ⚠️ `loc.fraction` is measured at the **screen end** (vendor SectionProgress.getProgress nextSize); feeding it to
//    `pageOfFraction` for the current page lands one page late. Use `loc.location.current` only (via `observe` placeholder).

/** Must match the sizePerLoc hard-coded in vendor view.js when opening a book; change both together. */
const SIZE_PER_LOC = 1500

/**
 * Chapter start fractions are `byte sum ÷ sizeTotal`; multiplying back by sizeTotal leaves float noise (`(3/7) × 7000 = 2999.999…`),
 * and a bare `floor` would put positions exactly on a tick boundary one page low, diverging from observe's integer math.
 * Page granularity is 1/1500 ≈ 6.7e-4, so 1e-6 absorbs only the noise.
 */
const LOC_EPSILON = 1e-6

/** Page-number query surface (as seen by the presentation layer via the engine facade). */
export interface PaginationMap {
  /** Ready as soon as the book opens; no convergence period. Always false for fixed layout (PDF), which has no location domain. */
  readonly ready: boolean
  /** Layout-independent; exact on open and never changes. */
  readonly totalPages: number | null
  readonly currentPage: number | null
  /**
   * A position within a chapter needs that chapter's characters counted (engine `getCFIProgress`, 100–300ms async for a cold
   * chapter), so it **answers first, corrects later**: the first query for a cfi synchronously returns the chapter's start page and
   * queues resolution; once resolved it's cached and `onChange` fires so the UI re-renders with the final value.
   * The cache never invalidates — locations are layout-independent, so font / column changes needn't clear it.
   */
  pageOfCfi(cfi: string): number | null
  pageOfFraction(fraction: number): number | null
  /** Returns an unsubscribe function. */
  onChange(cb: () => void): () => void
}

/** Control surface on the engine adapter side (not exposed to pages). */
export interface PaginationMapControl extends PaginationMap {
  /**
   * @param sectionFractions `view.getSectionFractions()`, length = section count + 1
   * @param sizeTotal sum of unpacked bytes of linear sections; must match vendor SectionProgress
   *   — empty array or 0 = no location domain (fixed layout)
   */
  reset(sectionFractions: readonly number[], sizeTotal: number): void
  /**
   * Fed on every relocate. `startCfi` is the screen-start CFI (start of the visible range), `current` is the 0-based
   * screen-start tick from the visual estimate, `atEnd` is `renderer.atEnd`; see note 2 in the file header for priorities.
   * Pass null when the screen-start cfi can't be resolved.
   */
  observe(loc: { current: number; atEnd: boolean; startCfi: string | null }): void
}

export interface PaginationMapDeps {
  /** Synchronous, pure CFI parse; null if unresolvable. */
  sectionIndexOfCfi(cfi: string): number | null
  /** Async: engine getCFIProgress → location.current + 1; null if unresolvable. */
  pageOfCfiAsync(cfi: string): Promise<number | null>
}

export function createPaginationMap(deps: PaginationMapDeps): PaginationMapControl {
  /** Start fraction of each section in the whole book, length = section count + 1 (last is 1); empty = not ready. */
  let starts: number[] = []
  let sizeTotal = 0
  let cur: { current: number; atEnd: boolean; startCfi: string | null } | null = null

  const listeners = new Set<() => void>()
  const emit = (): void => listeners.forEach((cb) => cb())

  // A null value means resolution failed; record it too, otherwise every render would re-queue it.
  const pageByCfi = new Map<string, number | null>()
  const queue: string[] = []
  const queued = new Set<string>()
  let draining = false

  const isReady = (): boolean => starts.length >= 2 && sizeTotal > 0
  const total = (): number | null => (isReady() ? Math.ceil(sizeTotal / SIZE_PER_LOC) : null)
  /** +1 overflows by one tick when the book ends exactly on a tick, so clamp. Call only when ready. */
  const clamp = (page: number): number => Math.max(1, Math.min(total() ?? 1, page))

  // Run serially: the sidebar renders dozens of rows at once, and parallel resolution would build dozens of chapter DOMs.
  // drain is the only writer of pageByCfi, and `queued` prevents duplicate enqueues, so no overwrite guard is needed.
  const drain = async (): Promise<void> => {
    if (draining) return
    draining = true
    try {
      for (let cfi = queue.shift(); cfi !== undefined; cfi = queue.shift()) {
        let page: number | null = null
        try {
          page = await deps.pageOfCfiAsync(cfi)
        } catch {
          page = null
        }
        pageByCfi.set(cfi, page == null ? null : clamp(page))
        queued.delete(cfi)
        // Broadcast immediately when the screen start resolves (the footer is waiting); batch the rest until the queue drains.
        if (queue.length === 0 || cfi === cur?.startCfi) emit()
      }
    } finally {
      draining = false
    }
  }

  /**
   * Queue resolution of a cfi's in-chapter page. Skipped if already cached (including failed nulls) or queued.
   * `urgent` = screen start: jump the queue, otherwise the footer waits behind dozens of sidebar bookmarks.
   */
  const enqueue = (cfi: string | null, urgent = false): void => {
    if (!cfi || pageByCfi.has(cfi) || queued.has(cfi)) return
    queued.add(cfi)
    if (urgent) queue.unshift(cfi)
    else queue.push(cfi)
    void drain()
  }

  /** Current-page priority (see note 2 in the file header): end-of-book clamp > exact screen-start cfi count > visual estimate placeholder. */
  const pageOfCur = (at: typeof cur): number | null => {
    if (!isReady() || at == null) return null
    if (at.atEnd) return total()
    const exact = at.startCfi == null ? undefined : pageByCfi.get(at.startCfi)
    return exact ?? clamp(at.current + 1)
  }

  function pageOfFraction(fraction: number): number | null {
    if (!isReady() || !Number.isFinite(fraction)) return null
    const f = Math.min(1, Math.max(0, fraction))
    return clamp(Math.floor((f * sizeTotal) / SIZE_PER_LOC + LOC_EPSILON) + 1)
  }

  return {
    get ready() {
      return isReady()
    },
    get totalPages() {
      return total()
    },
    get currentPage() {
      return pageOfCur(cur)
    },
    pageOfFraction,

    pageOfCfi(cfi) {
      if (!isReady() || !cfi) return null
      const cached = pageByCfi.get(cfi)
      if (cached != null) return cached
      enqueue(cfi) // show the chapter's start page until resolved
      const index = deps.sectionIndexOfCfi(cfi)
      if (index == null || index < 0 || index >= starts.length - 1) return null
      return pageOfFraction(starts[index])
    },

    onChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    reset(sectionFractions, newSizeTotal) {
      // Fewer than two entries (less than one section) or no size domain: no page numbers.
      if (sectionFractions.length < 2 || !(newSizeTotal > 0)) {
        starts = []
        sizeTotal = 0
      } else {
        starts = sectionFractions.map((x) => Math.min(1, Math.max(0, x)))
        starts[starts.length - 1] = 1
        sizeTotal = newSizeTotal
      }
      cur = null
      pageByCfi.clear()
      queue.length = 0
      queued.clear()
      emit()
    },

    observe(loc) {
      if (!isReady()) return
      // Broadcast only when the **displayed value** changes: during reflow relocate repeatedly reports the same screen
      // differently (same current, different startCfi, etc.); diffing the raw triple would re-render the reader needlessly.
      const before = pageOfCur(cur)
      cur = { current: loc.current, atEnd: loc.atEnd, startCfi: loc.startCfi }
      enqueue(loc.startCfi, true)
      if (pageOfCur(cur) !== before) emit()
    },
  }
}
