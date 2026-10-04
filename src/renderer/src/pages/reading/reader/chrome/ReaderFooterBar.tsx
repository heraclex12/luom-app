import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Volume2 } from 'lucide-react'
import { TooltipProvider } from '@/components/ui'
import { cn } from '@/lib/cn'
import { ToolButton } from './ToolButton'

/**
 * Reader footer bar (single-row toolbar) — page/chapter navigation, draggable progress slider, Read aloud.
 *
 * Slider position is the engine's book fraction (0–1). Page number isn't here: it lives below the text
 * (see PageIndicator), which fades out while this bar shows.
 */

export interface ReaderFooterBarProps {
  /** Book fraction (0–1, slider position). */
  fraction: number
  canPrev: boolean
  canNext: boolean
  canPrevChapter: boolean
  canNextChapter: boolean
  ttsOpen: boolean
  onPrevPage: () => void
  onNextPage: () => void
  onPrevChapter: () => void
  onNextChapter: () => void
  /** Drag/click the track to jump to a book fraction (0–1). */
  onSeekFraction: (fraction: number) => void
  onToggleTts: () => void
}

export function ReaderFooterBar(props: ReaderFooterBarProps): React.JSX.Element {
  const {
    fraction,
    canPrev,
    canNext,
    canPrevChapter,
    canNextChapter,
    ttsOpen,
    onPrevPage,
    onNextPage,
    onPrevChapter,
    onNextChapter,
    onSeekFraction,
    onToggleTts,
  } = props

  return (
    <TooltipProvider delayDuration={400}>
      <footer className="flex h-12 items-center gap-4 bg-page-bg/85 px-4 backdrop-blur">
        {/* Left: previous chapter / previous page */}
        <ToolButton label="Previous chapter" onClick={onPrevChapter} disabled={!canPrevChapter}>
          <ChevronsLeft className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Previous page" onClick={onPrevPage} disabled={!canPrev}>
          <ChevronLeft className="size-[18px]" />
        </ToolButton>

        {/* Progress slider (fills remaining space) */}
        <ProgressSlider fraction={fraction} onSeek={onSeekFraction} />

        {/* Right: Read aloud / next page / next chapter */}
        <ToolButton label="Read aloud" onClick={onToggleTts} active={ttsOpen}>
          <Volume2 className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Next page" onClick={onNextPage} disabled={!canNext}>
          <ChevronRight className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Next chapter" onClick={onNextChapter} disabled={!canNextChapter}>
          <ChevronsRight className="size-[18px]" />
        </ToolButton>
      </footer>
    </TooltipProvider>
  )
}

/**
 * Draggable progress slider (CDS has no Slider yet; built from pointer events + tokens).
 *
 * While dragging only the thumb moves (`dragFraction`); the jump happens on release — calling
 * `goToFraction` on every pointermove would repaginate the whole book each frame.
 */
function ProgressSlider({
  fraction,
  onSeek,
}: {
  fraction: number
  onSeek: (fraction: number) => void
}): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)
  // null = not dragging: thumb follows the engine fraction.
  const [dragFraction, setDragFraction] = useState<number | null>(null)
  const dragging = dragFraction !== null
  const pct = Math.min(100, Math.max(0, (dragFraction ?? fraction) * 100))

  const fractionFromClientX = (clientX: number): number | null => {
    const el = trackRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width))
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragFraction(fractionFromClientX(e.clientX))
      }}
      onPointerMove={(e) => {
        if (dragging) setDragFraction(fractionFromClientX(e.clientX))
      }}
      // Jump on release (a click on the track goes here too). A pointer cancel abandons the drag
      // without jumping — unlike release, the user didn't confirm the target.
      onPointerUp={(e) => {
        if (dragFraction !== null) onSeek(dragFraction)
        setDragFraction(null)
        e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={() => setDragFraction(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, fraction - 0.01))
        else if (e.key === 'ArrowRight') onSeek(Math.min(1, fraction + 0.01))
      }}
      className="group relative flex h-6 min-w-0 flex-1 cursor-pointer items-center outline-none"
    >
      <div className="h-1 w-full rounded-full bg-border-300">
        <div className="h-full rounded-full bg-fill-accent" style={{ width: `${pct}%` }} />
      </div>
      <div
        className={cn(
          'absolute size-3 -translate-x-1/2 rounded-full bg-fill-accent shadow-sm ring-2 ring-page-bg transition-transform',
          dragging ? 'scale-125' : 'group-hover:scale-110',
        )}
        style={{ left: `${pct}%` }}
      />
    </div>
  )
}
