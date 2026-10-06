import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDarkMode } from '@/hooks/useTheme'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'
import * as reading from '@/reading'
import type { AnnotationRecord, BookmarkRecord, CfiRange, FoliateEngine, TocNode } from '@/reading'
import { DEFAULT_SETTINGS, getSettings, onSettingsChange } from '@/settings'
import { ReaderHeaderBar } from './chrome/ReaderHeaderBar'
import { ReaderFooterBar } from './chrome/ReaderFooterBar'
import { PageIndicator } from './chrome/PageIndicator'
import { ReaderSidebar } from './sidebar/ReaderSidebar'
import { FoliateView } from './FoliateView'
import { SelectionAnnotator } from './annotation/SelectionAnnotator'
import { NoteDialog } from './annotation/NoteDialog'
import { useInlineTranslation } from './translation/useInlineTranslation'
import {
  readTranslationProvider,
  storeTranslationProvider,
  type TranslationProvider,
} from './translation/providerMemory'
import {
  clearBookData,
  createBookmark,
  getAnnotation,
  loadBookData,
  removeAnnotation,
  removeBookmark,
  renameBookmark,
  updateAnnotation,
  useAnnotations,
  useBookmarks,
} from './annotationStore'
import { getFixedTypography, HIGHLIGHT_INK, OVERLAY_STYLE, readerMarginBottomPx } from './constants'
import { itemsInRange } from './util'
import { TtsBarPlayer } from './tts/TtsBarPlayer'
import { TtsFullPlayer } from './tts/TtsFullPlayer'
import { useTtsSession } from './tts/useTtsSession'
import { useReadingTracker } from './useReadingTracker'

/**
 * Reader: the standalone full-screen page opened from the Library (route /reader/:bookHash).
 *
 * The body is rendered by the vendored foliate engine (via the `@/reading` facade + `FoliateView`);
 * paging / progress / chapters / selection highlights (`SelectionAnnotator`) all use the engine. Header/footer are hidden overlay chrome
 * revealed by moving the mouse to the top/bottom edge (like macOS Books; clicks on the body never toggle chrome or turn pages).
 * Three ways to turn pages: wheel / two-finger trackpad (wired in the engine), footer buttons, arrow keys / space.
 *
 * Book metadata comes from the local user_book table by `:bookHash`; the file is read from content-addressed storage `books/<hash>/`.
 * Missing (or deleted) rows and missing files get a fallback screen instead of the reader.
 * Highlights / bookmarks / progress are all stored locally: on open, the book's data loads into [annotationStore](./annotationStore.ts) and
 * existing highlights are redrawn; progress is flushed before leaving. Typography (`applyAppearance`) = font size/family from settings
 * (`@/settings`, reflows immediately) + fixed rest (`getFixedTypography`); page light/dark follows the app theme.
 * Inline translation (`useInlineTranslation`) lazily translates visible paragraphs, English → Vietnamese side by side (in-memory toggle).
 * Read aloud uses the Edge TTS engine (`tts/useTtsSession`): footer toggle + start from selection + mini bar / full player.
 */

const EPS = 1e-4

/** Debounce for saving progress on page turn: rapid arrow presses only save the last one. */
const PROGRESS_DEBOUNCE_MS = 1000

/**
 * Elements where keyboard paging is skipped: space activates buttons/inputs, so stealing it would turn a page instead of
 * re-activating the button. Uses closest() rather than tagName to cover svg/span children being the event target.
 */
const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, [contenteditable="true"]'

/** Find a chapter title by href in the TOC tree (default name for new bookmarks; list grouping computes from CFI instead). */
function findChapterLabel(nodes: TocNode[], href: string | null): string {
  if (!href) return ''
  for (const n of nodes) {
    if (n.href === href) return n.label
    const sub = findChapterLabel(n.subitems, href)
    if (sub) return sub
  }
  return ''
}

