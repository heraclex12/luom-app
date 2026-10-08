// POST /api/ping: the app's anonymous daily ping (src/main/telemetry.ts). Stores no IP address: only the country
// Vercel derives from it, counted per day.
import { parsePing, utcDay, type Ping } from '../lib/ping.js'
import { DAY_TTL_S, MAX_PINGS_PER_DAY, redis } from '../lib/store.js'

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  const ping = parsePing(body)
  if (!ping) return new Response('Bad request', { status: 400 })
  try {
    await store(ping, request)
  } catch (e) {
    // The app keeps its counts and tries again later.
    console.error(e)
    return new Response('Unavailable', { status: 503 })
  }
  return new Response(null, { status: 204 })
}

async function store(ping: Ping, request: Request): Promise<void> {
  const r = redis()
  const day = utcDay(Date.now())
  const pings = await r.incr(`rl:${day}:${ping.id}`)
  if (pings === 1) await r.expire(`rl:${day}:${ping.id}`, 2 * 86_400)
  if (pings > MAX_PINGS_PER_DAY) return
  const isNew = (await r.set(`first:${ping.id}`, day, { nx: true })) === 'OK'

  const p = r.pipeline()
  const daily = (key: string): void => void p.expire(`${key}:${day}`, DAY_TTL_S)
  p.pfadd(`u:${day}`, ping.id)
  daily('u')
  if (isNew) {
    p.incr(`new:${day}`)
    daily('new')
    p.incr('installs')
  }
  // Who is using what: once per install per day.
  if (pings === 1) {
    const country = request.headers.get('x-vercel-ip-country')
    const fields: [string, string][] = [
      ['ver', ping.v],
      ['os', ping.os],
      ['svc', ping.service],
      ['cc', country && /^[A-Z]{2}$/.test(country) ? country : ''],
    ]
    for (const [key, value] of fields) {
      p.hincrby(`${key}:${day}`, value || 'unknown', 1)
      daily(key)
    }
  }
  const counts = Object.entries(ping.counts)
  for (const [k, n] of counts) p.hincrby(`ev:${day}`, k, n)
  if (counts.length) daily('ev')
  await p.exec()
}
