/**
 * Full read-aloud player: the panel opened from the mini player's cover, based on readest's `TTSPlayerSheet`.
 *
 * Layout: large cover + centered title / chapter, chapter progress, transport row, and entry cards
 * at the bottom that open sub-views inside the same panel (back button in the header) instead of
 * stacking another popover.
 *
 * Changes from readest:
 *   - No sleep timer, offline audio, paragraph navigation or gap rulers.
 *   - Adds a repeat-sentence button (matches the mini player).
 *   - Voices grouped by accent (Edge is the only engine).
 *   - A centered CDS Dialog instead of a mobile bottom sheet.
 *
 * Presentational only: state and actions come from props; it only holds the current sub-view and drag preview.
 */
import { useEffect, useState } from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { Check, ChevronLeft, Pause, Play, Repeat1, SkipBack, SkipForward, Speech } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  ScrollArea,
} from '@/components/ui'
import { Cover } from './Cover'
import {
  bufferedPercent,
  formatClock,
  formatRate,
  percentToSeconds,
  playbackLabels,
} from './playback'
import { SpeedRuler } from './SpeedRuler'
import { VOICE_GROUPS, voiceName } from './voices'

/** Sub-views inside the panel. All but the main view get a "back + title" header. */
type PlayerView = 'main' | 'speed' | 'voice'

const VIEW_TITLES: Record<PlayerView, string> = {
  main: 'Read aloud',
  speed: 'Speed',
  voice: 'Choose voice',
}

export interface TtsFullPlayerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: string
  chapter: string
  playing: boolean
  /** Elapsed seconds in the chapter. */
  elapsed: number
  /** Total chapter duration (seconds). */
  duration: number
  /** Synthesized fraction 0–1; the buffer layer extends to here. */
  measuredFraction: number
  /** Without a timeline, the progress bar collapses to a "left in chapter" line. */
  hasTimeline: boolean
  /** Looping the current sentence. */
  repeating: boolean
  rate: number
  voiceId: string
  onTogglePlay: () => void
  onPrevSentence: () => void
  onNextSentence: () => void
  onToggleRepeat: () => void
  /** Called on drag release: jump, snapped to a sentence. */
  onSeek: (seconds: number) => void
  onRateChange: (rate: number) => void
  onVoiceChange: (voiceId: string) => void
}

