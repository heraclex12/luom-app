import { cn } from '@/lib/cn'
import { pageIndicatorLabel } from '../util'

/**
 * Persistent page number at the bottom right of the text (like readest): right-aligned and vertically
 * centered in the bottom margin band, always `x / y` (falls back to percent). `h-12` must equal
 * `BOTTOM_BAND_PX` (48); the right padding uses the same `--reading-margin-x` token as the text.
 *
 * Fades out entirely when the footer bar shows: the bar is the same height and translucent, so
 * the number would show through as a blur.
 *
 * Absolutely positioned in the bottom band (paginator margin-bottom reserves `BOTTOM_BAND_PX`), so
 * it never overlaps text. It's an overlay rather than in-flow so it slides with the page during
 * slide transitions — it must sit inside the snapshot root (`[data-view-transition-root]`)
 * without shrinking foliate-view. `pointer-events-none` keeps the bottom hover zone working.
 */
export function PageIndicator({
  currentPage,
  totalPages,
  fraction,
  chromeOpen,
}: {
  /** Current page number; if this or total is missing, show percent. */
  currentPage: number | null
  /** Total pages in the book. */
  totalPages: number | null
  /** Book fraction 0–1 (percent fallback). */
  fraction: number
  /** Whether the footer bar is showing: fade out while it is. */
  chromeOpen: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-12 items-center justify-end pe-[var(--reading-margin-x)] transition-opacity duration-200 ease-out',
        chromeOpen ? 'opacity-0' : 'opacity-100',
      )}
    >
      <span className="text-xs tabular-nums text-text-muted">
        {pageIndicatorLabel(currentPage, totalPages, fraction)}
      </span>
    </div>
  )
}
