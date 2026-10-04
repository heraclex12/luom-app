import type {
  FoliateViewElement,
  FoliateLocation,
  FoliateLoadDetail,
  FoliateTocItem,
  FoliateOverlayer,
  FoliateCreateOverlayDetail,
  FoliateShowAnnotationDetail,
  FoliateDrawAnnotationDetail,
} from './foliate'
import { createPaginationMap, type PaginationMap } from './paginationMap'
import { cfiRangeEndpoints, type CfiRange } from './cfi'
import { cleanLookupTerm } from './lookupTerm'

export type { FoliateLocation, FoliateLoadDetail }
export type { PaginationMap } from './paginationMap'

/**
 * Contents tree node (reading-domain shape) — derived from the engine's `book.toc`.
 * `fractionStart` is the chapter's start fraction in the whole book, 0–1 (null = no href or unresolvable section index);
 * pages compute each chapter's start page as `Math.floor(fractionStart × total pages) + 1` (matching readest's location pages).
 */
export interface TocNode {
  label: string
  href?: string
  fractionStart: number | null
  /** Chapter start CFI (null = no href or unresolvable section index): boundary for grouping highlights/bookmarks by chapter. */
  cfi: string | null
  subitems: TocNode[]
}

/**
 * Reading appearance parameters (page-level layout → engine) — the page's `ReaderAppearance` maps to this and goes to `applyAppearance`.
 * Theme colors are resolved from CDS tokens by the page into concrete values (`pageBg`/`pageFg`); the adapter knows nothing of CDS.
 */
export interface AppearanceParams {
  /** Body font size, px. */
  fontSize: number
  /** Font family: serif / sans. */
  fontFamily: 'serif' | 'sans'
  /** Line-height multiplier. */
  lineHeight: number
  /** Justify text. */
  justify: boolean
  /** Auto-hyphenate English at line ends. */
  hyphenate: boolean
  /** Paragraph spacing, px. */
  paragraphSpacing: number
  /** Max line width, px (max-inline-size). */
  maxInlineSize: number
  /** Top/left/right page margins, px (margin-top/left/right). */
  marginPx: number
  /** Bottom page margin, px (margin-bottom): separate so the persistent page indicator overlay has room (must be ≥ its height). */
  marginBottomPx: number
  /** Single (1) / two columns (max 2) (max-column-count). */
  columns: 'single' | 'double'
  /** Page background color (concrete value resolved from CDS tokens). */
  pageBg: string
  /** Page text color. */
  pageFg: string
  /** Dark theme (switches color-scheme / link color). */
  dark: boolean
}

/** Highlight style (foliate terms): background fill / underline / squiggly. Business styles (fill/wavy) map to these in the page layer. */
export type OverlayStyle = 'highlight' | 'underline' | 'squiggly'

/** A highlight to draw on the text: `value` is its CFI (unique key; redrawing the same one must use the same value); `color` is a CSS color. */
export interface EngineAnnotation {
  value: string
  style: OverlayStyle
  color: string
}

/** A text selection: text + CFI + section index + popup anchor (in window coordinates: bottom-center of the selection + its height). */
export interface EngineSelection {
  text: string
  /**
   * The term used for lookup (cleaned, see `lookupTerm.ts`): punctuation and edge whitespace stripped, otherwise exactly what was selected.
   * **Independent of** `text` / `cfi` — highlights always use `text`/`cfi`; lookup normalization never writes back to the selection,
   * otherwise the highlight wouldn't match what the user dragged.
   * Empty string when the selection is all punctuation / symbols; the page then hides "Look up".
   */
  lookupTerm: string
  cfi: string
  index: number
  /** Popup anchor x (window coordinates, horizontal center of the selection). */
  x: number
  /** Popup anchor y (window coordinates, bottom of the selection). */
  y: number
  /** Selection rect height: when the popup flips above, it uses this to clear the selected text (top = y − height). */
  height: number
}

/**
 * A click on an existing annotation overlay: its CFI (`value`, note prefix stripped) + window coordinates of the hit +
 * whether it hit the **note anchor** (bubble) rather than the highlight. Highlights with notes draw two overlays: the
 * highlight itself + a note anchor; the page uses `isNote` to enter highlight editing (body) or open the note bubble (anchor).
 */
export interface EngineAnnotationHit {
  value: string
  x: number
  y: number
  /** Hit rect height: same as `EngineSelection.height`, used to clear the clicked line when the popup flips above. */
  height: number
  isNote: boolean
}

/** A draggable handle position in the range editor (window coordinates + line height at that end, for drawing the caret). */
export interface HandlePoint {
  x: number
  y: number
  height: number
}

/** Current state of a range edit: the highlight's current CFI + text + both handle positions. */
export interface RangeHandles {
  value: string
  text: string
  start: HandlePoint
  end: HandlePoint
}

/**
 * A sentence unit for read aloud — from foliate `getSentences` (vendor tts.js, MIT), splitting the primary visible chapter into sentences.
 * `range` is a **live DOM Range** (in that chapter's iframe document) and goes stale on chapter change, so call `ttsEnumerate` again.
 * `sectionIndex` is for generating CFIs (resume anchor `ttsLocation`) and cross-chapter checks; `blockIndex/markName` keep foliate semantics.
 * `text` = `range.toString()` (the source text sent to Edge TTS, and the base string for per-word highlight alignment).
 */
export interface TtsSentence {
  sectionIndex: number
  blockIndex: number
  markName: string
  text: string
  range: Range
}

/**
 * Reading engine instance — the reading domain's single facade over `vendor/foliate-js`.
 *
 * Pages/components operate the engine only through this, never touching vendor internals (see vendor/foliate-js/VENDOR.md).
 * Exposes what's needed for EPUB rendering, page turning, progress and selection/highlights; iframe coordinate conversion and
 * overlayer brush details stay inside the adapter, so pages only get "window coordinates + business semantics".
 */
