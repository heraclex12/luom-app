// Relative time for note cards. Uses local calendar-day boundaries (00:00), not a rolling 24h window,
// so an edit at 23:00 viewed at 08:00 the next morning shows "yesterday".
const DAY_MS = 24 * 60 * 60 * 1000

/** Epoch ms of local midnight for the given instant. */
function localMidnight(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * edit_time (epoch) → label by local calendar-day difference: today / yesterday / N days / weeks / months ago.
 * Rounding absorbs DST ±1h shifts between midnights.
 */
export function relTime(editTime: number, now: number): string {
  const d = Math.max(0, Math.round((localMidnight(now) - localMidnight(editTime)) / DAY_MS))
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 14) return '1 week ago'
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`
  if (d < 60) return '1 month ago'
  return `${Math.floor(d / 30)} months ago`
}
