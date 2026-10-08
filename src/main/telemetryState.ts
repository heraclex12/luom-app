// Anonymous usage stats, pure parts (./telemetry.ts sends them). A ping carries a random install id, the app and
// macOS versions, the AI service in use and event counters (AI answers per feature, lookups, Say it), never words,
// sentences or anything the learner typed.

export type Counts = Record<string, number>

/** What the stats server receives (stats-server/api/ping.ts reads the same shape). */
export interface UsagePing {
  /** Random install id (made on this Mac, nothing else). */
  id: string
  /** App version. */
  v: string
  /** macOS major.minor. */
  os: string
  /** AI service chosen in Settings. */
  service: string
  /** Events since the last ping. */
  counts: Counts
}

/** Counters on a busy day go out at most this often; otherwise once a day. */
const SEND_EVERY_MS = 3 * 3600_000

/** What an AI call makes ("an entry", "the season plan") → a short feature name ("entry", "season-plan"). */
export function featureOf(what: string): string {
  return what
    .trim()
    .toLowerCase()
    .replace(/^(a|an|the)\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

/** Counter name for one AI call: feature, the service that answered, and ok / fail / limit. */
export const aiEvent = (what: string, service: string, outcome: 'ok' | 'fail' | 'limit'): string =>
  `ai:${featureOf(what)}:${service}:${outcome}`

/** Counter adding up the seconds successful answers took (with the ok count: the average wait). */
export const aiSecondsEvent = (what: string, service: string): string => `ai_s:${featureOf(what)}:${service}`

export const bump = (counts: Counts, key: string, n = 1): Counts => ({ ...counts, [key]: (counts[key] ?? 0) + n })

/** Counters after a ping went out: what was counted while it was being sent stays. */
export function withoutSent(counts: Counts, sent: Counts): Counts {
  const out: Counts = {}
  for (const [k, n] of Object.entries(counts)) {
    const left = n - (sent[k] ?? 0)
    if (left > 0) out[k] = left
  }
  return out
}

const localDay = (ms: number): string => new Date(ms).toDateString()

/** First run, a new local day, or counters waiting for a few hours. */
export function pingDue(now: number, lastSentAt: number | null, hasCounts: boolean): boolean {
  if (lastSentAt === null || localDay(now) !== localDay(lastSentAt)) return true
  return hasCounts && now - lastSentAt >= SEND_EVERY_MS
}

/** macOS version as major.minor ("15.3.1" → "15.3"). */
export const osVersion = (full: string): string => /^(\d+)\.(\d+)/.exec(full)?.slice(1, 3).join('.') ?? ''

export function buildPing(p: { id: string; version: string; os: string; service: string; counts: Counts }): UsagePing {
  return { id: p.id, v: p.version, os: p.os, service: p.service, counts: p.counts }
}
