import { useEffect, useRef, useState } from 'react'
import type {
  AnnotationRecord,
  EngineSelection,
  FoliateEngine,
  HandlePoint,
  HighlightColor,
  HighlightStyle,
  LookupTermVerdict,
} from '@/reading'
import { cleanLookupTerm, judgeLookupTerm } from '@/reading'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'
import { AnnotationPopup } from './AnnotationPopup'
import { TranslatorPopup } from './TranslatorPopup'
import { DictPopup } from './DictPopup'
import { WordDetailPopup } from './WordDetailPopup'
import { HIGHLIGHT_INK, OVERLAY_STYLE } from '../constants'
import type { TranslationProvider } from '../translation/providerMemory'
import { readHighlightMemory, storeHighlightMemory, type HighlightMemory } from './highlightMemory'
import { useViewportAnchor } from './useViewportAnchor'
import { relativeDay } from '../util'
import {
  createAnnotation,
  findAnnotationByCfi,
  getAnnotation,
  removeAnnotation,
  updateAnnotation,
  useAnnotations,
} from '../annotationStore'

/**
 * Selection & highlight orchestration on the real engine — bridges foliate's select / hit events
 * to `AnnotationPopup` and paints highlights via the engine's overlayer.
 *
 * Responsibilities:
 *  - `engine.onSelect`: show the toolbar below the selection; hide when cleared. Only clicking blank
 *    page space / turning the page dismisses it (iframe blur from the palette doesn't).
 *  - Two-level highlight: one click adds an overlay with the remembered style + color; the strip
 *    redraws it in place; clicking again removes it. Style / color memory lives here.
 *  - Clicking an existing highlight (`engine.onAnnotationClick`): enters edit mode with draggable
 *    handles at both ends (readest range editor); clicking a note anchor shows a note preview bubble.
 *  - Copy uses the clipboard; Add note = highlight + open its note editor in the sidebar (`onOpenNote`).
 *
 * Highlights are stored locally via the shared [annotationStore](./annotationStore.ts)
 * (user_book_annotation). Each has a stable UUID as identity and its CFI as overlay key (the CFI
 * changes while dragging handles). Position (chapter, order, "p N") is always derived from the CFI;
 * page numbers are never stored.
 */

/**
 * Max stored highlight text length. It's only a display excerpt, so truncate on write to stay
 * within a 65535-byte TEXT column.
 */
const HIGHLIGHT_TEXT_MAX_LEN = 2000
const clipText = (v: string): string => v.slice(0, HIGHLIGHT_TEXT_MAX_LEN)

/**
 * Popup target: a fresh selection, or an existing highlight in edit mode (by stable id, anchored
 * at the click). Anchor is always bottom y + line height, so the popup can flip above.
 */
type PopupTarget =
  | { kind: 'selection'; sel: EngineSelection }
  | { kind: 'edit'; id: string; x: number; y: number; height: number }

export interface SelectionAnnotatorProps {
  engine: FoliateEngine
  /** Add note / note bubble: open the sidebar Highlights tab and expand this note's editor. */
  onOpenNote?: (id: string) => void
  /** Selection popup "Read aloud": read from the selected sentence onward. */
  onSpeakSelection?: () => void
  /** Edit-mode "Read aloud": read from this highlight onward (located by CFI). */
  onSpeakCfi?: (cfi: string) => void
  /** Sentence translation provider (device memory, owned by host; see translation/providerMemory). */
  translationProvider: TranslationProvider
  /** Provider switched in the translator: host persists it; inline translation follows. */
  onTranslationProviderChange: (p: TranslationProvider) => void
}

