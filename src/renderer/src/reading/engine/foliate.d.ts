// Hand-written thin types covering only the foliate `view.js` (vendor/foliate-js) API the reading adapter uses.
// The engine is untyped ESM; per vendor/foliate-js/VENDOR.md we don't modify vendor code or type it fully —
// just this slice on the adapter side. Fields are trimmed to what the adapter needs, added on demand to avoid drift.

/** `relocate` event detail (`lastLocation` from view.js `#onRelocate`). */
export interface FoliateLocation {
  /** Whole-book reading progress, 0–1. */
  fraction?: number
  /** Current location CFI (single source of truth for location; used for highlight/progress positioning). */
  cfi?: string
  /** Visible DOM Range of the current screen (passed through from `#onRelocate`; `cfi` is derived from it); read-aloud visibility checks compare against it. */
  range?: Range
  /** TOC item of the current chapter. */
  tocItem?: { label?: string; href?: string } | null
  /** Page info in paginated mode. */
  location?: { current?: number; next?: number; total?: number }
}

/** `load` event detail: the chapter iframe document (selection listeners attach here) + section index. */
export interface FoliateLoadDetail {
  doc: Document
  index: number
}

/** TOC item (foliate `book.toc`, parsed from EPUB nav / NCX): label + in-book href + children, arbitrarily nested. */
export interface FoliateTocItem {
  label?: string
  href?: string
  subitems?: FoliateTocItem[]
}

/**
 * `show-annotation` event detail: fired when an existing highlight is clicked (hitTest in view.js `#createOverlayer`).
 * `rect` is the highlight's bounding box in the **chapter iframe document's coordinates**; the adapter must add the
 * `frameElement` screen rect to get window coordinates.
 */
export interface FoliateShowAnnotationDetail {
  /** The highlight's overlay key (= the CFI `value` passed when created). */
  value: string
  /** Section index. */
  index: number
  rect?: { left: number; top: number; right: number; bottom: number }
}

/** `create-overlay` event detail: a chapter's overlay layer was just created (view.js `#createOverlayer`). */
export interface FoliateCreateOverlayDetail {
  /** Section index (spine order). */
  index: number
}

/**
 * `draw-annotation` event detail: foliate **doesn't draw** highlights itself; `addAnnotation` resolves the CFI to a range
 * and fires this event, and the app calls `draw(drawFn, options)` to decide how to draw (see view.js `addAnnotation`).
 */
export interface FoliateDrawAnnotationDetail {
  /** Draw with an overlayer brush (`Overlayer.highlight/underline/squiggly`) + options. */
  draw: (func: unknown, options?: Record<string, unknown>) => void
  /** The annotation object passed when creating the highlight (carries our custom style/color fields, passed through by foliate). */
  annotation: { value: string; [k: string]: unknown }
  doc: Document
  range: Range
}

/**
 * Highlight canvas inside one chapter iframe (foliate `Overlayer`): the adapter adds/removes read-aloud highlights here
 * directly, bypassing `addAnnotation` (which needs a CFI and is persistent). Same key overwrites. Only the two used methods are declared.
 */
export interface FoliateOverlayer {
  add(key: string, range: Range, draw: unknown, options?: Record<string, unknown>): void
  remove(key: string): void
}

/**
 * Renderer (`view.renderer`), declaring only what the adapter uses. **Shared by two implementations**: reflowable books (EPUB)
 * use `foliate-paginator`, fixed layout (PDF and other pre-paginated) uses `foliate-fxl`, distinguished by `view.isFixedLayout`.
 * Their attribute sets differ (see `setAttribute`); wrong ones fail silently, so always check the layout before setting attributes.
 */