export interface FoliateEngine {
  /** The `<foliate-view>` element; the host mounts it into a (sized) container before calling `open`. */
  readonly element: HTMLElement
  /**
   * Open a book (EPUB / PDF etc. as Blob/File, format detected by magic bytes) and render the first screen. **Mount `element` into the DOM first**.
   * Afterwards check `isFixedLayout` for which layout you got — the two layouts support different capabilities (see that field).
   */
  open(book: Blob | File): Promise<void>
  /**
   * Whether the book is **fixed layout** (always true for PDF; EPUB is false unless declared pre-paginated). Valid only after opening.
   *
   * Fixed-layout content is whole-page bitmaps without a reflowable text flow, so these **don't apply**: `applyAppearance` (font size /
   * line width / theme; calls are no-ops) and `goToFraction` (no in-page fraction). Page turning becomes whole-page scrolling, zoom uses
   * `setZoom`, page numbers use `pageState`. Selection and highlights work the same (fxl also builds overlay layers).
   */
  readonly isFixedLayout: boolean
  /**
   * Fixed-layout page info: current page index (0-based) and total pages; null for non-fixed layout or before opening.
   * In continuous scroll, "current page" = the page at the viewport midline; re-read it in `onRelocate` as you scroll.
   */
  pageState(): { index: number; total: number } | null
  /**
   * Pagination map — **the only source of page numbers** for reflowable books (EPUB): foliate location character ticks (1500 bytes each),
   * exact for the whole book on open and layout-independent (font / window changes don't alter page numbers); one screen may move +0/+1/+2, by design.
   * Fixed layout (PDF) doesn't use it; then `ready === false` always and the page indicator falls back to a percentage.
   */
  readonly pagination: PaginationMap
  /**
   * Fixed-layout zoom factor: **baseline 1 = fit width** (page fills the window, the natural continuous-scroll layout); 1.6 = 1.6× fit width.
   * No-op for non-fixed layout. Note it's not relative to the PDF's original size — in scroll mode page width always tracks the window.
   */
  setZoom(scale: number): void
  prevPage(): void
  nextPage(): void
  /** Go to a whole-book fraction 0–1 (progress bar drag). */
  goToFraction(fraction: number): Promise<void>
  /** Go to a CFI or chapter href (contents navigation / bookmarks). */
  goTo(target: string): Promise<void>
  /** Start fraction of each section in the book (progress bar chapter ticks). */
  sectionFractions(): number[]
  /** Contents tree (`book.toc` → reading-domain `TocNode`, each with a start fraction for page numbers). Available after opening; empty array if none. */
  getTOC(): TocNode[]
  /**
   * Currently rendered chapter documents (current chapter + adjacent pre-rendered ones, changing as pages turn). Higher-level features that
   * walk book DOM (e.g. inline translation) get all loaded `Document`s here without touching vendor (same docs `onLoad` delivers one by one).
   */
  contentDocuments(): Document[]
  /** Apply reading appearance: inject page layout CSS + set renderer line width/margin/column attributes, reflowing immediately. */
  applyAppearance(p: AppearanceParams): void
  /** Draw a highlight / redraw the same one in place (same `value` removes the old overlay first). */
  drawAnnotation(a: EngineAnnotation): Promise<void>
  /** Remove a highlight (by CFI `value`). */
  eraseAnnotation(value: string): Promise<void>
  /** Draw a same-color **note anchor** (bubble) at the end of a highlight (CFI) — clicking it opens the note bubble; same CFI replaces the old one. */
  drawNote(cfi: string, color: string): Promise<void>
  /** Remove a highlight's note anchor (by CFI). */
  eraseNote(cfi: string): Promise<void>
  /**
   * Visible range of the current screen `[start, end)` (endpoints of relocate's range CFI; start = first character on screen).
   * The header bookmark toggle and sidebar "current" bookmark/highlight checks use "cfi ∈ this range" (`util.itemsInRange`) — decoupled
   * from page numbers, so after reflow the check naturally follows the current screen. Null until the engine reports a location.
   */
  visibleCfiRange(): CfiRange | null
  /** Location change (page turn / jump) callback; returns unsubscribe. */
  onRelocate(cb: (loc: FoliateLocation) => void): () => void
  /** Chapter document load callback (may be used by other modules); returns unsubscribe. */
  onLoad(cb: (detail: FoliateLoadDetail) => void): () => void
  /**
   * Key presses inside book iframes: each chapter is its own iframe and its keydown **doesn't bubble to the host window**, so after one
   * click in the text the host's keyboard page turning would stop working. Forward them per chapter here. Returns unsubscribe.
   */
  onKeydown(cb: (e: KeyboardEvent) => void): () => void
  /** Selection change: an `EngineSelection` for a new selection, `null` when cleared; returns unsubscribe. */
  onSelect(cb: (sel: EngineSelection | null) => void): () => void
  /** Click on an existing highlight: gives its CFI + window coordinates of the hit; returns unsubscribe. */
  onAnnotationClick(cb: (hit: EngineAnnotationHit) => void): () => void
  /**
   * A chapter's overlay layer was just created (first render of that chapter), with its section index: **redraw saved highlights now**.
   * foliate only keeps search highlights in memory; regular highlights don't persist across chapters (view.js `#createOverlayer`
   * only backfills search results), so the caller must `drawAnnotation` again on entering a new chapter. Returns unsubscribe.
   */
  onOverlayCreated(cb: (index: number) => void): () => void
  /**
   * A chapter's CFI range: `[start, end)` (`end` null means the last chapter, open to the end of the book).
   * The caller uses it to pick that chapter's highlights to redraw (paired with the section index from `onOverlayCreated`).
   * null = chapter start CFI unavailable (book has no parsed sections); the caller should then redraw for the whole book.
   */
  sectionCfiRange(index: number): { start: string; end: string | null } | null
  /** Enter range editing: resolve the highlight range from its CFI and return both handle positions (window coordinates). null = unresolvable (chapter not rendered). */
  beginRangeEdit(cfi: string): RangeHandles | null
  /**
   * Drag one handle to window coordinates (clientX, clientY): recompute the range; if the CFI changed, erase and redraw (same style/color);
   * return new handle positions and the new CFI/text. null = no valid drop point or invalid range (collapsed / out of bounds); nothing changes.
   */
  dragRangeEdit(edge: 'start' | 'end', clientX: number, clientY: number, style: OverlayStyle, color: string): RangeHandles | null
  /** End range editing (clears the session). */
  endRangeEdit(): void
  /** Clear the current text selection (cleanup after a popup action). */
  clearSelection(): void

  // ── Read aloud (wraps vendor tts.js getSentences + the primary visible chapter's overlayer) ──
  /**
   * Enumerate all sentences of the **primary visible chapter** (live range + text + section index). Used by the read-aloud driver and chapter timeline.
   * Returns an empty array for fixed layout (PDF) or when the chapter isn't rendered. Call again after chapter change (old ranges go stale).
   */
  ttsEnumerate(): TtsSentence[]
  /** Draw/redraw a read-aloud sentence highlight on `range` in the primary visible chapter (same one is overwritten); `color` is a CSS color. */
  ttsHighlight(range: Range, color: string): void
  /** Clear the read-aloud highlight. */
  ttsClearHighlight(): void
  /** Scroll `range` into view (read-aloud auto page turn, without stealing focus). */
  ttsFollow(range: Range): void
  /** Current text selection (start point for "read from selection"): selection range + section index; null if no valid selection. */
  ttsSelectionRange(): { range: Range; sectionIndex: number } | null
  /** Resolve a CFI to a range in a currently rendered chapter (resume anchor / read from page top): null if unresolvable (chapter not rendered). */
  ttsResolveCfiRange(cfi: string): { range: Range; sectionIndex: number } | null
  /** Generate a CFI from (section index, range) (turns the current read-aloud position `ttsLocation` into an anchor). */
  ttsRangeCfi(sectionIndex: number, range: Range): string | null
  /** Whether `range` lies within the currently visible page (resume "still visible" check / manual page-turn detach check). */
  ttsRangeVisible(range: Range): boolean
  /** Current primary visible section index (-1 = not ready). */
  ttsSectionIndex(): number
  /** Total section count (spine length). */
  ttsSectionCount(): number
  /** Go to a section and wait until it's rendered (auto-continue at chapter end / cross-chapter navigation); false if out of range or failed. */
  ttsGoToSection(index: number): Promise<boolean>

