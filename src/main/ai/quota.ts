// Lượm (Free) daily allowance per copy of the app (pure; stored by ./index.ts in the app's data folder). The built-in
// key's free requests are shared by everyone, so each learner gets a fair share. Counted on this Mac only: there is
// no server, so it keeps honest use fair rather than being a hard lock.

export const FREE_DAILY_ANSWERS = 10

export interface FreeUsage {
  /** Local calendar day, YYYY-MM-DD. */
  day: string
  /** Answers received that day. */
  count: number
}

const valid = (u: FreeUsage | null): u is FreeUsage =>
  !!u && typeof u.day === 'string' && typeof u.count === 'number' && Number.isFinite(u.count)

export const localDay = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Free answers left today. */
export function answersLeft(u: FreeUsage | null, today: string, limit = FREE_DAILY_ANSWERS): number {
  const used = valid(u) && u.day === today ? u.count : 0
  return Math.max(0, limit - used)
}

/** The record after one more answer today. */
export function afterAnswer(u: FreeUsage | null, today: string): FreeUsage {
  return { day: today, count: (valid(u) && u.day === today ? u.count : 0) + 1 }
}
