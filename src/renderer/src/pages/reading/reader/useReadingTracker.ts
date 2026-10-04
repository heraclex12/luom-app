import { useEffect, useRef } from 'react'
import * as reading from '@/reading'

/**
 * Reading time tracking (no UI): feeds reader position changes into the domain timer, settling on window hide / book close.
 * One continuous stay = one `user_reading_event` row (append-only, immutable); reading stats are derived from these.
 *
 * This hook only handles four triggers (position change, window hidden, window close, book close); idle cut-off, duration bounds and s/ms conversion live in `@/reading`.
 *
 * `page` is a **position key** = foliate location tick (~1500 bytes each, content-derived, layout-independent). UI page numbers
 * use the same ticks (callers pass `currentPage - 1` to get back to 0-based). It only answers "did the position change" in memory
 * and is never persisted (only fraction is). Chapter index won't do: a 10-minute chapter would log just one 120s-capped event.
 */
export function useReadingTracker(
  bookHash: string,
  page: number | null,
  totalPages: number | null,
  fraction: number,
): void {
  const trackerRef = useRef<reading.ReadingTracker | null>(null)
  // Latest position: needed to resume when visible again, since the feeding effect below only runs on real position changes.
  const latestRef = useRef({ page, totalPages, fraction })
  latestRef.current = { page, totalPages, fraction }

  // One timer per book; settled when leaving the reader (or closing the window).
  // Window close is best-effort: beforeunload can't wait for async writes, so the last segment may be lost.
  useEffect(() => {
    if (!bookHash) return
    const tracker = reading.createReadingTracker(bookHash)
    trackerRef.current = tracker
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        void tracker.stop()
        return
      }
      // Must re-feed the position when visible again: hidden already settled and paused the timer, and without a re-feed
      // timing never restarts (switching away and back, then reading the same page for 30 min would log nothing).
      // stop cleared the core's pending state, so a same-page re-feed isn't blocked by "don't restart on same page".
      const { page: p, totalPages: total, fraction: f } = latestRef.current
      if (p != null) void tracker.onPage(p, total ?? 0, f)
    }
    const onUnload = (): void => void tracker.stop()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onUnload)
      trackerRef.current = null
      void tracker.stop()
    }
  }, [bookHash])

  // Feed on every position change. Re-feeding the same page doesn't restart timing (core decides), so extra relocates are harmless.
  // Empty page = engine hasn't produced a page number yet; nothing to feed.
  useEffect(() => {
    if (page == null) return
    void trackerRef.current?.onPage(page, totalPages ?? 0, fraction)
  }, [page, totalPages, fraction])
}