export function SelectionAnnotator({
  engine,
  onOpenNote,
  onSpeakSelection,
  onSpeakCfi,
  translationProvider,
  onTranslationProviderChange,
}: SelectionAnnotatorProps): React.JSX.Element | null {
  // Persistent memory: default style + last color per style (localStorage).
  // Lazy init avoids re-reading localStorage on every render. `mem` is this render's view (remember swaps the ref).
  const memRef = useRef<HighlightMemory | null>(null)
  const mem = (memRef.current ??= readHighlightMemory())

  const [target, setTarget] = useState<PopupTarget | null>(null)
  // Translator popup (text snapshot + anchor); mutually exclusive with the toolbar.
  const [translateTarget, setTranslateTarget] = useState<{ text: string; x: number; y: number; height: number } | null>(null)
  // Lookup card (term snapshot + verdict + anchor); mutually exclusive with the toolbar.
  const [dictTarget, setDictTarget] = useState<{
    term: string
    verdict: Exclude<LookupTermVerdict, 'none'>
    x: number
    y: number
    height: number
  } | null>(null)
  // Full entry window: centered; closing returns to the lookup card (so both coexist).
  const [fullTerm, setFullTerm] = useState<string | null>(null)
  const [noteBubble, setNoteBubble] = useState<{ id: string; x: number; y: number; height: number; note: string; createdAt: number } | null>(null)
  // Range edit: highlight id + handle positions (window coords). null = not editing.
  const [rangeEdit, setRangeEdit] = useState<{ id: string; start: HandlePoint; end: HandlePoint } | null>(null)

  const remember = (color: HighlightColor, style: HighlightStyle): void => {
    // Two quick changes may happen without a re-render, so read the latest from the ref.
    const cur = memRef.current ?? mem
    memRef.current = { style, colors: { ...cur.colors, [style]: color } }
    storeHighlightMemory(memRef.current)
  }
  // Add / redraw one highlight: the engine replaces any overlay with the same CFI.
  // Highlights with notes get a same-color note anchor at the end.
  const paint = (rec: AnnotationRecord): void => {
    void engine.drawAnnotation({ value: rec.cfi, style: OVERLAY_STYLE[rec.style], color: HIGHLIGHT_INK[rec.color] })
    if (rec.note.trim()) void engine.drawNote(rec.cfi, HIGHLIGHT_INK[rec.color])
  }
  // Dismiss: clear state, end range edit, clear the native selection.
  const close = (): void => {
    setTarget(null)
    setTranslateTarget(null)
    setDictTarget(null)
    setFullTerm(null)
    setNoteBubble(null)
    setRangeEdit(null)
    engine.endRangeEdit()
    engine.clearSelection()
  }
  // "Translate": hide toolbar / handles and open the translator (keeps the selection snapshot).
  const openTranslate = (text: string, x: number, y: number, height: number): void => {
    setTarget(null)
    setNoteBubble(null)
    setRangeEdit(null)
    setDictTarget(null)
    setFullTerm(null)
    engine.endRangeEdit()
    setTranslateTarget({ text, x, y, height })
  }
  // "Look up": hide toolbar / handles and open the lookup card (term snapshot, keeps selection).
  const openLookup = (
    term: string,
    verdict: Exclude<LookupTermVerdict, 'none'>,
    x: number,
    y: number,
    height: number,
  ): void => {
    setTarget(null)
    setNoteBubble(null)
    setRangeEdit(null)
    setTranslateTarget(null)
    engine.endRangeEdit()
    setDictTarget({ term, verdict, x, y, height })
  }

  useEffect(() => {
    const offSelect = engine.onSelect((sel) => {
      // Any selection change ends range edit and closes the translator / lookup card.
      setNoteBubble(null)
      setRangeEdit(null)
      setTranslateTarget(null)
      setDictTarget(null)
      setFullTerm(null)
      engine.endRangeEdit()
      setTarget(sel ? { kind: 'selection', sel } : null)
    })
    const offClick = engine.onAnnotationClick((hit) => {
      const rec = findAnnotationByCfi(hit.value)
      if (!rec) return
      setTranslateTarget(null)
      setDictTarget(null)
      setFullTerm(null)
      if (hit.isNote) {
        // Clicked a note anchor: show the note preview bubble.
        setTarget(null)
        setRangeEdit(null)
        engine.endRangeEdit()
        setNoteBubble({ id: rec.id, x: hit.x, y: hit.y, height: hit.height, note: rec.note, createdAt: rec.createdAt })
      } else {
        // Clicked the highlight itself: edit mode + draggable handles.
        setNoteBubble(null)
        setTarget({ kind: 'edit', id: rec.id, x: hit.x, y: hit.y, height: hit.height })
        // A bad CFI can't be resolved → engine returns null: toolbar still works, but no handles;
        // toast explains why the range can't be adjusted.
        const h = engine.beginRangeEdit(rec.cfi)
        if (!h) toast.warning("Couldn't locate this highlight's range, so it can't be adjusted")
        setRangeEdit(h ? { id: rec.id, start: h.start, end: h.end } : null)
      }
    })
    return () => {
      offSelect()
      offClick()
    }
  }, [engine])

  // Host-level dismissal: clicks outside the page (sidebar / bars) or Esc. Clicks inside the book
  // iframe go through the engine. The popup and handles carry data-annotation-layer, so they don't count.
  const popupOpen = !!target || !!noteBubble || !!translateTarget || !!dictTarget || !!fullTerm
  useEffect(() => {
    if (!popupOpen) return
    // Radix modals opened from the popup (e.g. remove confirmation, note editor) portal to body.
    // While one is open, yield — otherwise its buttons count as "outside" and Esc closes everything.
    const modalOpen = (): boolean =>
      !!document.querySelector('[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]')
    // Dropdowns in the popup (meaning source, more actions) also portal to body. Radix wraps all popper
    // content in data-radix-popper-content-wrapper, so recognizing that covers Dropdown / Select /
    // Popover / Tooltip without each needing our private marker.
    const inLayer = (el: EventTarget | null): boolean =>
      !!(el as Element | null)?.closest?.('[data-annotation-layer],[data-radix-popper-content-wrapper]')
    const onPointerDown = (e: PointerEvent): void => {
      if (inLayer(e.target)) return
      if (modalOpen()) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !modalOpen()) close()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [popupOpen, engine])

  // The highlight being range-edited was deleted elsewhere (sidebar) → drop handles and end the
  // session, otherwise dragging would write to a deleted record.
  const annotations = useAnnotations()
  useEffect(() => {
    if (rangeEdit && !annotations.some((a) => a.id === rangeEdit.id)) {
      setRangeEdit(null)
      engine.endRangeEdit()
    }
  }, [annotations, rangeEdit, engine])

  // Latest range while dragging (not yet saved). Dragging only updates the engine visually; we save
  // once on pointer up to avoid an IPC write + store emit per pointermove.
  const pendingRangeRef = useRef<{ id: string; cfi: string; text: string } | null>(null)

  // Dragging a handle: redraw with the current style/color, update CFI/text and handle positions.
  const onHandleDrag = (edge: 'start' | 'end', clientX: number, clientY: number): void => {
    if (!rangeEdit) return
    const rec = getAnnotation(rangeEdit.id)
    if (!rec) return
    // The store still has the old CFI mid-drag, so take the last painted one from pending.
    const oldCfi = pendingRangeRef.current?.cfi ?? rec.cfi
    const h = engine.dragRangeEdit(edge, clientX, clientY, OVERLAY_STYLE[rec.style], HIGHLIGHT_INK[rec.color])
    if (!h) return
    // CFI changed and the highlight has a note: move the note anchor.
    if (rec.note.trim() && oldCfi !== h.value) {
      void engine.eraseNote(oldCfi)
      void engine.drawNote(h.value, HIGHLIGHT_INK[rec.color])
    }
    pendingRangeRef.current = { id: rec.id, cfi: h.value, text: clipText(h.text) }
    setRangeEdit((prev) => (prev ? { ...prev, start: h.start, end: h.end } : prev))
  }

  // Pointer up: save the final range once. No-op if nothing was dragged.
  const onHandleDragEnd = (): void => {
    const pending = pendingRangeRef.current
    pendingRangeRef.current = null
    if (pending) updateAnnotation(pending.id, { cfi: pending.cfi, text: pending.text })
  }

  return (
    <>
      {target?.kind === 'selection' &&
        (() => {
          const sel = target.sel
          const existing = findAnnotationByCfi(sel.cfi)
          // Lookup verdict: the engine already provides the cleaned term; just decide whether to show Look up.
          const verdict = judgeLookupTerm(sel.lookupTerm)
          return (
            <AnnotationPopup
              key={sel.cfi}
              anchor={{ x: sel.x, y: sel.y, height: sel.height }}
              existingHighlight={existing ? { id: existing.id, color: existing.color, style: existing.style } : undefined}
              initialStyle={mem.style}
              initialStyleColors={mem.colors}
              onHighlight={(color, style) => {
                remember(color, style)
                const cur = findAnnotationByCfi(sel.cfi)
                if (cur) {
                  updateAnnotation(cur.id, { color, style })
                  paint({ ...cur, color, style })
                  return cur.id
                }
                const rec = createAnnotation({
                  cfi: sel.cfi,
                  text: clipText(sel.text),
                  color,
                  style,
                  note: '',
                })
                paint(rec)
                return rec.id
              }}
              onRestyleHighlight={(id, color, style) => {
                remember(color, style)
                const rec = getAnnotation(id)
                if (rec) {
                  updateAnnotation(id, { color, style })
                  paint({ ...rec, color, style })
                }
              }}
              onRemoveHighlight={(id) => {
                const rec = getAnnotation(id)
                if (rec) {
                  void engine.eraseAnnotation(rec.cfi)
                  // The note anchor is a separate overlay; remove both (as in Reader.removeAnnotationById),
                  // or a ghost bubble remains. No-op for plain highlights.
                  void engine.eraseNote(rec.cfi)
                }
                removeAnnotation(id)
              }}
              onTranslate={() => openTranslate(sel.text, sel.x, sel.y, sel.height)}
              // verdict 'none' (no usable term) → omit to hide Look up.
              onLookup={
                verdict === 'none'
                  ? undefined
                  : () => openLookup(sel.lookupTerm, verdict, sel.x, sel.y, sel.height)
              }
              onWriteNote={() => {
                const cur = findAnnotationByCfi(sel.cfi)
                const style = cur?.style ?? mem.style
                const color = cur?.color ?? mem.colors[style]
                // Reuse the existing highlight (sync color/style), else create one, then open the note.
                const rec =
                  cur ??
                  createAnnotation({
                    cfi: sel.cfi,
                    text: clipText(sel.text),
                    color,
                    style,
                    note: '',
                  })
                if (cur) updateAnnotation(cur.id, { color, style })
                paint({ ...rec, color, style })
                close()
                onOpenNote?.(rec.id)
              }}
              onCopy={() => {
                void navigator.clipboard?.writeText(sel.text)
                toast.info('Copied to clipboard')
                close()
              }}
              onSpeak={() => {
                // Read the selection before close: close may clear it
                onSpeakSelection?.()
                close()
              }}
            />
          )
        })()}

      {target?.kind === 'edit' &&
        (() => {
          const rec = getAnnotation(target.id)
          if (!rec) return null
          // Edit mode has no live selection; look up the highlight text itself.
          const editTerm = cleanLookupTerm(rec.text)
          const editVerdict = judgeLookupTerm(editTerm)
          return (
            <AnnotationPopup
              key={`edit-${rec.id}`}
              anchor={{ x: target.x, y: target.y, height: target.height }}
              existingHighlight={{ id: rec.id, color: rec.color, style: rec.style }}
              // Pass per-style colors in edit mode too, or switching style would reset to yellow.
              initialStyle={rec.style}
              initialStyleColors={mem.colors}
              onHighlight={() => rec.id /* already a highlight; edit mode closes after removal */}
              onRestyleHighlight={(id, color, style) => {
                remember(color, style)
                const r = getAnnotation(id)
                if (r) {
                  updateAnnotation(id, { color, style })
                  paint({ ...r, color, style })
                  // Nudge a re-render so the handles pick up the new color.
                  setRangeEdit((prev) => (prev ? { ...prev } : prev))
                }
              }}
              onRemoveHighlight={(id) => {
                const r = getAnnotation(id)
                if (r) {
                  void engine.eraseAnnotation(r.cfi)
                  void engine.eraseNote(r.cfi)
                }
                removeAnnotation(id)
                close()
              }}
              onTranslate={() => openTranslate(rec.text, target.x, target.y, target.height)}
              onLookup={
                editVerdict === 'none'
                  ? undefined
                  : () => openLookup(editTerm, editVerdict, target.x, target.y, target.height)
              }
              onWriteNote={() => {
                close()
                onOpenNote?.(rec.id)
              }}
              onCopy={() => {
                void navigator.clipboard?.writeText(rec.text)
                toast.info('Copied to clipboard')
                close()
              }}
              onSpeak={() => {
                onSpeakCfi?.(rec.cfi)
                close()
              }}
            />
          )
        })()}

      {/* Range edit handles (drag to extend/shrink), in the highlight's ink color. */}
      {rangeEdit &&
        (() => {
          const ink = HIGHLIGHT_INK[getAnnotation(rangeEdit.id)?.color ?? 'yellow']
          return (
            <>
              <RangeHandle
                edge="start"
                pos={rangeEdit.start}
                color={ink}
                onDrag={onHandleDrag}
                onDragEnd={onHandleDragEnd}
              />
              <RangeHandle
                edge="end"
                pos={rangeEdit.end}
                color={ink}
                onDrag={onHandleDrag}
                onDragEnd={onHandleDragEnd}
              />
            </>
          )
        })()}

      {/* Note preview bubble (from a note anchor) */}
      {noteBubble && (
        <NoteBubble
          note={noteBubble.note}
          createdAt={noteBubble.createdAt}
          x={noteBubble.x}
          y={noteBubble.y}
          height={noteBubble.height}
          onOpen={() => {
            const id = noteBubble.id
            setNoteBubble(null)
            onOpenNote?.(id)
          }}
        />
      )}

      {/* Translator popup; keyed by text so a new sentence re-translates */}
      {translateTarget && (
        <TranslatorPopup
          key={translateTarget.text}
          text={translateTarget.text}
          x={translateTarget.x}
          y={translateTarget.y}
          height={translateTarget.height}
          provider={translationProvider}
          onProviderChange={onTranslationProviderChange}
        />
      )}

      {/* Lookup card; keyed by term. "Translate this" switches to the translator when not found / too long. */}
      {dictTarget && (
        <DictPopup
          key={dictTarget.term}
          term={dictTarget.term}
          verdict={dictTarget.verdict}
          x={dictTarget.x}
          y={dictTarget.y}
          height={dictTarget.height}
          onTranslate={() =>
            openTranslate(dictTarget.term, dictTarget.x, dictTarget.y, dictTarget.height)
          }
          onOpenFull={() => setFullTerm(dictTarget.term)}
          // Hide (but keep mounted) while the full entry window is on top.
          hidden={!!fullTerm}
        />
      )}

      {/* Full entry window: non-modal, centered; closing returns to the lookup card. */}
      {fullTerm && <WordDetailPopup key={fullTerm} term={fullTerm} onClose={() => setFullTerm(null)} />}
    </>
  )
}

/** Note preview bubble — note + relative time; click to open its editor in the sidebar. Clamped to viewport. */
function NoteBubble({
  note,
  createdAt,
  x,
  y,
  height,
  onOpen,
}: {
  note: string
  createdAt: number
  x: number
  y: number
  /** Note anchor height, used to clear the line when flipping above. */
  height: number
  onOpen: () => void
}): React.JSX.Element {
  const { ref, left, top } = useViewportAnchor<HTMLButtonElement>(x, y, height)
  return (
    <button
      ref={ref}
      data-annotation-layer=""
      type="button"
      className="anim-pop btn-squish fixed z-50 block w-[260px] -translate-x-1/2 rounded-card bg-surface-3 p-3 text-left shadow-popover transition-colors hover:bg-surface-2"
      style={{ left, top }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onOpen}
    >
      <p className="text-[13px] leading-relaxed text-text-secondary">{note}</p>
      <p className="mt-1.5 text-[11px] text-text-muted">{relativeDay(createdAt)}</p>
    </button>
  )
}

/**
 * Range edit handle — a vertical caret with a knob at one end of the highlight (start knob on top,
 * end knob at bottom). Dragging moves that end to the pointer.
 */
function RangeHandle({
  edge,
  pos,
  color,
  onDrag,
  onDragEnd,
}: {
  edge: 'start' | 'end'
  pos: HandlePoint
  /** Handle color (= the highlight's HIGHLIGHT_INK, as a literal since it's outside the book iframe). */
  color: string
  onDrag: (edge: 'start' | 'end', clientX: number, clientY: number) => void
  /** Pointer up: drag ended (parent saves the final range). */
  onDragEnd: () => void
}): React.JSX.Element {
  const dragging = useRef(false)
  // Pointer up and pointercancel share cleanup; the range is only saved here.
  const endDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    dragging.current = false
    onDragEnd()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }
  return (
    <div
      // Handles don't count as "outside" (otherwise pressing one would dismiss edit mode).
      data-annotation-layer=""
      className="fixed z-50 flex -translate-x-1/2 cursor-ew-resize touch-none justify-center"
      style={{ left: pos.x, top: edge === 'start' ? pos.y : pos.y - pos.height, height: pos.height, width: 16 }}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        dragging.current = true
      }}
      onPointerMove={(e) => {
        if (dragging.current) onDrag(edge, e.clientX, e.clientY)
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Caret line */}
      <span className="block h-full w-0.5" style={{ backgroundColor: color }} />
      {/* Knob: top for start, bottom for end */}
      <span
        className={cn(
          'absolute left-1/2 size-3.5 -translate-x-1/2 rounded-full shadow-sm',
          edge === 'start' ? 'bottom-full' : 'top-full',
        )}
        style={{ backgroundColor: color }}
      />
    </div>
  )
}