export interface FoliateRenderer {
  /**
   * { section index, highlight canvas, document } for each rendered chapter (Paginator). Read aloud enumerates sentences from
   * the primary visible chapter's doc and draws its highlight on that overlayer. fxl has no such method, hence optional.
   */
  getContents?(): { index: number; overlayer: FoliateOverlayer; doc: Document }[]
  /** Primary visible section index (the chapter at the viewport center); read aloud uses it to know which chapter is current. Paginator only. */
  readonly primaryIndex?: number
  /**
   * Whether the rendered range reaches the end of the book (vendor paginator.js `get atEnd`, missing from upstream d.ts). Paginator only.
   * The only render measurement used by pagination: rendering may not feed page **calculation**, but "reached the end" can't be
   * derived from the size domain (the last screen may cover less than a tick), so it's only used for the end-of-book clamp (see paginationMap.currentPage).
   */
  readonly atEnd?: boolean
  /**
   * Scroll a Range / element into view (read-aloud auto page turn). With `select=true` it scrolls with selection semantics —
   * no focus stealing (no tabIndex/focus), but afterwards the anchor becomes a real DOM selection (upstream TTS uses the
   * selection as its highlight); callers that don't want it must clear it (see ttsFollow). Paginator only.
   */
  scrollToAnchor?(anchor: Range, select?: boolean, smooth?: boolean): Promise<void>
  /** Inject book CSS. Paginator only (fixed layout is whole-page bitmaps with no reflowable text), hence optional. */
  setStyles?(css: string): void
  /**
   * Set a render attribute. Two disjoint attribute sets:
   * - Paginator：`flow` / `gap` / `margin-{top,bottom,left,right}` / `max-inline-size` /
   *   `max-block-size` / `max-column-count`，
   *   plus two plain switches not in observedAttributes: `animated` (page-turn animation) / `no-swipe`.
   * - Fixed-layout fxl: `zoom` (numeric factor / `fit-width` / `fit-page`) / `scale-factor` / `spread` /
   *   `flow` (`scrolled` = continuous scroll) / `scroll-gap`.
   */
  setAttribute(name: string, value: string): void
  /**
   * Current section index (the page index in fixed layout; in continuous scroll, the page at the viewport midline); -1 if unknown.
   * fxl only — EPUB positions always come from `relocate`'s fraction / CFI, never this.
   */
  readonly index?: number
  next(): void
  prev(): void

  /** Whether in continuous-scroll flow (`flow=scrolled`). */
  readonly scrolled?: boolean
}

/** `<foliate-view>` custom element, declaring only what the adapter uses. */
export interface FoliateViewElement extends HTMLElement {
  /** Open a book (Blob/File parsed internally; see view.js `open`/`makeBook`). */
  open(book: Blob | File): Promise<void>
  /**
   * The opened book object; `toc` is the contents tree (absent before opening or if there's none). Used for the chapter tree.
   * `sections` are the spine sections, `cfi` being each one's start CFI — indexing it by the section index from `resolveNavigation`
   * gives a TOC item's "chapter start CFI", used to group highlights/bookmarks by chapter (see engine/cfi.ts).
   */
  readonly book?: {
    toc?: FoliateTocItem[] | null
    /** `size` is the section's unpacked byte count, `linear` the spine linear attribute — raw input for the location tick size domain. */
    sections?: readonly { cfi?: string; linear?: string; size?: number }[]
  }
  readonly renderer: FoliateRenderer
  /**
   * Whether the book is fixed layout (`book.rendition.layout === 'pre-paginated'`, always true for PDF). **Only set after opening**;
   * it decides whether `renderer` is fxl or Paginator (see view.js `open`), and thus which render attributes apply.
   */
  readonly isFixedLayout?: boolean
  /** Previous page (in writing direction; foliate handles RTL). */
  goLeft(): void
  /** Next page. */
  goRight(): void
  /** Go to a CFI / chapter href, or a section index (`resolveNavigation` treats a number as `{ index }`). */
  goTo(target: string | number): Promise<unknown>
  /** Go to a whole-book fraction 0–1. */
  goToFraction(fraction: number): Promise<void>
  /** Start fraction of each section in the book (progress bar chapter ticks). */
  getSectionFractions(): number[]
  /** Resolve a chapter href / CFI to `{ index }`; undefined on failure (view.js `resolveNavigation`). Used for TOC page numbers. */
  resolveNavigation(target: string): { index: number } | undefined
  /**
   * Location tick of a CFI (view.js `getCFIProgress`): parses the chapter document, counts bytes up to the CFI and converts to
   * 1500-byte ticks (`location.current`, 0-based). **Async, and cold chapters build DOM** (100–300ms), so it's only called on
   * demand when the pagination map backfills highlight/bookmark page numbers (see paginationMap). Null if unresolvable.
   * Vendor also returns `fraction` / `location.next` / `location.total`, which we ignore — page numbers must have a single
   * definition, so the declaration is trimmed.
   */
  getCFIProgress(cfi: string): Promise<{ location?: { current?: number } } | null | undefined>
  /** Generate a CFI from (section index, DOM Range) — the sole locator string for highlights/positions. */
  getCFI(index: number, range: Range): string
  /** Resolve a CFI back to (section index + range getter); the range editor uses it to get a highlight's original range. */
  resolveCFI(cfi: string): { index: number; anchor: (doc: Document) => Range }
  /** Add/remove a highlight overlay: if `remove` is true remove by `value`, otherwise resolve the CFI and fire `draw-annotation`. */
  addAnnotation(annotation: { value: string; [k: string]: unknown }, remove?: boolean): Promise<unknown>
  /** Remove a highlight overlay (= `addAnnotation(annotation, true)`). */
  deleteAnnotation(annotation: { value: string }): Promise<unknown>
  /** Clear native text selections in all chapter documents. */
  deselect(): void
}
