// Pure reminder rules (no timers, no I/O) — the scheduler in app/index.ts applies them every minute.

/** Word flashes only during waking hours (local time). */
export const FLASH_WINDOW = { startHour: 9, endHour: 22 }

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

/** Word flash: interval elapsed since the last one, within waking hours, and enabled. */
export function flashDue(now: number, lastFlashAt: number | null, intervalHours: number): boolean {
  if (intervalHours <= 0) return false
  const hour = new Date(now).getHours()
  if (hour < FLASH_WINDOW.startHour || hour >= FLASH_WINDOW.endHour) return false
  return lastFlashAt == null || now - lastFlashAt >= intervalHours * 3600_000
}

/** Pick a word to flash, avoiding recently shown ones (random among the rest). */
export function pickFlashWord<T extends { dictId: number }>(
  pool: readonly T[],
  recent: readonly number[],
  random: () => number = Math.random,
): T | null {
  if (pool.length === 0) return null
  const fresh = pool.filter((w) => !recent.includes(w.dictId))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[Math.floor(random() * candidates.length)] ?? null
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