  /** Destroy: remove listeners and the element. */
  destroy(): void
}

// Base layout CSS injected into each chapter iframe, modeled on foliate `reader.js` getCSS.
// Font size / line height / line width etc. are parameterized by applyAppearance; these are just readable defaults.
const BASE_READING_CSS = `
  html { color-scheme: light dark; }
  p, li, blockquote, dd {
    line-height: 1.6;
    text-align: justify;
    -webkit-hyphens: auto;
    hyphens: auto;
  }
  pre { white-space: pre-wrap !important; }
`

// Serif / sans font stacks (low specificity on html so book fonts can override, matching readest overrideFont=off).
const FONT_STACK = {
  serif: "Georgia, 'Times New Roman', 'Noto Serif', 'Songti SC', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'PingFang SC', sans-serif",
}

/**
 * Build the layout CSS injected into book iframes from appearance params, following readest `utils/style.ts`:
 * font size forced with `!important`, font family low-specificity so books can override, keep in-book `[align]`, add link color in dark mode.
 * Line width / margins / columns aren't here — they're renderer attributes (see `applyAppearance`).
 */
function buildAppearanceCSS(p: AppearanceParams): string {
  const family = p.fontFamily === 'serif' ? FONT_STACK.serif : FONT_STACK.sans
  const hyphens = p.hyphenate ? 'auto' : 'manual'
  return `
    @namespace epub "http://www.idpf.org/2007/ops";
    html { color-scheme: ${p.dark ? 'dark' : 'light'}; }
    html, body { font-size: ${p.fontSize}px !important; color: ${p.pageFg}; }
    html { font-family: ${family}; background-color: ${p.pageBg}; }
    p, li, blockquote, dd {
      line-height: ${p.lineHeight};
      text-align: ${p.justify ? 'justify' : 'start'};
      -webkit-hyphens: ${hyphens};
      hyphens: ${hyphens};
      -webkit-hyphenate-limit-before: 3;
      -webkit-hyphenate-limit-after: 2;
      -webkit-hyphenate-limit-lines: 2;
    }
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    [align="justify"] { text-align: justify; }
    :is(hgroup, header) p { text-align: unset; hyphens: unset; }
    p { margin-block: ${p.paragraphSpacing}px; }
    a:any-link { ${p.dark ? 'color: lightblue;' : ''} }
    pre { white-space: pre-wrap !important; }
  `
}

/**
 * Window-coordinate anchor of a range inside an iframe (bottom center + rect height): iframe rect plus frameElement screen rect.
 * `height` is included because when the popup doesn't fit below it flips **above** the anchor and needs the top edge (`y - height`);
 * with only the bottom edge, a flipped popup would cover the selected text.
 */
function anchorInWindow(
  doc: Document,
  rect: { left: number; right: number; top: number; bottom: number },
): { x: number; y: number; height: number } {
  const feRect = doc.defaultView?.frameElement?.getBoundingClientRect()
  const offX = feRect?.left ?? 0
  const offY = feRect?.top ?? 0
  return { x: (rect.left + rect.right) / 2 + offX, y: rect.bottom + offY, height: rect.bottom - rect.top }
}

// Underline/squiggly brushes need a padding to push the line to the bottom of the line box (as in readest: derived from line height and font size).
// Simplified desktop version; no vertical writing / e-ink handling.
function strokePadding(doc: Document, range: Range): number {
  const node = range.startContainer
  const el = (node.nodeType === 1 ? node : node.parentElement) as Element | null
  const cs = el ? doc.defaultView?.getComputedStyle(el) : null
  const fontSize = parseFloat(cs?.fontSize ?? '') || 16
  const lineHeight = parseFloat(cs?.lineHeight ?? '') || fontSize * 1.6
  const strokeWidth = 2
  return (lineHeight - fontSize) / 2 - strokeWidth - 1
}

// Value prefix for note-anchor overlays (matching readest `foliate-note:`): highlights with notes draw two overlays —
// the highlight with value=cfi and the note anchor with value=NOTE_PREFIX+cfi; the prefix distinguishes them when drawing and clicking. Adapter internal.
const NOTE_PREFIX = 'foliate-note:'

// Overlay key for read-aloud highlights: the unique key for in-place sentence/word updates, independent of highlight/search overlays.
const TTS_OVERLAY_KEY = 'foliate-tts'

/** Wheel / trackpad page turn: turn only after a gesture's accumulated delta reaches this many pixels (filters stray palm brushes). */
const WHEEL_FLIP_THRESHOLD_PX = 40
/** Wheel idle this long ends a gesture (must exceed the gap in macOS trackpad inertia after lifting). */
const WHEEL_IDLE_MS = 200
/** deltaMode line / page → pixel conversion. Desktop Chromium almost always sends 0 (pixels); these are fallbacks. */
const WHEEL_LINE_PX = 40
const WHEEL_PAGE_PX = 800

/**
 * Reflow "quiet period": with no new reflow signal for this long the layout is considered stable and we can restore position.
 * Reflow signals come in streams (the sidebar width animates with a resize per frame; window resizing likewise), so use a trailing
 * debounce — restoring every frame would visibly jitter and waste CFI work.
 */
const REFLOW_SETTLE_MS = 120

/**
 * Capability check for slide page turns (layered View Transitions, after readest `utils/viewTransition`): requires
 * `document.startViewTransition` and CSS support for `view-transition-group: nearest` (Chromium 140+).
 * Electron's Chromium is well above that, so this is normally true; if it fails, turn-style isn't set and the engine falls back to instant/push.
 */
function supportsViewTransitionSlide(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof CSS !== 'undefined' &&
    CSS.supports('view-transition-group', 'nearest')
  )
}

/**
 * Create a foliate reading engine instance. Dynamically imports the engine (registering `<foliate-view>`) and creates the element.
 * The host mounts the returned `element` into a sized container, then calls `open`.
 */
