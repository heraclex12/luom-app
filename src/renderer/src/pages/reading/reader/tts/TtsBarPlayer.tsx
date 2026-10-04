/**
 * Read-aloud mini player: a bar pinned to the bottom of the text during a session, based on readest's `TTSMiniPlayer`.
 *
 * Layout: fixed single row (h-14) with cover / title / chapter / transport buttons; the cover + text block
 * opens the full player. Icon sizes are matched by visible ink, not canvas.
 *
 * Changes from readest:
 *   - Pill-shaped shell and round cover.
 *   - Progress is a stroked arc along the bottom edge (see `ProgressArc`), and it's draggable.
 *     While hovering / dragging, the chapter line swaps to elapsed / remaining time.
 *   - Extra repeat-sentence button (loop the current sentence; essential for learners).
 *   - CDS tokens throughout: popover surface; progress layers use one color at different opacities.
 *   - Desktop hover and press feedback on transport buttons.
 *
 * Presentational only: state and actions come from props; it only holds drag preview and hover state.
 */
import { useState } from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { Pause, Play, Repeat1, SkipBack, SkipForward, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { Cover } from './Cover'
import { bufferedPercent, percentToSeconds, playbackLabels } from './playback'

export interface TtsBarPlayerProps {
  book: string
  chapter: string
  playing: boolean
  /** Elapsed seconds in the chapter. */
  elapsed: number
  /** Total chapter duration (seconds). */
  duration: number
  /** Synthesized fraction 0–1; the buffer layer extends to here. */
  measuredFraction: number
  /** Native voices have no timeline: hide the progress bar, show only the chapter name. */
  hasTimeline: boolean
  /** Looping the current sentence. */
  repeating: boolean
  onTogglePlay: () => void
  onPrevSentence: () => void
  onNextSentence: () => void
  onToggleRepeat: () => void
  /** Called on drag release: jump, snapped to a sentence. */
  onSeek: (seconds: number) => void
  onStop: () => void
  /** Click on cover / title: open the full player (speed and voice live there). */
  onExpand: () => void
}

export function TtsBarPlayer({
  book,
  chapter,
  playing,
  elapsed,
  duration,
  measuredFraction,
  hasTimeline,
  repeating,
  onTogglePlay,
  onPrevSentence,
  onNextSentence,
  onToggleRepeat,
  onSeek,
  onStop,
  onExpand,
}: TtsBarPlayerProps): React.JSX.Element {
  // Drag preview percentage: readouts follow the pointer, but seek only happens on release.
  const [preview, setPreview] = useState<number | null>(null)
  const [railHover, setRailHover] = useState(false)

  const live = playbackLabels(elapsed, duration)
  const percent = preview ?? live.percent
  const shown = preview === null ? live : playbackLabels(percentToSeconds(preview, duration), duration)
  const buffered = bufferedPercent(live.percent, measuredFraction)
  // Hovering (or dragging) the progress arc swaps the subtitle for time readouts (the pill has fixed height).
  const showTime = hasTimeline && (railHover || preview !== null)

  return (
    <div
      role="status"
      aria-label={`Reading aloud: ${book}`}
      // overflow-hidden is part of the layout: it clips the bottom progress line to the rounded ends.
      className="relative w-full max-w-md overflow-hidden rounded-full border border-border-300 bg-surface-popover shadow-popover"
    >
      <div className="flex h-14 items-center gap-1 px-3">
        <div
          role="button"
          tabIndex={0}
          onClick={onExpand}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onExpand()
          }}
          aria-label="Open full player"
          // Hover area is also a pill: p-1 makes its left arc concentric with the round cover.
          className="can-focus flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full p-1 hover:bg-alpha-1"
        >
          <Cover book={book} className="size-10 rounded-full text-sm" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm text-text-000">{book}</span>
            {showTime ? (
              <span dir="ltr" className="truncate text-xs tabular-nums text-text-muted">
                {shown.elapsed} · {shown.remaining}
              </span>
            ) : (
              chapter && <span className="truncate text-xs text-text-muted">{chapter}</span>
            )}
          </div>
        </div>

        {/* Transport order doesn't flip with writing direction (audio timeline convention).
            z-10 lifts this row above the progress arc's 12px hit area, which overlaps the buttons slightly. */}
        <div dir="ltr" className="relative z-10 flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            round
            onClick={onToggleRepeat}
            aria-label="Repeat sentence"
            aria-pressed={repeating}
            title={repeating ? 'Repeating — click to stop' : 'Repeat sentence'}
            // Highlighted with a chip color while active: it's a persistent mode, not a one-off action.
            className={cn(
              repeating ? 'bg-bg-accent-chip text-text-accent hover:bg-bg-accent-chip' : 'text-text-100',
            )}
          >
            <Repeat1 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            round
            onClick={onPrevSentence}
            aria-label="Previous sentence"
            title="Previous sentence"
            className="text-text-100"
          >
            <SkipBack className="size-6 fill-current" />
          </Button>
          {/* Play button: near-black circle + inverted symbol (lucide has no filled play-circle). */}
          <Button
            variant="primary"
            size="icon"
            round
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <Pause className="size-3.5 fill-current" />
            ) : (
              // The triangle's visual center sits left; nudge right to center it in the circle.
              <Play className="size-3.5 translate-x-px fill-current" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            round
            onClick={onNextSentence}
            aria-label="Next sentence"
            title="Next sentence"
            className="text-text-100"
          >
            <SkipForward className="size-6 fill-current" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            round
            onClick={onStop}
            aria-label="Stop reading aloud"
            title="Stop reading aloud"
            className="text-text-100"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {hasTimeline && (
        <ProgressArc
          percent={percent}
          buffered={buffered}
          disabled={duration === 0}
          onHoverChange={setRailHover}
          onPreview={setPreview}
          onCommit={(p) => {
            setPreview(null)
            onSeek(percentToSeconds(p, duration))
          }}
        />
      )}
    </div>
  )
}

