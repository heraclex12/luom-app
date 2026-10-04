/**
 * Speed tick ruler for the full player's speed view, adapted from readest's `TickRuler` + `SpeedRuler`.
 *
 * Changes from upstream:
 *   - Merged into one speed-only component (no gap settings here).
 *   - Driven by a radix Slider instead of an invisible native range; `onValueCommit` replaces
 *     upstream's 500ms debounce.
 *   - The highlighted current tick IS the Slider thumb (follows the value, has a focus ring).
 *   - Colors use CDS tokens.
 *
 * Dragging only updates a local preview; the rate is committed on release.
 */
import { useMemo, useState } from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'
import { formatRate, RATE_MAX, RATE_MIN, RATE_STEP } from './playback'

/** Labeled long-tick marks (ends follow the rate range, middle ones are round values). */
const RATE_MARKS = [RATE_MIN, 1, 1.5, 2, 2.5, RATE_MAX]

export function SpeedRuler({
  rate,
  onSelect,
}: {
  rate: number
  onSelect: (rate: number) => void
}): React.JSX.Element {
  // Preview while dragging: label follows, rate changes on release.
  const [preview, setPreview] = useState<number | null>(null)
  const current = preview ?? rate

  const ticks = useMemo(
    () =>
      Array.from(
        { length: Math.round((RATE_MAX - RATE_MIN) / RATE_STEP) + 1 },
        // Round to 2 decimals to avoid float drift and keep keys stable.
        (_, i) => Math.round((RATE_MIN + i * RATE_STEP) * 100) / 100,
      ),
    [],
  )

  const toPercent = (value: number): number => ((value - RATE_MIN) / (RATE_MAX - RATE_MIN)) * 100
  // Hide mark labels too close to the current-value label. Compare in steps, not values,
  // to avoid float error hiding marks early.
  const hideSteps = Math.round(((RATE_MAX - RATE_MIN) * 0.08) / RATE_STEP)
  const isMark = (tick: number): boolean =>
    RATE_MARKS.some((mark) => Math.round(mark * 100) === Math.round(tick * 100))

  return (
    <div dir="ltr" className="w-full px-3 pt-1 pb-2">
      <div className="relative h-5">
        {RATE_MARKS.map((mark) => (
          <span
            key={mark}
            className={cn(
              'absolute top-0 -translate-x-1/2 text-xs tabular-nums text-text-muted',
              Math.round(Math.abs(mark - current) / RATE_STEP) < hideSteps && 'invisible',
            )}
            style={{ left: `${toPercent(mark)}%` }}
          >
            {mark.toFixed(1)}
          </span>
        ))}
        <span
          className="absolute top-0 -translate-x-1/2 text-xs font-semibold tabular-nums text-text-000"
          style={{ left: `${toPercent(current)}%` }}
        >
          {formatRate(current)}
        </span>
      </div>

      <SliderPrimitive.Root
        className="relative flex h-7 w-full touch-none select-none items-center"
        value={[current]}
        min={RATE_MIN}
        max={RATE_MAX}
        step={RATE_STEP}
        onValueChange={(v) => setPreview(v[0]!)}
        onValueCommit={(v) => {
          setPreview(null)
          onSelect(v[0]!)
        }}
      >
        {/* No track line: the ticks are the track; Track only positions them and catches clicks. */}
        <SliderPrimitive.Track className="relative h-7 w-full grow">
          {ticks.map((tick) => (
            <span
              key={tick}
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
                isMark(tick) ? 'h-5 w-0.5 bg-alpha-4' : 'h-3.5 w-px bg-alpha-2',
              )}
              style={{ left: `${toPercent(tick)}%` }}
            />
          ))}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label="Speed"
          aria-valuetext={formatRate(current)}
          className="block h-7 w-0.5 rounded-full bg-fill-primary outline-none focus-visible:shadow-focus"
        />
      </SliderPrimitive.Root>
    </div>
  )
}