export function Reader(): React.JSX.Element {
  const navigate = useNavigate()
  // :bookHash from the Library -> user_book row (tombstones included, so "deleted" and "never existed" both hit the fallback).
  const { bookHash = '' } = useParams<{ bookHash: string }>()
  const bookQuery = useAsyncData(() => reading.getBook(bookHash), [bookHash])
  const book = bookQuery.data && !bookQuery.data.isDeleted ? bookQuery.data : null
  const format = book?.format ?? ''

  // Book file loader (FoliateView needs a stable reference). Failure usually means the file isn't on this device; rethrow in plain words.
  const loadBook = useCallback(async () => {
    try {
      return await reading.openBookFile(bookHash, format)
    } catch (e) {
      console.error('[reading] Failed to read book file:', e)
      throw new Error("The book file isn't on this device. It may have been deleted.")
    }
  }, [bookHash, format])

  // ── Reading progress: debounced writes on page turn, flushed before leaving ──
  // Don't record while restoredRef=false: the first relocate on open is "page 1" and would overwrite the saved position.
  const restoredRef = useRef(false)
  const pendingRef = useRef<{ location: string; fraction: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushProgress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    if (!pending || !bookHash) return
    pendingRef.current = null
    void reading
      .saveProgress(bookHash, pending.location, pending.fraction)
      .catch((e) => {
        console.error('[reading] Failed to save reading progress:', e)
        toast.error("Couldn't save reading progress")
      })
  }, [bookHash])

  const queueProgress = useCallback(
    (location: string, fraction: number) => {
      if (!restoredRef.current) return
      pendingRef.current = { location, fraction }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flushProgress, PROGRESS_DEBOUNCE_MS)
    },
    [flushProgress],
  )

  // Flush pending progress when leaving the route and before the window closes, or a quick read is lost.
  useEffect(() => {
    window.addEventListener('beforeunload', flushProgress)
    return () => {
      window.removeEventListener('beforeunload', flushProgress)
      flushProgress()
    }
  }, [flushProgress])

  // ── Book data: load highlights/bookmarks into the store, fetch progress to restore position ──
  // Loaded once on open; later edits update the store mirror in place, no re-read.
  const initialLocationRef = useRef<string | null>(null)
  const [dataReady, setDataReady] = useState(false)
  useEffect(() => {
    if (!bookHash) return
    let cancelled = false
    setDataReady(false)
    restoredRef.current = false
    void (async () => {
      try {
        const [, saved] = await Promise.all([loadBookData(bookHash), reading.getProgress(bookHash)])
        if (cancelled) return
        initialLocationRef.current = saved?.location ?? null
      } catch (e) {
        console.error('[reading] Failed to load highlights / progress:', e)
        toast.error("Couldn't load this book's highlights and reading position")
      } finally {
        // Continue anyway: failing to read old data shouldn't lock the user out; worst case they start from the top.
        if (!cancelled) setDataReady(true)
      }
    })()
    return () => {
      cancelled = true
      clearBookData()
    }
  }, [bookHash])

  // ── Engine instance + position state derived from relocate ──
  const [engine, setEngine] = useState<FoliateEngine | null>(null)
  const [fraction, setFraction] = useState(0)
  const [sectionMarks, setSectionMarks] = useState<number[]>([])
  // TOC: tree + current chapter href + current CFI (for "jump to current position").
  const [toc, setToc] = useState<TocNode[]>([])
  const [currentHref, setCurrentHref] = useState<string | null>(null)
  const [currentCfi, setCurrentCfi] = useState<string | null>(null)
  // Page numbers: current / total both come from the engine's pagination map (location ticks, layout-independent), never persisted.
  // This is just a render snapshot; the source is engine.pagination, re-read via onChange on relocate.
  const [pageInfo, setPageInfo] = useState<{ current: number | null; total: number | null }>({
    current: null,
    total: null,
  })
  const { current: currentPage, total: totalPages } = pageInfo
  // Visible range on screen (relocate range-CFI endpoints, [start, end)): for the header bookmark toggle and sidebar "current" marker.
  const [visibleRange, setVisibleRange] = useState<CfiRange | null>(null)

  // ── Chrome / sidebar / notes ──
  // Header/footer hidden by default (immersive); revealed only via the hover bands at the top/bottom edge (see below).
  const [chromeVisible, setChromeVisible] = useState(false)
  // Settings dialog (opened from the header, focused on the Reading section). The reader is a full-screen route outside AppShell
  // and can't reach the shell's instance, so it mounts its own copy of the same component.
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Keep chrome visible while the dialog is open: hovering the dialog counts as leaving the header, and hiding it would
  // leave the user hunting for the settings button after closing the dialog.
  const chromeShown = chromeVisible || settingsOpen
  const hideChrome = (): void => {
    if (!settingsOpen) setChromeVisible(false)
  }
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Highlight id whose editor is expanded inline in the sidebar Highlights tab (set by write note / edit / note bubble).
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  // Highlights / bookmarks from the shared store (DB-driven): highlights are redrawn on open, bookmarks drive the header toggle.
  const annotations = useAnnotations()
  const bookmarks = useBookmarks()
  // Highlight being edited in the note dialog (the activeNoteId one; null if deleted / missing -> dialog closes).
  const activeNote = activeNoteId ? annotations.find((a) => a.id === activeNoteId) ?? null : null

  // ── Typography (engine) / theme / translation ──
  // Font size and family are account-level settings (user_setting): read-only here, edited only in the Reading section
  // of the global settings dialog. The facade broadcasts after writes (onSettingsChange), so the body reflows live.
  const settingsQuery = useAsyncData(() => getSettings(), [])
  // Defaults are used while loading (and on read failure), but **not fed to the engine** (see the loading early-return
  // in the typography effect): otherwise the book would lay out at 16px, then visibly reflow at 20px.
  const { data: settings = DEFAULT_SETTINGS, loading: settingsLoading, reload: reloadSettings } = settingsQuery
  useEffect(() => onSettingsChange(() => void reloadSettings()), [reloadSettings])
  // Page light/dark follows the app theme: CDS tokens recolor the chrome automatically,
  // but the book lives in an iframe the engine can't style with tokens, so the resolved light/dark flag is passed in with typography.
  const dark = useDarkMode()
  // Inline translation: in-memory toggle. Only reflowable EPUB can be translated; fixed layout (PDF)
  // has no text flow (engine.isFixedLayout), so the header disables the button; also disabled until the engine is ready.
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const translatable = !!engine && !engine.isFixedLayout
  // Sentence translation provider: per-device memory (localStorage). Shared across the reader: switching it in the translate popup
  // also switches inline translation for later paragraphs, and persists across app restarts.
  const [translationProvider, setTranslationProvider] = useState<TranslationProvider>(
    readTranslationProvider,
  )
  const changeTranslationProvider = useCallback((p: TranslationProvider) => {
    setTranslationProvider(p)
    storeTranslationProvider(p)
  }, [])
  // Translation API failed: turn the toggle off (a lit button that no longer translates looks broken) + suggest another provider.
  // Turning off is a normal teardown that clears translated paragraphs; the cache is kept so re-enabling needn't refetch.
  const handleTranslationFail = useCallback(() => {
    setTranslationEnabled(false)
    toast.warning('Inline translation failed and was turned off. Try another translation service.')
  }, [])
  // Reader root container: host for the page theme color probe.
  const containerRef = useRef<HTMLDivElement>(null)

  // Stable FoliateView callbacks (otherwise the open-book effect rebuilds the engine).
  const handleEngineReady = useCallback((e: FoliateEngine) => setEngine(e), [])
  const handleEngineGone = useCallback(() => setEngine(null), [])

  // Subscribe to engine position changes: fraction, current chapter href, visible range, section ticks, TOC tree.
  useEffect(() => {
    if (!engine) return
    setSectionMarks(engine.sectionFractions())
    setToc(engine.getTOC())
    const off = engine.onRelocate((loc) => {
      const f = loc.fraction ?? 0
      setFraction(f)
      setCurrentHref(loc.tocItem?.href ?? null)
      setCurrentCfi(loc.cfi ?? null)
      if (loc.cfi) queueProgress(loc.cfi, f)
      setVisibleRange(engine.visibleCfiRange())
      // Section ticks may only become available on the first relocate; fill them in then.
      setSectionMarks((prev) => (prev.length ? prev : engine.sectionFractions()))
    })
    return off
  }, [engine, queueProgress])

  // Page numbers follow the pagination map, which broadcasts onChange on relocate and CFI page backfill;
  // re-reading here keeps all four page displays (indicator / sidebar / note dialog / TOC) consistent.
  useEffect(() => {
    if (!engine) return
    const map = engine.pagination
    // Always create a new object (no early-out): the change may only affect a CFI's in-chapter position, and the sidebar's
    // "p N" still needs refreshing. onChange only fires on real changes, so this isn't wasteful.
    const sync = (): void => setPageInfo({ current: map.currentPage, total: map.totalPages })
    sync()
    return map.onChange(sync)
  }, [engine])

  // "p N" lookup for the sidebar / note dialog (pagination map is the only source). New reference only when engine changes.
  const pageOfCfi = useCallback((cfi: string) => engine?.pagination.pageOfCfi(cfi) ?? null, [engine])
  const pageOfFraction = useCallback(
    (f: number) => engine?.pagination.pageOfFraction(f) ?? null,
    [engine],
  )

  // Reading time tracking (no UI): position key shares the location-tick domain with UI page numbers.
  // currentPage is 1-based; convert back to 0-based for the timer core. Not fed while pagination isn't ready (first frame / PDF).
  // **Known limitation**: PDFs produce no position-based events (idle / hide / close still settle segments); PDF timing needs a
  // different position key and isn't supported yet.
  useReadingTracker(bookHash, currentPage == null ? null : currentPage - 1, totalPages, fraction)

  // ── Read aloud: session state lives in the hook / session core; Reader only handles UI open/close ──
  const tts = useTtsSession(engine, bookHash)
  const [ttsExpanded, setTtsExpanded] = useState(false)
  // When the session ends (finished / error / stopped), close the full player too instead of leaving an empty panel
  useEffect(() => {
    if (!tts.active) setTtsExpanded(false)
  }, [tts.active])

  // Restore the last reading position once the book data has loaded (initialLocationRef filled), only once.
  // Start recording progress only after the jump (or if never read), else the first relocate would save "page 1".
  useEffect(() => {
    if (!engine || !dataReady) return
    const saved = initialLocationRef.current
    if (!saved) {
      restoredRef.current = true // Never read: nothing to restore, start recording now
      return
    }
    // Must wait for goTo to settle: until it lands, the engine still emits "page 1" relocates, and releasing
    // early would save that as progress, permanently if goTo fails (stale CFI).
    void engine
      .goTo(saved)
      .catch((e) => {
        console.error('[reading] Failed to restore reading position:', e)
        toast.warning("Couldn't restore your last reading position")
      })
      .finally(() => {
        restoredRef.current = true
      })
  }, [engine, dataReady])

  // Redraw existing highlights. foliate doesn't persist overlays (lost on section change), so redraw whenever a section's overlay is created.
  // Deliberately **not depending on annotations**: individual add/recolor/delete draw in place (SelectionAnnotator / callbacks below);
  // depending on it would redraw every highlight on each note keystroke. Read the latest value via ref.
  const annotationsRef = useRef(annotations)
  annotationsRef.current = annotations
  useEffect(() => {
    if (!engine) return
    const paint = (list: AnnotationRecord[]): void => {
      for (const a of list) {
        void engine.drawAnnotation({ value: a.cfi, style: OVERLAY_STYLE[a.style], color: HIGHLIGHT_INK[a.color] })
        if (a.note.trim()) void engine.drawNote(a.cfi, HIGHLIGHT_INK[a.color])
      }
    }
    paint(annotationsRef.current)
    return engine.onOverlayCreated((index) => {
      // Only redraw this section's highlights: others would be no-ops but each still costs a CFI parse,
      // i.e. 100 highlights x every section entered. Fall back to the whole book if section bounds are unavailable.
      const range = engine.sectionCfiRange(index)
      if (!range) return paint(annotationsRef.current)
      paint(annotationsRef.current.filter((a) => reading.isCfiInSection(a.cfi, range.start, range.end)))
    })
  }, [engine, dataReady])

  // Typography -> engine: font size/family from settings + fixed rest, injected and reflowed live. Theme colors aren't hard-coded:
  // a probe reads the resolved CDS page bg/fg colors (data-mode on <html> is set by the app theme,
  // so the probe reflects the current mode; this effect must re-run when dark changes).
  useEffect(() => {
    if (!engine || settingsLoading) return
    const container = containerRef.current
    let pageBg = ''
    let pageFg = ''
    if (container) {
      const probe = document.createElement('div')
      probe.style.cssText =
        'position:absolute;visibility:hidden;pointer-events:none;background-color:var(--color-page-bg);color:var(--color-text-100)'
      container.appendChild(probe)
      const cs = getComputedStyle(probe)
      pageBg = cs.backgroundColor
      pageFg = cs.color
      container.removeChild(probe)
    }
    const fixed = getFixedTypography()
    engine.applyAppearance({
      fontSize: settings.readingFontSize,
      fontFamily: settings.readingFontFamily,
      lineHeight: fixed.lineHeight,
      justify: fixed.justify,
      hyphenate: fixed.hyphenate,
      paragraphSpacing: fixed.paragraphSpacing,
      maxInlineSize: fixed.maxWidth,
      marginPx: fixed.marginPx,
      // Bottom margin makes room for the bottom band (holding the page number), plus the mini bar during read aloud (see constants).
      marginBottomPx: readerMarginBottomPx(fixed.marginPx, tts.active),
      columns: fixed.columns,
      pageBg,
      pageFg,
      dark,
    })
    // Only depend on the tts.active boolean (one reflow on start/stop; restoration handled by the engine's scheduleReflowRestore),
    // not the whole tts object: the hook returns a new object every render, which would reflow every frame.
  }, [engine, settingsLoading, settings.readingFontSize, settings.readingFontFamily, dark, tts.active])

  // Inline translation: when on, lazily translates visible paragraphs and appends Vietnamese below the original (in the book iframe, see hook).
  useInlineTranslation(
    engine,
    translationEnabled && translatable,
    translationProvider,
    handleTranslationFail,
  )
  // If the open book can't be translated (PDF), reset any leftover on state so the header doesn't show it as on.
  useEffect(() => {
    if (!translatable) setTranslationEnabled(false)
  }, [translatable])

  // ── Paging / chapter navigation (all through the engine) ──
  const goPrevPage = useCallback(() => engine?.prevPage(), [engine])
  const goNextPage = useCallback(() => engine?.nextPage(), [engine])

  // Chapter navigation by section start ticks: previous = last tick strictly below the current fraction (mid-chapter goes to
  // its start, at the start goes to the previous chapter); next = first tick strictly above.
  const prevChapterMark = [...sectionMarks].reverse().find((m) => m < fraction - EPS)
  const nextChapterMark = sectionMarks.find((m) => m > fraction + EPS)
  const goPrevChapter = useCallback(() => {
    if (prevChapterMark !== undefined) void engine?.goToFraction(prevChapterMark)
  }, [engine, prevChapterMark])
  const goNextChapter = useCallback(() => {
    if (nextChapterMark !== undefined) void engine?.goToFraction(nextChapterMark)
  }, [engine, nextChapterMark])
  const seekFraction = useCallback((f: number) => void engine?.goToFraction(f), [engine])

  // ── Keyboard paging (not intercepted inside interactive elements). FoliateView has no keyboard handling; handled here. ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.(INTERACTIVE_SELECTOR)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        engine?.nextPage()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        engine?.prevPage()
      }
    }
    window.addEventListener('keydown', onKey)
    // Each section is its own iframe and keydown doesn't bubble to window: after clicking the body, arrow keys would die.
    // The engine forwards keys from each section to the same handler, so paging logic lives in one place.
    const offEngineKey = engine?.onKeydown(onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      offEngineKey?.()
    }
  }, [engine])

  // ── Highlights / bookmarks (shared annotationStore, DB-driven; new selection highlights appear in the list immediately) ──
  // Current chapter title is only used to name new bookmarks; neither stores chapter names, list grouping is computed from CFI (grouping.ts).
  const currentChapterLabel = useMemo(() => findChapterLabel(toc, currentHref), [toc, currentHref])

  // Bookmarks on this screen: same rule for the header toggle and the sidebar "current" marker (util.itemsInRange, cfi within
  // the visible range, independent of page numbers). Empty until the engine reports a position, so the toggle shows as off.
  const pageBookmarks = itemsInRange(bookmarks, visibleRange)
  const bookmarked = pageBookmarks.length > 0

  // Open the note dialog for a highlight (shared by selection note / edit / note bubble).
  const openNote = useCallback((id: string) => setActiveNoteId(id), [])

  // Clicking a highlight/note item only jumps to the text (editing has its own Edit entry).
  const navigateAnnotation = useCallback((a: AnnotationRecord) => void engine?.goTo(a.cfi), [engine])

  // Update note: write to the store and add/remove the note anchor (same-color bubble) in the body.
  const updateNote = useCallback(
    (id: string, note: string) => {
      updateAnnotation(id, { note })
      const a = getAnnotation(id)
      if (a) {
        if (note.trim()) void engine?.drawNote(a.cfi, HIGHLIGHT_INK[a.color])
        else void engine?.eraseNote(a.cfi)
      }
    },
    [engine],
  )

  // Delete highlight: also erase the body highlight + note anchor (like readest); clear focus if it was focused.
  const removeAnnotationById = useCallback(
    (id: string) => {
      const a = getAnnotation(id)
      if (a) {
        void engine?.eraseAnnotation(a.cfi)
        void engine?.eraseNote(a.cfi)
      }
      removeAnnotation(id)
      setActiveNoteId((cur) => (cur === id ? null : cur))
    },
    [engine],
  )

  // Add a bookmark at the current reading position. Default name is the chapter title, editable in the bookmark list.
  // Deliberately **not baking page numbers into the title**: titles are persisted, page numbers are computed at runtime.
  // Falls back to "Bookmark" when there's no chapter title.
  const addBookmarkAtCurrent = useCallback(() => {
    // No CFI before the engine reports its first position; don't add a bookmark then.
    if (!currentCfi) return
    createBookmark({ cfi: currentCfi, title: currentChapterLabel || 'Bookmark' })
  }, [currentCfi, currentChapterLabel])

  // Header bookmark toggle: if this page has bookmarks, remove them all (clears any duplicates); otherwise add one.
  const toggleBookmark = useCallback(() => {
    if (pageBookmarks.length > 0) pageBookmarks.forEach((b) => removeBookmark(b.id))
    else addBookmarkAtCurrent()
  }, [pageBookmarks, addBookmarkAtCurrent])

  // Clicking a bookmark item: jump to it.
  const navigateBookmark = useCallback((b: BookmarkRecord) => void engine?.goTo(b.cfi), [engine])

  // Row not loaded yet / load error / empty (no such book or deleted): don't enter the reader.
  if (!book)
    return (
      <ReaderFallback
        loading={bookQuery.loading}
        error={bookQuery.error}
        onBackToShelf={() => navigate('/reading')}
      />
    )

  return (
    <div ref={containerRef} className="relative flex min-h-0 flex-1 overflow-hidden bg-page-bg">
      {/* Left sidebar (Contents / Highlights / Bookmarks, real data): collapsible. */}
      <div
        className={cn(
          'shrink-0 overflow-hidden transition-[width] duration-200 ease-out',
          sidebarOpen ? 'w-[300px]' : 'w-0',
        )}
      >
        <ReaderSidebar
          className="h-full w-[300px] border-r-[0.5px] border-border-300"
          open={sidebarOpen}
          toc={toc}
          currentHref={currentHref}
          currentPage={currentPage}
          visibleRange={visibleRange}
          pageOfFraction={pageOfFraction}
          pageOfCfi={pageOfCfi}
          onNavigate={(href) => void engine?.goTo(href)}
          onNavigateToCurrent={() => {
            if (currentCfi) void engine?.goTo(currentCfi)
          }}
          onNavigateAnnotation={navigateAnnotation}
          onEditAnnotation={openNote}
          onRemoveAnnotation={removeAnnotationById}
          onNavigateBookmark={navigateBookmark}
          onRenameBookmark={renameBookmark}
          onRemoveBookmark={removeBookmark}
          onAddBookmark={addBookmarkAtCurrent}
        />
      </div>

      {/* Center: body (engine + selection highlights) fills the area; header/footer are overlays toggled by top/bottom hover bands.
          data-view-transition-root: snapshot boundary for the full-screen slide page turn. On page turn the engine finds this
          container via closest() from the renderer and gives it view-transition-name: foliate-turn, so body + page indicator + margins
          (and the hidden header/footer) slide as one sheet (like macOS Books). See reading/engine/foliateEngine for turn-style wiring. */}
      <div
        data-view-transition-root=""
        className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
      >
        <FoliateView
          loadBook={loadBook}
          onEngineReady={handleEngineReady}
          onEngineGone={handleEngineGone}
        >
          {engine && (
            <SelectionAnnotator
              engine={engine}
              onOpenNote={openNote}
              onSpeakSelection={tts.startFromSelection}
              onSpeakCfi={tts.startFromCfi}
              translationProvider={translationProvider}
              onTranslationProviderChange={changeTranslationProvider}
            />
          )}
        </FoliateView>

        {/* Persistent bottom-right page indicator (like readest): absolutely positioned in the bottom band
            (margin-bottom reserves BOTTOM_BAND_PX so it never covers the last line), always x / y; fades out when the footer
            covers the band. Inside the center snapshot root, so it slides with the body on page turn. */}
        <PageIndicator
          currentPage={currentPage}
          totalPages={totalPages}
          fraction={fraction}
          chromeOpen={chromeShown}
        />

        {/* "Back to read-aloud position": shown 4px from the top, centered, after manually paging away (like readest). Always mounted, fades via opacity
            with the same 200ms transition as the chrome; fixed position so it doesn't move away as the mouse approaches.
            **Fades out when the header appears**: they share the top strip and it would cover the title.
            So the button column must block the top hover band itself (inner h-12 eats pointer events, z-30 above
            the band's z-10); otherwise reaching up for the button would hit the 40–48px gap below it, reveal the header,
            and the button would fade before it could be clicked. Approaching from the side still reveals the header as usual.
            Outer pointer-events-none lets the sides pass through to the body; the inner layer ignores events while hidden. */}
        {tts.active && (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 z-30 flex h-12 items-start justify-center pt-1 transition-opacity duration-200 ease-out',
              tts.detached && !chromeShown ? 'opacity-100' : 'opacity-0',
            )}
          >
            <div className={cn('h-full', tts.detached && !chromeShown && 'pointer-events-auto')}>
              <Button
                variant="secondary"
                round
                className="border-border-300 bg-surface-popover shadow-popover"
                onClick={tts.returnToTtsLocation}
              >
                Back to read-aloud position
              </Button>
            </div>
          </div>
        )}

        {/* Read-aloud mini bar: stays at the bottom of the body during a session (like readest). Resting at bottom-12 = band height
            (BOTTOM_BAND_PX=48), so its bottom edge sits on the band's top; lifts 8px (-translate-y-2) when the footer appears, leaving
            a gap above the footer's h-12. Lifting uses translate rather than bottom: no layout, same motion vocabulary as the chrome,
            and only one number (bottom-12) to maintain.
            z-30 > footer z-20, so it sits above the footer without blocking its slider and buttons. Outer pointer-events-none lets
            the sides pass through to the body. */}
        {tts.active && (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-12 z-30 flex justify-center px-6 transition-transform duration-200 ease-out',
              chromeShown ? '-translate-y-2' : 'translate-y-0',
            )}
          >
            <div className="pointer-events-auto flex w-full max-w-md justify-center">
              <TtsBarPlayer
                book={book.title}
                chapter={currentChapterLabel}
                playing={tts.playing}
                elapsed={tts.elapsed}
                duration={tts.duration}
                measuredFraction={tts.bufferedFraction}
                hasTimeline
                repeating={tts.repeating}
                onTogglePlay={tts.togglePlay}
                onPrevSentence={tts.prevSentence}
                onNextSentence={tts.nextSentence}
                onToggleRepeat={tts.toggleRepeat}
                onSeek={tts.seek}
                onStop={tts.stop}
                onExpand={() => setTtsExpanded(true)}
              />
            </div>
          </div>
        )}

        {/* Top/bottom hover bands (same height as the bars): moving the mouse to the edge reveals the chrome. Without them hidden chrome
            would have no discoverable entry (even "Back to Library" lives in the header).
            Removed once chrome is shown so they don't steal clicks and selection from the top/bottom 48px (like readest). */}
        {!chromeShown && (
          <>
            <div className="absolute inset-x-0 top-0 z-10 h-12" onMouseEnter={() => setChromeVisible(true)} />
            <div className="absolute inset-x-0 bottom-0 z-10 h-12" onMouseEnter={() => setChromeVisible(true)} />
          </>
        )}

        {/* Header overlay */}
        <div
          className={cn(
            // Transition list uses translate, not transform: Tailwind v4's translate-y-* sets the `translate`
            // property (not `transform`); with transform the slide would jump and only opacity would animate.
            'absolute inset-x-0 top-0 z-20 transition-[translate,opacity] duration-200 ease-out',
            chromeShown ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0',
          )}
          onMouseLeave={hideChrome}
        >
          {/* Inline translation: header toggle drives useInlineTranslation; disabled for non-translatable layouts (PDF). */}
          <ReaderHeaderBar
            title={book.title}
            author={book.author}
            bookmarked={bookmarked}
            translationOn={translationEnabled}
            translatable={translatable}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onToggleBookmark={toggleBookmark}
            onToggleTranslation={() => setTranslationEnabled((v) => !v)}
            onOpenSettings={() => setSettingsOpen(true)}
            onBackToShelf={() => navigate('/reading')}
          />
        </div>

        {/* Footer overlay */}
        <div
          className={cn(
            // Uses translate for the same reason as the header.
            'absolute inset-x-0 bottom-0 z-20 transition-[translate,opacity] duration-200 ease-out',
            chromeShown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
          )}
          onMouseLeave={hideChrome}
        >
          <ReaderFooterBar
            fraction={fraction}
            canPrev={fraction > EPS}
            canNext={fraction < 1 - EPS}
            canPrevChapter={prevChapterMark !== undefined}
            canNextChapter={nextChapterMark !== undefined}
            ttsOpen={tts.active}
            onPrevPage={goPrevPage}
            onNextPage={goNextPage}
            onPrevChapter={goPrevChapter}
            onNextChapter={goNextChapter}
            onSeekFraction={seekFraction}
            onToggleTts={tts.toggleTts}
          />
        </div>
      </div>

      <TtsFullPlayer
        open={ttsExpanded && tts.active}
        onOpenChange={setTtsExpanded}
        book={book.title}
        chapter={currentChapterLabel}
        playing={tts.playing}
        elapsed={tts.elapsed}
        duration={tts.duration}
        measuredFraction={tts.bufferedFraction}
        hasTimeline
        repeating={tts.repeating}
        rate={tts.rate}
        voiceId={tts.voiceId}
        onTogglePlay={tts.togglePlay}
        onPrevSentence={tts.prevSentence}
        onNextSentence={tts.nextSentence}
        onToggleRepeat={tts.toggleRepeat}
        onSeek={tts.seek}
        onRateChange={tts.setRate}
        onVoiceChange={tts.setVoice}
      />

      {/* Write / edit note dialog (from selection note / note anchor bubble / highlight Edit): driven by activeNoteId. */}
      <NoteDialog
        annotation={activeNote}
        page={activeNote ? pageOfCfi(activeNote.cfi) : null}
        onSave={updateNote}
        onRemove={removeAnnotationById}
        onClose={() => setActiveNoteId(null)}
      />

      {/* Global settings dialog (from the header, focused on the Reading section): the reader is outside AppShell,
          so it mounts its own instance; font size/family changes reflow live behind the dialog. */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} initialSection="reading" />
    </div>
  )
}

/**
 * Fallback screen before opening: loading row / row error / book not in the Library (no row or tombstone). Missing files are handled by FoliateView's error state.
 * "Failed to load" and "no such book" must be distinct: reporting a DB/IPC error as "deleted" would push users to delete and
 * re-import a book that's actually still there.
 */
function ReaderFallback({
  loading,
  error,
  onBackToShelf,
}: {
  loading: boolean
  error: unknown
  onBackToShelf: () => void
}): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-page-bg">
      {loading ? (
        <span className="text-sm text-text-muted">Opening book…</span>
      ) : (
        <>
          <p className="text-sm font-medium text-text-primary">
            {error ? "Couldn't load the book" : "This book isn't in your Reading list"}
          </p>
          <p className="max-w-md text-center text-xs text-text-muted">
            {error ? (error instanceof Error ? error.message : String(error)) : 'It may have been deleted.'}
          </p>
          <Button variant="secondary" size="sm" onClick={onBackToShelf}>
            Back to Reading
          </Button>
        </>
      )}
    </div>
  )
}
