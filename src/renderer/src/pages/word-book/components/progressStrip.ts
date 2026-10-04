// Recent-activity strip (pure): the last n learning days with whether each had practice.

/** Learning days roll over at 4:00 local (same as the scheduler's day window). */
const ROLLOVER_HOUR = 4
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export interface StripDay {
  date: Date
  label: string
  active: boolean
  isToday: boolean
}

const dateKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/** Last n learning days, oldest first; `activeDays` are start-of-day timestamps. */
export function recentDays(activeDays: readonly number[], now: number, n = 7): StripDay[] {
  const active = new Set(activeDays.map((t) => dateKey(new Date(t))))
  const today = new Date(now)
  if (today.getHours() < ROLLOVER_HOUR) today.setDate(today.getDate() - 1)
  const out: StripDay[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, ROLLOVER_HOUR)
    out.push({ date: d, label: WEEKDAY[d.getDay()]!, active: active.has(dateKey(d)), isToday: i === 0 })
  }
  return out
}