/**
 * Chapter progress: a stroked arc along the pill's bottom edge, with three layers (track / buffered / played).
 *
 * A straight bottom line would be cut off by the rounded ends; a `border-bottom` follows the curve and
 * tapers at both ends. Layers share one color at different opacities (buffer is just ahead of played).
 * Clipped with clip-path from the right, so width adapts.
 *
 * Dragging uses a transparent Slider along the bottom edge; the transport row sits above it.
 */
function ProgressArc({
  percent,
  buffered,
  disabled,
  onHoverChange,
  onPreview,
  onCommit,
}: {
  percent: number
  buffered: number
  disabled: boolean
  onHoverChange: (hovering: boolean) => void
  onPreview: (percent: number) => void
  onCommit: (percent: number) => void
}): React.JSX.Element {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-0 border-b-[3px] border-b-alpha-2" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border-0 border-b-[3px] border-b-alpha-4"
        style={{ clipPath: `inset(0 ${100 - buffered}% 0 0)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border-0 border-b-[3px] border-b-fill-primary"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
      />
      <SliderPrimitive.Root
        // Only the bottom 12px: any taller and it overlaps the play button, turning clicks into seeks.
        className="absolute inset-x-0 bottom-0 flex h-3 touch-none select-none items-end"
        value={[percent]}
        max={100}
        step={0.1}
        disabled={disabled}
        onValueChange={(v) => onPreview(v[0]!)}
        onValueCommit={(v) => onCommit(v[0]!)}
        onPointerEnter={() => onHoverChange(true)}
        onPointerLeave={() => onHoverChange(false)}
      >
        {/* Track isn't colored: the arcs above are the visuals; this is just the hit area. */}
        <SliderPrimitive.Track className="relative h-3 w-full grow" />
        {/* No visible thumb: the arc is the progress; it only shows on keyboard focus. */}
        <SliderPrimitive.Thumb
          aria-label="Chapter progress"
          className="block size-2 -translate-y-0.5 rounded-full bg-fill-primary opacity-0 outline-none focus-visible:opacity-100"
        />
      </SliderPrimitive.Root>
    </>
  )
}