export function TtsFullPlayer({
  open,
  onOpenChange,
  book,
  chapter,
  playing,
  elapsed,
  duration,
  measuredFraction,
  hasTimeline,
  repeating,
  rate,
  voiceId,
  onTogglePlay,
  onPrevSentence,
  onNextSentence,
  onToggleRepeat,
  onSeek,
  onRateChange,
  onVoiceChange,
}: TtsFullPlayerProps): React.JSX.Element {
  const [view, setView] = useState<PlayerView>('main')

  // Always reopen on the main view.
  useEffect(() => {
    if (open) setView('main')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Minimum height so switching to a shorter sub-view doesn't shrink the panel (main view is ~400px).
          DialogContent's default grid is swapped for a flex column so sub-views can center vertically. */}
      <DialogContent className="flex max-w-sm min-h-96 flex-col gap-0 p-4">
        <DialogDescription className="sr-only">Read-aloud controls</DialogDescription>

        {view === 'main' ? (
          // Main view has no visible title row (it would push the cover down); title is for screen readers only.
          <DialogTitle className="sr-only">{VIEW_TITLES.main}</DialogTitle>
        ) : (
          <div className="relative flex h-8 shrink-0 items-center">
            <Button
              variant="ghost"
              size="iconSm"
              round
              onClick={() => setView('main')}
              aria-label="Back"
              className="text-text-300"
            >
              <ChevronLeft className="size-5" />
            </Button>
            {/* Absolutely centered: the back and close buttons differ in width, so flex centering would be off. */}
            <DialogTitle className="pointer-events-none absolute inset-x-0 text-center">
              {VIEW_TITLES[view]}
            </DialogTitle>
          </div>
        )}

        {view === 'main' && (
          <div className="flex flex-col items-center gap-4 pt-2">
            <Cover book={book} className="size-32 rounded-card text-4xl" />
            <div className="flex w-full flex-col items-center gap-0.5 text-center">
              <span className="line-clamp-1 font-semibold text-text-000">{book}</span>
              {chapter && <span className="line-clamp-1 text-sm text-text-muted">{chapter}</span>}
            </div>

            {hasTimeline ? (
              <ChapterScrubber
                elapsed={elapsed}
                duration={duration}
                measuredFraction={measuredFraction}
                onSeek={onSeek}
              />
            ) : (
              // Native voices have no timeline: no progress or dragging, just an estimated time remaining.
              <span className="py-1 text-xs tabular-nums text-text-muted">
                {formatClock(duration - elapsed)} left in chapter
              </span>
            )}

            {/* Transport order doesn't flip with writing direction (audio timeline convention). */}
            <div dir="ltr" className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                round
                onClick={onToggleRepeat}
                aria-label="Repeat sentence"
                aria-pressed={repeating}
                title={repeating ? 'Repeating — click to stop' : 'Repeat sentence'}
                // Highlighted with a chip color while active: it's a persistent mode, not a one-off action.
                className={
                  repeating
                    ? 'bg-bg-accent-chip text-text-accent hover:bg-bg-accent-chip'
                    : 'text-text-300'
                }
              >
                <Repeat1 className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="iconLg"
                round
                onClick={onPrevSentence}
                aria-label="Previous sentence"
                title="Previous sentence"
                className="text-text-100"
              >
                <SkipBack className="size-6 fill-current" />
              </Button>
              <Button
                variant="primary"
                round
                onClick={onTogglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                className="size-14 min-w-0 p-0"
              >
                {playing ? (
                  <Pause className="size-6 fill-current" />
                ) : (
                  // The triangle's visual center sits left; nudge right to center it in the circle.
                  <Play className="size-6 translate-x-px fill-current" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="iconLg"
                round
                onClick={onNextSentence}
                aria-label="Next sentence"
                title="Next sentence"
                className="text-text-100"
              >
                <SkipForward className="size-6 fill-current" />
              </Button>
              {/* Spacer balancing the repeat button so the prev / play / next cluster is centered in the panel,
                  with the repeat button right next to it. */}
              <span aria-hidden className="size-9 shrink-0" />
            </div>

            <div className="flex w-full gap-2">
              <EntryCard label="Speed" onClick={() => setView('speed')}>
                <span className="text-sm font-semibold tabular-nums text-text-000">
                  {formatRate(rate)}
                </span>
              </EntryCard>
              <EntryCard label={voiceName(voiceId) ?? 'Voice'} onClick={() => setView('voice')}>
                <Speech className="size-4 text-text-100" />
              </EntryCard>
            </div>
          </div>
        )}

        {/* Only one ruler, so center it vertically instead of hanging at the top. */}
        {view === 'speed' && (
          <div className="flex flex-1 items-center">
            <SpeedRuler rate={rate} onSelect={onRateChange} />
          </div>
        )}

        {view === 'voice' && (
          <VoiceList
            selected={voiceId}
            onSelect={(id) => {
              onVoiceChange(id)
              // Return to the main view after choosing: changing voice is a one-off action.
              setView('main')
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Chapter progress: elapsed / three-layer track / remaining.
 * The buffer layer is a lighter shade of the played color (it's just ahead of played, not another state).
 * Same as the mini player, except the thumb is always visible here.
 */
function ChapterScrubber({
  elapsed,
  duration,
  measuredFraction,
  onSeek,
}: {
  elapsed: number
  duration: number
  measuredFraction: number
  onSeek: (seconds: number) => void
}): React.JSX.Element {
  // Drag preview percentage: readouts follow the pointer, but seek only happens on release.
  const [preview, setPreview] = useState<number | null>(null)

  const live = playbackLabels(elapsed, duration)
  const percent = preview ?? live.percent
  const shown =
    preview === null ? live : playbackLabels(percentToSeconds(preview, duration), duration)
  const buffered = bufferedPercent(live.percent, measuredFraction)

  return (
    <div dir="ltr" className="flex w-full items-center gap-2">
      <span className="w-10 shrink-0 text-xs tabular-nums text-text-muted">{shown.elapsed}</span>
      <SliderPrimitive.Root
        className="relative flex h-4 w-full grow touch-none select-none items-center"
        value={[percent]}
        max={100}
        step={0.1}
        disabled={duration === 0}
        onValueChange={(v) => setPreview(v[0]!)}
        onValueCommit={(v) => {
          setPreview(null)
          onSeek(percentToSeconds(v[0]!, duration))
        }}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-alpha-2">
          <div className="absolute inset-y-0 left-0 bg-alpha-4" style={{ width: `${buffered}%` }} />
          <SliderPrimitive.Range className="absolute inset-y-0 bg-fill-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label="Chapter progress"
          aria-valuetext={`${shown.elapsed} / ${formatClock(duration)}`}
          className="block size-3.5 rounded-full border border-border-300 bg-surface-0 shadow-sm outline-none focus-visible:shadow-focus"
        />
      </SliderPrimitive.Root>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-text-muted">
        {shown.remaining}
      </span>
    </div>
  )
}

/** Entry card into a sub-view: current value on top (speed number / voice icon), name below. */
function EntryCard({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="btn-squish can-focus flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg bg-fill-control transition-colors hover:bg-fill-control-hover"
    >
      {children}
      <span className="max-w-full truncate px-2 text-xs text-text-muted">{label}</span>
    </button>
  )
}

/** Voice list: grouped by accent, selected item checked. */
function VoiceList({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (voiceId: string) => void
}): React.JSX.Element {
  return (
    <ScrollArea className="max-h-80 w-full pt-1">
      {VOICE_GROUPS.map((group) => (
        <div key={group.locale} className="pb-1">
          <div className="px-2 py-1 text-xs text-text-muted">
            {group.label} · {group.voices.length}
          </div>
          {group.voices.map((voice) => (
            <button
              key={voice.id}
              type="button"
              onClick={() => onSelect(voice.id)}
              className="can-focus flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-alpha-1"
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                {selected === voice.id && <Check className="size-4 text-text-000" />}
              </span>
              <span className="truncate text-sm text-text-100">{voice.label}</span>
            </button>
          ))}
        </div>
      ))}
    </ScrollArea>
  )
}
