// Anonymous usage stats (Settings → Data & about → Share anonymous usage stats, on by default). Counts events on
// this Mac (./telemetryState.ts) and sends them with a random install id to the stats server (stats-server/, on
// Vercel) about once a day, so the number of people using Lượm and how much AI they use can be seen. Nothing about
// the learner's words or what they type is sent. Only installed builds send (dev: LUOM_TELEMETRY_DEV=1).
import { app, ipcMain, net } from 'electron'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildPing, bump, osVersion, pingDue, withoutSent, type Counts } from './telemetryState'

declare const __TELEMETRY_URL__: string

const CHECK_EVERY_MS = 3600_000

interface Stored {
  id: string
  lastSentAt: number | null
  counts: Counts
}

const file = (): string => join(app.getPath('userData'), 'usage-stats.json')

let state: Stored | null = null
function load(): Stored {
  if (state) return state
  try {
    const s = JSON.parse(readFileSync(file(), 'utf8')) as Partial<Stored>
    if (typeof s.id === 'string' && s.id)
      state = { id: s.id, lastSentAt: typeof s.lastSentAt === 'number' ? s.lastSentAt : null, counts: s.counts ?? {} }
  } catch {
    // first run or unreadable: start fresh
  }
  state ??= { id: randomUUID(), lastSentAt: null, counts: {} }
  return state
}

function save(): void {
  try {
    writeFileSync(file(), JSON.stringify(load()))
  } catch (e) {
    console.warn(`[telemetry] could not save: ${(e as Error).message}`)
  }
}

/** Sharing as set in Settings (null until the main window reports it), and the AI service in use. */
let enabled: boolean | null = null
let service = ''

const active = (): boolean => !!__TELEMETRY_URL__ && (app.isPackaged || process.env.LUOM_TELEMETRY_DEV === '1')

/** Count one event (nothing is kept when sharing is off). */
export function recordUsage(key: string, n = 1): void {
  if (enabled === false || !active()) return
  const s = load()
  s.counts = bump(s.counts, key, n)
  save()
}

let sending = false
async function maybeSend(): Promise<void> {
  if (!enabled || !active() || sending) return
  const s = load()
  if (!pingDue(Date.now(), s.lastSentAt, Object.keys(s.counts).length > 0)) return
  sending = true
  const sent = { ...s.counts }
  try {
    const res = await net.fetch(__TELEMETRY_URL__, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        buildPing({ id: s.id, version: app.getVersion(), os: osVersion(process.getSystemVersion()), service, counts: sent }),
      ),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) {
      s.lastSentAt = Date.now()
      s.counts = withoutSent(s.counts, sent)
      save()
    }
  } catch {
    // offline: try again at the next check
  } finally {
    sending = false
  }
}

function configure(share: boolean, aiService: string): void {
  const first = enabled === null
  enabled = share
  service = aiService.slice(0, 20)
  if (!share && state && Object.keys(state.counts).length) {
    state.counts = {}
    save()
  }
  // The launch counts once sharing is known (on the first report from the window).
  if (first && share) recordUsage('launch')
  void maybeSend()
}

export function registerTelemetryIpc(): void {
  ipcMain.handle('app:usage-sharing', (_e, share: boolean, aiService: string) => configure(!!share, String(aiService ?? '')))
  setInterval(() => void maybeSend(), CHECK_EVERY_MS)
}
