// What the app sends (src/main/telemetryState.ts UsagePing), checked strictly: anything unexpected is dropped, so
// the stats only ever hold a random install id, short version labels and event counters.

export interface Ping {
  id: string
  v: string
  os: string
  service: string
  counts: Record<string, number>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const LABEL = /^[A-Za-z0-9.-]{1,20}$/
const EVENT = /^[a-z0-9_:.-]{1,64}$/
const MAX_COUNTERS = 80
const MAX_COUNT = 10_000

const label = (v: unknown): string => (typeof v === 'string' && LABEL.test(v) ? v : '')

export function parsePing(body: unknown): Ping | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.id !== 'string' || !UUID.test(b.id)) return null
  const counts: Record<string, number> = {}
  if (b.counts && typeof b.counts === 'object') {
    for (const [k, n] of Object.entries(b.counts as Record<string, unknown>)) {
      if (Object.keys(counts).length >= MAX_COUNTERS) break
      if (EVENT.test(k) && typeof n === 'number' && Number.isInteger(n) && n > 0) counts[k] = Math.min(n, MAX_COUNT)
    }
  }
  return { id: b.id, v: label(b.v), os: label(b.os), service: label(b.service), counts }
}

export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

/** The last n UTC days up to today, newest first. */
export const lastDays = (now: number, n: number): string[] =>
  Array.from({ length: n }, (_, i) => utcDay(now - i * 86_400_000))
