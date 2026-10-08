// GET /api/stats?days=30: the numbers behind the stats page, for the owner only (Authorization: Bearer STATS_TOKEN).
import { timingSafeEqual } from 'node:crypto'
import { lastDays } from '../lib/ping.js'
import { NotConnectedError, redis } from '../lib/store.js'

type Hash = Record<string, number>

function authorized(request: Request): boolean {
  const expected = process.env.STATS_TOKEN
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!expected || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

const numbers = (h: Record<string, unknown> | null): Hash =>
  Object.fromEntries(Object.entries(h ?? {}).map(([k, v]) => [k, Number(v) || 0]))

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ error: 'Wrong or missing token.' }, { status: 401 })
  try {
    return await report(request)
  } catch (e) {
    const notConnected = e instanceof NotConnectedError
    console.error(e)
    return Response.json(
      { error: notConnected ? 'The database is not connected yet (add Upstash for Redis to the luom-stats project).' : 'The database did not answer.' },
      { status: 503 },
    )
  }
}

async function report(request: Request): Promise<Response> {
  const asked = Number(new URL(request.url).searchParams.get('days'))
  const days = lastDays(Date.now(), Number.isInteger(asked) && asked >= 1 && asked <= 90 ? asked : 30)

  const r = redis()
  const p = r.pipeline()
  for (const day of days) {
    p.pfcount(`u:${day}`)
    p.get(`new:${day}`)
    for (const key of ['ver', 'os', 'svc', 'cc', 'ev']) p.hgetall(`${key}:${day}`)
  }
  const unionOf = (n: number): [string, ...string[]] => [`u:${days[0]}`, ...days.slice(1, n).map((d) => `u:${d}`)]
  p.pfcount(...unionOf(7))
  p.pfcount(...unionOf(30))
  p.get('installs')
  const out = await p.exec<unknown[]>()

  const perDay = days.map((day, i) => {
    const [users, fresh, ver, os, svc, cc, ev] = out.slice(i * 7, i * 7 + 7)
    return {
      day,
      users: Number(users) || 0,
      new: Number(fresh) || 0,
      versions: numbers(ver as Hash | null),
      os: numbers(os as Hash | null),
      services: numbers(svc as Hash | null),
      countries: numbers(cc as Hash | null),
      events: numbers(ev as Hash | null),
    }
  })
  const [week, month, installs] = out.slice(days.length * 7)
  return Response.json(
    { days: perDay, weekUsers: Number(week) || 0, monthUsers: Number(month) || 0, installs: Number(installs) || 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