export async function createFoliateEngine(): Promise<FoliateEngine> {
  // Side effect: registers the <foliate-view> custom element. The engine is untyped ESM (vendor is read-only, no .d.ts in vendor);
  // we take no named exports, and this single dynamic import suppresses the implicit any (TS7016).
  // @ts-expect-error untyped vendor ESM module
  await import('@/vendor/foliate-js/view.js')
  // overlayer brushes for the three styles (drawn on the SVG overlay inside the book iframe).
  // @ts-expect-error untyped vendor ESM module
  const { Overlayer } = await import('@/vendor/foliate-js/overlayer.js')
  // Read aloud: sentence enumeration + text node walking. Both are vendor (MIT) pure functions, wrapped here and not exposed to pages.
  // @ts-expect-error untyped vendor ESM module
  const { getSentences } = await import('@/vendor/foliate-js/tts.js')
  // @ts-expect-error untyped vendor ESM module
  const { textWalker } = await import('@/vendor/foliate-js/text-walker.js')
  const view = document.createElement('foliate-view') as FoliateViewElement
  // Must be explicitly block: custom elements default to display:inline, and inline boxes produce no ResizeObserver
  // entries (size always 0×0), so the reflow-restore ResizeObserver on this element would never fire (learned the hard way:
  // the page size actually comes from the inner paginator container, so rendering looks fine but resize observation is dead).
  view.style.display = 'block'
  view.style.width = '100%'
  view.style.height = '100%'

  const relocateListeners = new Set<(loc: FoliateLocation) => void>()
  const loadListeners = new Set<(d: FoliateLoadDetail) => void>()
  const selectListeners = new Set<(sel: EngineSelection | null) => void>()
  const annClickListeners = new Set<(hit: EngineAnnotationHit) => void>()
  const overlayListeners = new Set<(index: number) => void>()
  const keydownListeners = new Set<(e: KeyboardEvent) => void>()
  // Section index → chapter document: used to get frameElement for window-coordinate conversion in show-annotation / range editor.
  const docsByIndex = new Map<number, Document>()

  // Whether a popup is currently open (selection popup / highlight editing / note bubble) — all driven by events this adapter fires,
  // so we can track it here: firing a selection or annotation hit opens, firing "selection cleared" closes (callers closing popups also go through clearSelection).
  // Tap handling uses it to tell "this tap dismisses a popup" from "a clean tap"; the former shouldn't turn pages / toggle chrome
  // (matching readest's iframe-single-click consumption chain).
  let popupOpen = false

  const emitSelection = (sel: EngineSelection | null): void => {
    popupOpen = sel !== null
    selectListeners.forEach((cb) => cb(sel))
  }

  // ── Pagination map (location character ticks) ──
  // cfi → section index is a synchronous pure parse; cfi → page needs the chapter's characters counted (100–300ms cold), so it's async
  // and queued on demand by the map itself. Location ticks are used directly, not via fraction, to avoid a second conversion diverging.
  // For which value is the source of truth vs. placeholder, see note 2 in the paginationMap.ts header.
  const pagination = createPaginationMap({
    sectionIndexOfCfi: (cfi) => {
      // Synced data may contain malformed cfis (only length-checked); a parse exception must not crash rendering the whole list.
      try {
        return view.resolveNavigation(cfi)?.index ?? null
      } catch {
        return null
      }
    },
    pageOfCfiAsync: async (cfi) => {
      try {
        const current = (await view.getCFIProgress(cfi))?.location?.current
        return current == null ? null : current + 1
      } catch {
        return null
      }
    },
  })

  // ── Reflow restore (sidebar toggle / window resize / layout change) ──
  //
  // Pages are one long strip of columns sized to the container; a width change re-columns the whole chapter and invalidates
  // old page boundaries. After reflow the paginator snaps the "visible range" to the new column boundaries, and the snap
  // **only rounds toward the start of the book** (`Math.floor`, see vendor paginator.js `#scrollToRect`): the word being read
  // stays visible, but the page top picks up a bit of already-read text. That's a hard limit of paginated layout — page
  // boundaries can only sit on column boundaries — so we don't try to fix it.
  //
  // The real problem is next: the paginator then overwrites **its own anchor** with the snapped position, so every reflow
  // creeps backward, and toggling the sidebar repeatedly keeps regressing (visible symptom: "opening the sidebar jumps back").
  // So we keep our own user position `userCfi`, **unpolluted by snapping**, and restore to it once reflow settles — however
  // many times the sidebar toggles or the window resizes, each snap starts from the same original position, so errors don't accumulate.
  //
  // Bookkeeping rule (lesson from v1): post-reflow relocates can arrive **indefinitely** late — adjacent chapter preloads,
  // layout tweaks from image/font loading, and the paginator's own 250ms debounced scroll tail all report positions again,
  // all snapped (toward the start). A "mute for a time window" timer is bound to leak: chapter preloads arrived after the window
  // and each sidebar toggle still lost a page. So we use a latch: a reflow **drops the latch**, and all passive relocates are
  // ignored until the user's next deliberate action (page turn / jump / wheel / read-aloud follow) lifts it — only positions
  // reported after a user action are truly theirs, and passive reports, however late, can't pollute it.
  /** Visible range of the current screen [start, end) (endpoints of relocate's range CFI): for the header bookmark toggle / sidebar "current". */
  let visibleRange: CfiRange | null = null
  /** Visible DOM Range of the current screen (from relocate, always overwritten — after reflow the old range may belong to a dead document):
      ttsRangeVisible compares against it. */
  let visibleDomRange: Range | null = null
  /**
   * Reuse the old object when endpoints are unchanged — post-reflow relocates arrive indefinitely late and repeat the same position
   * (see userCfi below); a new object identity each time would stop the page's `setVisibleRange` from bailing out, re-rendering the bookmark list.
   * Returns the updated range for direct use by the caller (page numbers need its start, no need to re-read this mutable).
   */
  const updateVisibleRange = (cfi: string | undefined): CfiRange | null => {
    const next = cfi ? cfiRangeEndpoints(cfi) : null
    if (next && visibleRange && next.start === visibleRange.start && next.end === visibleRange.end)
      return visibleRange
    visibleRange = next
    return visibleRange
  }
  /** The position the user actually reached (CFI): frozen while the reflow latch is down; only updated by the user's own page turns / jumps. */
  let userCfi: string | null = null
  /** Reflow latch: while down, relocates aren't recorded. Dropped by scheduleReflowRestore, lifted by cancelReflowRestore. */
  let reflowLatched = false
  let settleTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * Scroll the book back to `cfi`. Uses `renderer.scrollToAnchor` rather than `view.goTo`: the latter pushes a back/forward
   * history entry (view.js `goTo` `history.pushState`), so each sidebar toggle would pollute history.
   */
  const scrollBackTo = (cfi: string): void => {
    try {
      const resolved = view.resolveCFI(cfi)
      const doc = docsByIndex.get(resolved.index)
      if (!doc) return
      // select=false → navigation semantics: scroll only, don't touch the selection or steal focus.
      void view.renderer?.scrollToAnchor?.(resolved.anchor(doc), false)
    } catch {
      // Unresolvable (bad cfi / chapter unloaded): give up this restore and fall back to the paginator's own snap —
      // slightly off but sane, better than throwing and breaking the reflow flow.
    }
  }

  /**
   * The user picked a position (page turn / contents jump / progress drag / wheel / read-aloud follow): cancel any pending restore and lift the latch.
   * Their choice wins over restoring, and the relocate that follows is recorded again — that's their new position.
   * Known edge: if a reflow fires while a page-turn animation is in flight (turn then immediately resize / open the sidebar), the
   * turn's landing is blocked by the re-dropped latch and the restore returns to the previous page. Needs exact timing overlap,
   * costs one page and self-heals on the next turn, so no extra mechanism.
   */
  const cancelReflowRestore = (): void => {
    clearTimeout(settleTimer)
    reflowLatched = false
  }

  /** Register "the book is about to reflow": drop the latch, then after REFLOW_SETTLE_MS of quiet restore to `userCfi`. */
  const scheduleReflowRestore = (): void => {
    // Fixed layout (PDF) is whole-page bitmaps + continuous scroll, with no columns and so no snapping; skip.
    if (view.isFixedLayout) return
    // No trusted position yet (just opened, first screen not settled): nothing to restore to, and we **must not** drop the
    // latch — otherwise the first screen's relocate wouldn't be recorded and later reflows would have no anchor.
    if (!userCfi) return
    reflowLatched = true
    clearTimeout(settleTimer)
    // userCfi is frozen while the latch is down, so just read it when the timer fires; if the user navigated meanwhile,
    // cancelReflowRestore already cleared settleTimer, so we won't fight their jump.
    settleTimer = setTimeout(() => {
      if (userCfi) scrollBackTo(userCfi)
    }, REFLOW_SETTLE_MS)
  }

  // Window resize / sidebar toggle (font size / line width / columns go through applyAppearance, which calls scheduleReflowRestore itself):
  // register a reflow and restore once stable. Page numbers are unaffected by reflow (location ticks are layout-independent), so no cache to invalidate.
  //
  // Order matters: this observer must get its callback **before** the paginator's own (which observes #container in shadow DOM,
  // reflows and synchronously fires relocate), otherwise that frame's snapped position would enter userCfi before muting.
  // Two things guarantee it: ResizeObserver calls back in observer creation order within a batch, and this observer is created
  // now (the paginator doesn't exist until open()); also view is shallower than #container, and shallower dispatches first.
  const resizeObserver = new ResizeObserver(() => {
    scheduleReflowRestore()
  })
  resizeObserver.observe(view)

  view.addEventListener('relocate', (e) => {
    const loc = (e as CustomEvent<FoliateLocation>).detail
    // Record the user position — not while the latch is down (see userCfi): those positions are snapped and would keep regressing.
    if (!reflowLatched && loc.cfi) userCfi = loc.cfi
    // Visible range endpoints: loc.cfi is a "screen start → screen end" range CFI, split into [start, end) (pages read it via visibleCfiRange).
    // Must be updated before firing the location: pages pull it inside the relocate callback.
    const range = updateVisibleRange(loc.cfi)
    visibleDomRange = loc.range ?? null
    // Page turns / scrolling / jumps all leave the selection context; close popups.
    emitSelection(null)
    // Feed the pagination map before firing: callers reading pagination.currentPage in the relocate callback get this screen's value.
    // Reflowable books only — fixed layout (PDF) has no location domain, ready is always false, and the indicator falls back to a percentage.
    const l = loc.location
    if (!view.isFixedLayout && l?.current != null) {
      pagination.observe({
        current: l.current,
        atEnd: view.renderer?.atEnd ?? false,
        startCfi: range?.start ?? null,
      })
    }
    relocateListeners.forEach((cb) => cb(loc))
  })

  // ── Wheel / trackpad page turning ──
  // One continuous gesture turns one page: turn when the accumulated delta crosses the threshold, then swallow the rest of the gesture until the wheel idles.
  // Swallowing the tail is required — after lifting, macOS trackpads keep emitting inertial wheel events for a second or two; otherwise one swipe turns several pages.
  //
  // Deliberately **no** "drag-follow + snap back on release" (macOS Books feel): web wheel events lack NSEvent phases, so we can't
  // detect the moment fingers leave the trackpad, nor tell manual from inertial phases. A drag-follow version would get pushed by inertia
  // to an adjacent page boundary and stick for a second or two before snapping — worse than discrete turns. paginator scrollBy / snap
  // are public, so if a reliable lift signal ever exists, drag-follow can be added on top of this wiring.
  let wheelAccX = 0
  let wheelAccY = 0
  let wheelLastTs = -Infinity
  // Whether this gesture already turned a page: if so, remaining events are inertial tail and get swallowed.
  let wheelFlipped = false

  const onWheel = (e: WheelEvent): void => {
    // Fixed layout (PDF) uses fxl continuous scroll, where the wheel is native scrolling — don't intercept or convert to page turns;
    // always let it through (intercepting would stop scrolling entirely).
    if (view.isFixedLayout) return
    // In paginated mode the book iframe is overflow:hidden, so horizontal swipes don't scroll natively but do trigger Electron's
    // two-finger "go back" history gesture — must be blocked. Note wheel listeners on document are passive by default, so every
    // binding must pass { passive: false } explicitly, otherwise this preventDefault is a no-op (and warns).
    e.preventDefault()

    // Idle longer than the window = the previous gesture (with its inertial tail) has ended; start a new gesture.
    if (e.timeStamp - wheelLastTs > WHEEL_IDLE_MS) {
      wheelAccX = 0
      wheelAccY = 0
      wheelFlipped = false
    }
    wheelLastTs = e.timeStamp
    if (wheelFlipped) return

    const unit = e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? WHEEL_PAGE_PX : 1
    wheelAccX += e.deltaX * unit
    wheelAccY += e.deltaY * unit
    // Dominant axis only: vertical jitter during a horizontal swipe (and pure vertical normal wheels) shouldn't skew direction.
    const delta = Math.abs(wheelAccX) > Math.abs(wheelAccY) ? wheelAccX : wheelAccY
    if (Math.abs(delta) < WHEEL_FLIP_THRESHOLD_PX) return

    wheelFlipped = true
    cancelReflowRestore()
    // Scrolling down / right = read forward. goRight/goLeft handle RTL themselves; no writing-direction check here.
    if (delta > 0) view.goRight()
    else view.goLeft()
  }

  // Bound on the host element: covers margins and side gutters outside the iframes.
  view.addEventListener('wheel', onWheel, { passive: false })

  // A new chapter's overlay layer is ready: tell the caller to redraw that chapter's saved highlights (foliate doesn't persist them for us).
  view.addEventListener('create-overlay', (e) => {
    const { index } = (e as CustomEvent<FoliateCreateOverlayDetail>).detail
    overlayListeners.forEach((cb) => cb(index))
  })

  view.addEventListener('load', (e) => {
    const detail = (e as CustomEvent<FoliateLoadDetail>).detail
    docsByIndex.set(detail.index, detail.doc)
    // Keep only the current chapter and its neighbors' docs: far chapters' iframes are already unloaded by the paginator, and keeping
    // Document references would leak memory steadily over a long reading session. Neighbors are kept because the paginator pre-renders
    // them (same proximity policy), and show-annotation / beginRangeEdit only make sense on rendered chapters.
    // Fixed layout (PDF) keeps many pages rendered at once in continuous scroll, so proximity would drop pages still
    // on screen (clicking a highlight there then fails); drop only pages whose frame is gone.
    const fixed = !!view.isFixedLayout
    for (const [i, doc] of docsByIndex) {
      const gone = !doc.defaultView?.frameElement?.isConnected
      if (gone || (!fixed && Math.abs(i - detail.index) > 1)) docsByIndex.delete(i)
    }
    attachSelectionListeners(detail.doc, detail.index)
    // Forward keys from the chapter iframe to the caller (keyboard page turns; listener dies with the iframe, like pointer listeners).
    detail.doc.addEventListener('keydown', (e) => keydownListeners.forEach((cb) => cb(e)))
    // Wheel page turns over the text. wheel doesn't bubble out of iframes, so bind per chapter, but share the **same** onWheel closure —
    // gesture state is thus engine-wide, and moving from text to margin (host element) won't split one gesture into two.
    detail.doc.addEventListener('wheel', onWheel, { passive: false })
    loadListeners.forEach((cb) => cb(detail))
  })

  // foliate doesn't draw highlights itself: after resolving the CFI it fires draw-annotation; here we pick an overlayer brush by value prefix / style.
  view.addEventListener('draw-annotation', (e) => {
    const { draw, annotation, doc, range } = (e as CustomEvent<FoliateDrawAnnotationDetail>).detail
    const { value, style, color } = annotation as unknown as EngineAnnotation
    // Note anchor (prefixed value): draw a same-color bubble, ignoring style.
    if (typeof value === 'string' && value.startsWith(NOTE_PREFIX)) {
      draw(Overlayer.bubble, { color })
    } else if (style === 'highlight') {
      draw(Overlayer.highlight, { color })
    } else {
      // underline / squiggly: line color + padding pushed to the line bottom.
      draw(Overlayer[style], { color, padding: strokePadding(doc, range) })
    }
  })

  // Click on an existing overlay: convert to window coordinates + check the prefix for a note anchor hit, then pass to the page
  // (highlight body → editing; note anchor → note bubble). value without the prefix is the highlight CFI.
  view.addEventListener('show-annotation', (e) => {
    const { value, index, rect } = (e as CustomEvent<FoliateShowAnnotationDetail>).detail
    const isNote = typeof value === 'string' && value.startsWith(NOTE_PREFIX)
    const cfi = isNote ? value.slice(NOTE_PREFIX.length) : value
    const doc = docsByIndex.get(index)
    const anchor = doc && rect ? anchorInWindow(doc, rect) : { x: 0, y: 0, height: 0 }
    popupOpen = true
    annClickListeners.forEach((cb) => cb({ value: cfi, x: anchor.x, y: anchor.y, height: anchor.height, isNote }))
  })

  // Attach selection listeners to a chapter document. Desktop mouse roles:
  //  - pointerdown: a generic "close popups" — clicking blank space in the book closes them (including editing popups / note bubbles that don't depend on a live selection).
  //  - pointerup: gesture ended; read the final selection and create a new popup (the only entry for selection, avoiding churn while dragging).
  //
  // Deliberately **not** listening to selectionchange to close popups: clicking a color/style swatch in the popup blurs the book iframe
  // and fires "selection cleared", which isn't the user deselecting (matches readest "stay open unless clicking blank space"). Only pointerdown / page turns close popups.
  //
  function attachSelectionListeners(doc: Document, index: number): void {
    const readSelection = (): void => {
      const sel = doc.getSelection()
      // Single click / accidental tap / single character: no popup. pointerdown already closed the old one; nothing to fire here.
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || sel.toString().trim().length < 2) return
      const range = sel.getRangeAt(0)
      const anchor = anchorInWindow(doc, range.getBoundingClientRect())
      emitSelection({
        text: sel.toString().trim(),
        // Extract lookup term (lookup only): normalize just the selected text, **don't touch text/cfi**, and don't reach outside the selection.
        lookupTerm: cleanLookupTerm(range.toString()),
        cfi: view.getCFI(index, range),
        index,
        x: anchor.x,
        y: anchor.y,
        height: anchor.height,
      })
    }

    doc.addEventListener('pointerdown', () => emitSelection(null))
    doc.addEventListener('pointerup', readSelection)
  }

  // ── Range editing (drag the two handles to change a highlight's range) ──
  // Session holds: chapter doc, current CFI, both boundaries (node/offset). While dragging, one end is fixed and the other moves to the pointer.
  type Boundary = { node: Node; offset: number }
  let rangeSession: { index: number; doc: Document; value: string; start: Boundary; end: Boundary } | null = null

  // Read aloud: the primary visible chapter's { section index, overlayer, doc } — sentence enumeration and highlights act on it.
  // fxl (PDF) renderers have no getContents, so this returns undefined (read aloud doesn't apply to fixed layout).
  function primaryContent(): { index: number; overlayer: FoliateOverlayer; doc: Document } | undefined {
    const r = view.renderer
    const contents = r?.getContents?.() ?? []
    const pIndex = r?.primaryIndex ?? -1
    return contents.find((c) => c.index === pIndex) ?? contents[0]
  }

  // Compute window coordinates of both handles from a range (first line start = start, last line end = end).
  function handlesFrom(doc: Document, value: string, range: Range): RangeHandles | null {
    const rects = range.getClientRects()
    if (!rects.length) return null
    const first = rects[0]
    const last = rects[rects.length - 1]
    const feRect = doc.defaultView?.frameElement?.getBoundingClientRect()
    const ox = feRect?.left ?? 0
    const oy = feRect?.top ?? 0
    return {
      value,
      text: range.toString(),
      start: { x: first.left + ox, y: first.top + oy, height: first.height },
      end: { x: last.right + ox, y: last.bottom + oy, height: last.height },
    }
  }

  return {
    element: view,
    pagination,
    async open(book) {
      await view.open(book)
      // Denominator of location ticks (matching vendor SectionProgress): total unpacked bytes of linear sections.
      // Fixed-layout (PDF) sections have no size ⇒ sizeTotal 0 ⇒ the pagination map is never ready and the indicator falls back to a percentage.
      const sizeTotal = (view.book?.sections ?? []).reduce(
        (a, s) => a + (s.linear !== 'no' && s.size != null && s.size > 0 ? s.size : 0),
        0,
      )
      pagination.reset(view.getSectionFractions(), sizeTotal)
      // Fixed layout (PDF): the renderer is fxl, not Paginator; whole-page bitmaps have no text to inject CSS into and no columns,
      // so none of the EPUB wiring below applies (Paginator attributes on fxl fail silently).
      // Only one thing is set: continuous scroll (smoothest for scrolling through a document, and no page-turn animation).
      // In scroll mode page width inherently fills the window, so `zoom` isn't needed or possible; zoom uses `setZoom` (see its comment).
      if (view.isFixedLayout) {
        view.renderer.setAttribute('flow', 'scrolled')
        // Must explicitly go to the first page: when switching to scroll mode fxl anchors on the "current page", but nothing has
        // rendered yet (paginated mode only establishes the first screen via `renderer.next()`), so current page is -1, the anchor
        // branch is skipped and nobody sets the initial scroll position — it ends up on the last page. This also replaces `next()`'s first render.
        await view.goTo(0)
        return
      }
      view.renderer.setStyles?.(BASE_READING_CSS)
      // Page-turn animation: the Paginator's whole slide animation is gated on this attribute (`hasAttribute('animated')`);
      // without it, `containerPosition = offset` jumps instantly. It isn't in observedAttributes — a plain switch that doesn't reflow —
      // so set it once on open. Deliberately not a setting (same trade-off as tap zones: ship one behavior, gather feedback).
      // `gpu-composite` is an Apple WebKit-only large-chapter optimization; not set in Chromium — per vendor comments, leaving it
      // unset falls back to per-frame rAF scrolling for huge chapters, avoiding main-thread jank when Blink composites huge layers.
      view.renderer.setAttribute('animated', '')
      // Slide page turns: set turn-style=slide when supported. On turn the engine searches up from the renderer via closest for
      // `[data-view-transition-root]` (the Reader's center column) and applies `view-transition-name: foliate-turn`, so text +
      // page indicator + margins slide as "one sheet" (like macOS Books). If unsupported, it's not set and the engine falls back
      // to instant/push (old WebView fallback, not exposed to users). Like animated, turn-style isn't in observedAttributes;
      // it's a read-on-use switch, so set it once on open.
      if (supportsViewTransitionSlide()) {
        view.renderer.setAttribute('turn-style', 'slide')
      }
      view.renderer.next() // render the first screen (as in reader.js)
    },
    get isFixedLayout() {
      return view.isFixedLayout ?? false
    },
    pageState() {
      if (!view.isFixedLayout) return null
      const total = view.book?.sections?.length ?? 0
      const index = view.renderer?.index ?? -1
      // Each PDF page is one section, so page index = section index; fxl gives -1 before rendering, treated as the first page.
      return total ? { index: index < 0 ? 0 : index, total } : null
    },
    setZoom(scale) {
      if (!view.isFixedLayout) return
      // In continuous scroll fxl page width always equals window width (the `zoom` attribute only affects paginated mode and is ignored here);
      // the only adjustable knob is the `scale-factor` (percent) layered on top — that's the zoom control in scroll mode.
      view.renderer.setAttribute('scale-factor', String(Math.round(scale * 100)))
    },
    // All four user navigation entry points first cancel any pending reflow restore (see cancelReflowRestore):
    // keyboard / tap zones / footer buttons use prev/nextPage, contents / bookmarks / highlights use goTo, progress bar and chapter switch use goToFraction.
    prevPage: () => {
      cancelReflowRestore()
      view.goLeft()
    },
    nextPage: () => {
      cancelReflowRestore()
      view.goRight()
    },
    goToFraction: (fraction) => {
      cancelReflowRestore()
      return view.goToFraction(fraction)
    },
    goTo: async (target) => {
      cancelReflowRestore()
      await view.goTo(target)
    },
    sectionFractions: () => view.getSectionFractions(),
    getTOC() {
      const fractions = view.getSectionFractions()
      const sections = view.book?.sections ?? []
      // Each href → section index (resolveNavigation) → that section's start fraction (sectionFractions[index]) and start CFI
      // (sections[index].cfi); null if unresolvable.
      const toNode = (it: FoliateTocItem): TocNode => {
        let fractionStart: number | null = null
        let cfi: string | null = null
        if (it.href) {
          const idx = view.resolveNavigation(it.href)?.index
          if (idx !== undefined && idx >= 0 && idx < fractions.length) fractionStart = fractions[idx]
          if (idx !== undefined && idx >= 0) cfi = sections[idx]?.cfi ?? null
        }
        return {
          label: it.label?.trim() ?? '',
          href: it.href,
          fractionStart,
          cfi,
          subitems: (it.subitems ?? []).map(toNode),
        }
      }
      return (view.book?.toc ?? []).map(toNode)
    },
    contentDocuments: () => [...docsByIndex.values()],
    sectionCfiRange(index) {
      const sections = view.book?.sections ?? []
      const start = sections[index]?.cfi
      if (!start) return null
      return { start, end: sections[index + 1]?.cfi ?? null }
    },
    applyAppearance(p) {
      const r = view.renderer
      if (!r) return
      // Fixed layout (PDF) has no reflowable text: font size / line width / columns can't apply, and everything below is Paginator
      // attributes that fail silently on fxl. No-op, making "layout settings don't affect PDFs" an explicit rule rather than an accident.
      if (view.isFixedLayout) return
      // Restore position here too: layout changes are the same snapping problem as sidebar toggles (see userCfi). **Register before
      // setting attributes** — the setAttribute / setStyles below synchronously trigger a paginator reflow and fire relocate on the spot;
      // muting one step later would let that snapped position into userCfi.
      scheduleReflowRestore()
      // Line width / margins / columns → renderer attributes (sizes in px, columns unitless); the Paginator observes these and reflows.
      r.setAttribute('max-inline-size', `${p.maxInlineSize}px`)
      r.setAttribute('margin-top', `${p.marginPx}px`)
      // Bottom margin uses marginBottomPx separately: the persistent page indicator (PageIndicator) floats in this bottom band,
      // which must be ≥ its height or the page number overlaps the last line of text (the page passes the value, see constants).
      r.setAttribute('margin-bottom', `${p.marginBottomPx}px`)
      r.setAttribute('margin-left', `${p.marginPx}px`)
      r.setAttribute('margin-right', `${p.marginPx}px`)
      r.setAttribute('max-column-count', p.columns === 'single' ? '1' : '2')
      // Font / layout / theme colors → injected book CSS (replacing BASE_READING_CSS).
      r.setStyles?.(buildAppearanceCSS(p))
    },
    async drawAnnotation(a) {
      // Custom fields (style/color) pass through foliate to draw-annotation; same value removes the old overlay first.
      // EngineAnnotation has no index signature, so cast to the looser shape the engine expects.
      await view.addAnnotation(a as unknown as { value: string; [k: string]: unknown })
    },
    async eraseAnnotation(value) {
      await view.deleteAnnotation({ value })
    },
    async drawNote(cfi, color) {
      // The note anchor is a separate overlay (prefixed value, a different key from the highlight, so they don't overwrite each other);
      // style is a placeholder — draw-annotation picks the bubble brush by prefix.
      await view.addAnnotation({ value: `${NOTE_PREFIX}${cfi}`, style: 'highlight', color } as unknown as {
        value: string
        [k: string]: unknown
      })
    },
    async eraseNote(cfi) {
      await view.deleteAnnotation({ value: `${NOTE_PREFIX}${cfi}` })
    },
    beginRangeEdit(cfi) {
      // A bad CFI makes resolveCFI / anchor throw (synced rows only pass a length check, no shape check) — one dirty record shouldn't
      // break clicking highlights entirely; return null to skip editing and let the caller (SelectionAnnotator) report the error.
      try {
        const resolved = view.resolveCFI(cfi)
        const doc = docsByIndex.get(resolved.index)
        if (!doc) return null
        const range = resolved.anchor(doc)
        rangeSession = {
          index: resolved.index,
          doc,
          value: cfi,
          start: { node: range.startContainer, offset: range.startOffset },
          end: { node: range.endContainer, offset: range.endOffset },
        }
        return handlesFrom(doc, cfi, range)
      } catch (e) {
        console.warn('[reading] Failed to resolve highlight CFI; skipping range edit:', e)
        return null
      }
    },
    dragRangeEdit(edge, clientX, clientY, style, color) {
      const s = rangeSession
      if (!s) return null
      const feRect = s.doc.defaultView?.frameElement?.getBoundingClientRect()
      const ix = clientX - (feRect?.left ?? 0)
      const iy = clientY - (feRect?.top ?? 0)
      // Pointer position → (node, offset). Native mouse selection uses the same hit-test, so coordinates agree under columns/transforms.
      const caret = s.doc.caretRangeFromPoint?.(ix, iy)
      if (!caret) return null
      const moved: Boundary = { node: caret.startContainer, offset: caret.startOffset }
      const start = edge === 'start' ? moved : s.start
      const end = edge === 'end' ? moved : s.end
      const next = s.doc.createRange()
      try {
        next.setStart(start.node, start.offset)
        next.setEnd(end.node, end.offset)
      } catch {
        return null // crossing the other end would make start>end: no change this time
      }
      if (next.collapsed) return null // collapsed to empty: keep at least 1 character
      const newCfi = view.getCFI(s.index, next)
      if (newCfi !== s.value) {
        void view.deleteAnnotation({ value: s.value })
        void view.addAnnotation({ value: newCfi, style, color } as unknown as { value: string; [k: string]: unknown })
        s.value = newCfi
      }
      // The range auto-normalizes start≤end: backfill both boundaries from it (the other end may have been clamped).
      s.start = { node: next.startContainer, offset: next.startOffset }
      s.end = { node: next.endContainer, offset: next.endOffset }
      return handlesFrom(s.doc, s.value, next)
    },
    endRangeEdit() {
      rangeSession = null
    },
    visibleCfiRange: () => visibleRange,
    onRelocate(cb) {
      relocateListeners.add(cb)
      return () => relocateListeners.delete(cb)
    },
    onLoad(cb) {
      loadListeners.add(cb)
      return () => loadListeners.delete(cb)
    },
    onSelect(cb) {
      selectListeners.add(cb)
      return () => selectListeners.delete(cb)
    },
    onKeydown(cb) {
      keydownListeners.add(cb)
      return () => keydownListeners.delete(cb)
    },
    onOverlayCreated(cb) {
      overlayListeners.add(cb)
      return () => overlayListeners.delete(cb)
    },
    onAnnotationClick(cb) {
      annClickListeners.add(cb)
      return () => annClickListeners.delete(cb)
    },
    clearSelection() {
      view.deselect()
      emitSelection(null)
    },

    // ── Read aloud (wraps vendor tts.js getSentences + the primary visible chapter's overlayer) ──
    ttsEnumerate() {
      const primary = primaryContent()
      if (!primary?.doc) return []
      const out: TtsSentence[] = []
      // getSentences(doc, textWalker, nodeFilter, granularity): nodeFilter=null (footnotes etc. not excluded; kept simple for v1).
      for (const seg of getSentences(primary.doc, textWalker, null, 'sentence') as Iterable<{
        blockIndex: number
        markName: string
        range: Range
      }>) {
        const text = seg.range.toString()
        if (!text.trim()) continue
        out.push({
          sectionIndex: primary.index,
          blockIndex: seg.blockIndex,
          markName: seg.markName,
          text,
          range: seg.range,
        })
      }
      return out
    },
    ttsHighlight(range, color) {
      const primary = primaryContent()
      if (!primary?.overlayer) return
      primary.overlayer.remove(TTS_OVERLAY_KEY)
      primary.overlayer.add(TTS_OVERLAY_KEY, range, Overlayer.highlight, { color })
    },
    ttsClearHighlight() {
      // Clear across all rendered chapters: during cross-chapter reading the highlight may sit on a non-primary chapter's overlayer.
      for (const c of view.renderer?.getContents?.() ?? []) c.overlayer?.remove(TTS_OVERLAY_KEY)
    },
    ttsFollow(range) {
      // Read-aloud follow also advances the reading position: cancel pending restores, or toggling the sidebar mid-read would pull back to where reading started.
      cancelReflowRestore()
      // select=true → selection-semantics scroll: no focus stealing, no tabIndex/outline (the navigation branch would set them).
      // Cost: after settling the paginator makes the range a real DOM selection (upstream foliate TTS uses the native selection as its
      // highlight; for us it's leftover since we draw our own overlay, rendered as inactive gray). relocate is dispatched synchronously
      // before the promise resolves (end of paginator #afterScroll), so clearing it after settling is race-free.
      void view.renderer?.scrollToAnchor?.(range, true)?.then(() => {
        const sel = range.startContainer.ownerDocument?.getSelection()
        if (!sel?.rangeCount) return
        const r = sel.getRangeAt(0)
        // Only clear a selection that is exactly the range we passed in; never clobber the user's own selection.
        if (
          r.compareBoundaryPoints(Range.START_TO_START, range) === 0 &&
          r.compareBoundaryPoints(Range.END_TO_END, range) === 0
        )
          sel.removeAllRanges()
      })
    },
    ttsSelectionRange() {
      const primary = primaryContent()
      const sel = primary?.doc?.getSelection?.()
      if (!primary || !sel || sel.isCollapsed || sel.rangeCount === 0) return null
      return { range: sel.getRangeAt(0), sectionIndex: primary.index }
    },
    ttsResolveCfiRange(cfi) {
      try {
        const resolved = view.resolveCFI(cfi)
        const doc = docsByIndex.get(resolved.index)
        if (!doc) return null
        return { range: resolved.anchor(doc), sectionIndex: resolved.index }
      } catch {
        return null
      }
    },
    ttsRangeCfi(sectionIndex, range) {
      try {
        return view.getCFI(sectionIndex, range)
      } catch {
        return null
      }
    },
    ttsRangeVisible(range) {
      // Compare boundaries with the visible Range reported by relocate (as readest does), not geometry: in paginated mode the iframe
      // is stretched to the whole chapter width, so checking rect / innerWidth inside it is always wrong (always true); reading rects
      // would also force a sync reflow per word. Intersection semantics: neither entirely after nor entirely before the visible range.
      const vis = visibleDomRange
      if (!vis) return false
      try {
        const ahead = range.compareBoundaryPoints(Range.END_TO_START, vis) > 0
        const behind = range.compareBoundaryPoints(Range.START_TO_END, vis) < 0
        return !ahead && !behind
      } catch {
        return false // cross-document comparison throws (preloaded neighbor / dead range from an unloaded chapter): treat as not visible
      }
    },
    ttsSectionIndex() {
      return view.renderer?.primaryIndex ?? -1
    },
    ttsSectionCount() {
      return view.book?.sections?.length ?? 0
    },
    async ttsGoToSection(index) {
      const total = view.book?.sections?.length ?? 0
      if (index < 0 || index >= total) return false
      cancelReflowRestore()
      try {
        await view.goTo(index)
        return true
      } catch {
        return false
      }
    },

    destroy() {
      resizeObserver.disconnect()
      // Pending reflow restore: if not cleared it would resolve a CFI / scroll a dead element after view is removed.
      clearTimeout(settleTimer)
      relocateListeners.clear()
      loadListeners.clear()
      selectListeners.clear()
      annClickListeners.clear()
      overlayListeners.clear()
      keydownListeners.clear()
      docsByIndex.clear()
      visibleDomRange = null // otherwise the engine object pins the unloaded chapter's iframe document
      view.remove()
    },
  }
}
