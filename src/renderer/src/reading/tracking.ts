// Reading-time orchestration: ties the pure tracker core (trackerCore), the calibrated clock and user_reading_event writes into a per-book tracker.
//
// Two concerns are handled here so pages don't need to know:
// 1. **Units** — the core counts seconds, the table stores ms; conversion happens only here (so startTime has second precision).
// 2. **Idle cut-off** — the core ignores idleness (it never reads `idleTimeoutSeconds`); the timer lives here, pages just feed positions.
//
// Events are best-effort telemetry: write failures are logged, never shown to the user or allowed to interrupt reading.
import type { Db } from '@/db/client'
import { addReadingEvent } from './events'
import { DEFAULT_STATS_TRACKING_CONFIG, TrackerCore, type FlushedEvent } from './trackerCore'

/** A per-book reading tracker. Lives while the book is open: create on open, stop on close. */
export interface ReadingTracker {
  /**
   * Position changed (page turn / jump / reflow): settle the previous page, start a new session, re-arm the idle timer.
   * Feeding the same page again doesn't restart timing (the core checks), so extra relocate calls are harmless.
   */
  onPage(page: number, totalPages: number, fraction: number): Promise<void>
  /** Settle the current session and pause (window hidden / book closed / idle — all a flush to the core). */
  stop(): Promise<void>
}

/**
 * Create a tracker for a book. `now` is the calibrated clock (epoch ms), bound by the facade.
 * `fraction` is the fraction of the page being settled: on a page change, settle with the old value, then switch.
 */
export function createReadingTracker(db: Db, bookHash: string, now: () => number): ReadingTracker {
  const cfg = DEFAULT_STATS_TRACKING_CONFIG
  const core = new TrackerCore(cfg)
  let fraction = 0
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  const nowSec = (): number => Math.floor(now() / 1000)

  const clearIdle = (): void => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = null
  }

  const persist = async (events: FlushedEvent[], atFraction: number): Promise<void> => {
    for (const e of events) {
      try {
        await addReadingEvent(db, {
          bookHash,
          startTime: e.startTime * 1000,
          durationMs: e.duration * 1000,
          fraction: atFraction,
        })
      } catch (err) {
        console.error('[reading] Failed to record reading event:', err)
      }
    }
  }

  return {
    async onPage(page, totalPages, f) {
      // The settled session belongs to the page just left, so use the fraction before updating it.
      const done = persist(core.onPage(page, totalPages, nowSec()), fraction)
      fraction = f
      clearIdle()
      // No page turn before the timeout = not reading: settle and pause until the next page turn.
      idleTimer = setTimeout(() => {
        idleTimer = null
        void persist(core.onIdle(nowSec()), fraction)
      }, cfg.idleTimeoutSeconds * 1000)
      await done
    },
    async stop() {
      clearIdle()
      await persist(core.onClose(nowSec()), fraction)
    },
  }
}
