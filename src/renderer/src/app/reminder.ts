// Pure reminder rules (no timers, no I/O) — the scheduler in app/index.ts applies them every minute.

/** Default active hours for word flashes (local time): from 09:00 until 22:00. */
export const DEFAULT_ACTIVE_HOURS = { from: 9, until: 22 }

/** Whether `now` falls in the active hours [from, until) (hours 0–23). An end before the start runs past midnight;
 *  from = until means all day. */
export function inActiveHours(now: number, from: number, until: number): boolean {
  if (from === until) return true
  const hour = new Date(now).getHours()
  return from < until ? hour >= from && hour < until : hour >= from || hour < until
}

/** "HH:MM" → minutes after midnight; null when malformed. */
export function parseTime(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Local calendar day key (YYYY-MM-DD) — the "fired today" marker. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Daily reminder: fire once per day, at or after the configured time (catches up after sleep). */
export function shouldFireDaily(now: number, hhmm: string, lastFiredDay: string | null): boolean {
  const minutes = parseTime(hhmm)
  if (minutes == null) return false
  const d = new Date(now)
  const nowMinutes = d.getHours() * 60 + d.getMinutes()
  return nowMinutes >= minutes && lastFiredDay !== dayKey(now)
}

/** Idle this long (no keyboard or mouse) counts as away: flashes wait until you are back. */
export const FLASH_AWAY_SECONDS = 180

/**
 * Word flash: enabled, the interval elapsed since the last one, within your active hours, and you are at the Mac (a
 * quiz shown to an empty desk closes unseen and wastes the slot).
 */
export function flashDue(o: {
  now: number
  lastFlashAt: number | null
  everyMinutes: number
  idleSeconds: number
  activeFrom?: number
  activeUntil?: number
}): boolean {
  if (o.everyMinutes <= 0) return false
  if (!inActiveHours(o.now, o.activeFrom ?? DEFAULT_ACTIVE_HOURS.from, o.activeUntil ?? DEFAULT_ACTIVE_HOURS.until)) return false
  if (o.idleSeconds >= FLASH_AWAY_SECONDS) return false
  return o.lastFlashAt == null || o.now - o.lastFlashAt >= o.everyMinutes * 60_000
}

/**
 * Pick up to `count` distinct words to flash. Words due by `dueBy` come first (answering one is the review it
 * needs anyway), then the rest; within each group words not shown recently go first, in random order.
 */
export function pickFlashWords<T extends { dictId: number; due: number | null }>(
  pool: readonly T[],
  recent: readonly number[],
  count: number,
  dueBy: number,
  random: () => number = Math.random,
): T[] {
  const shuffled = (xs: readonly T[]): T[] => {
    const left = [...xs]
    const out: T[] = []
    while (left.length > 0) out.push(left.splice(Math.floor(random() * left.length), 1)[0]!)
    return out
  }
  const isDue = (w: T): boolean => w.due != null && w.due <= dueBy
  const isRecent = (w: T): boolean => recent.includes(w.dictId)
  const order = [
    pool.filter((w) => isDue(w) && !isRecent(w)),
    pool.filter((w) => !isDue(w) && !isRecent(w)),
    pool.filter((w) => isDue(w) && isRecent(w)),
    pool.filter((w) => !isDue(w) && isRecent(w)),
  ].flatMap(shuffled)
  return order.slice(0, Math.max(0, count))
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

/** Body of the daily reminder; null when there is nothing to study. */
export function reminderBody(counts: { due: number; newAvailable: number }): string | null {
  const parts: string[] = []
  if (counts.due > 0) parts.push(`${plural(counts.due, 'word', 'words')} to review`)
  if (counts.newAvailable > 0) parts.push(`${plural(counts.newAvailable, 'new word', 'new words')} to learn`)
  return parts.length ? parts.join(' · ') : null
}

/** Title/body of a word flash notification. */
export function flashText(word: string, phonetic: string, meaning: string): { title: string; body: string } {
  return {
    title: phonetic ? `${word}  ${phonetic}` : word,
    body: meaning || 'Do you remember what it means?',
  }
}

/** Follow-up reminders after the daily one, by intensity. Never after 22:00 or once the daily goal is met. */
export function shouldNudge(o: {
  now: number
  intensity: 'gentle' | 'regular' | 'persistent'
  reminderTime: string
  lastNudgeAt: number | null
  goalMet: boolean
}): boolean {
  if (o.goalMet || o.intensity === 'gentle') return false
  const d = new Date(o.now)
  const minutes = d.getHours() * 60 + d.getMinutes()
  if (minutes >= 22 * 60) return false
  const at = (m: number): number => new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(m / 60), m % 60).getTime()
  if (o.intensity === 'regular') {
    const evening = at(19 * 60 + 30)
    return o.now >= evening && (o.lastNudgeAt == null || o.lastNudgeAt < evening)
  }
  const start = (parseTime(o.reminderTime) ?? 8 * 60 + 30) + 120
  if (minutes < start) return false
  return o.lastNudgeAt == null || o.now - o.lastNudgeAt >= 2 * 3_600_000
}

/** "Last chance" time for a waiting episode (local). */
export const EPISODE_LAST_CALL = '20:30'

/**
 * Daily Episodes reminder for an unread episode: a morning tease at the reminder time, and a last-chance note in
 * the evening. Each fires once a day (lastMorning / lastEvening = day keys already sent). Null when nothing is due.
 */
export function episodeReminder(o: {
  now: number
  reminderTime: string
  series: string
  number: number
  /** Yesterday's cliffhanger ("" for the first episode). */
  teaser: string
  lastMorning: string | null
  lastEvening: string | null
}): { kind: 'morning' | 'evening'; title: string; body: string } | null {
  if (shouldFireDaily(o.now, EPISODE_LAST_CALL, o.lastEvening))
    return {
      kind: 'evening',
      title: `Episode ${o.number} is lost at midnight`,
      body: 'Read it before the day ends, or that page of the story is gone for good.',
    }
  if (shouldFireDaily(o.now, o.reminderTime, o.lastMorning))
    return {
      kind: 'morning',
      title: `Episode ${o.number} of ${o.series} is waiting`,
      body: o.teaser ? `Last time: ${o.teaser}` : 'A new story starts today, with your words.',
    }
  return null
}
