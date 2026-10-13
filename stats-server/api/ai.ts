// POST /api/ai: the backup AI for Lượm (Free), asked by the app (src/main/ai/index.ts viaLuom) when the free models
// fail or are slow. Body {system, user} → {text}. The paid model's address, key and model live here only (LUOM_BACKUP_URL,
// LUOM_BACKUP_KEY, LUOM_BACKUP_MODEL), never in the app. Capped per IP and in total each day (AI_DAILY_LIMIT); stores
// no prompt, answer or IP address: only the day's counters, under a hashed IP, for two days.
import { createHash } from 'node:crypto'
import { answerText, dailyLimit, overLimit, parseAsk } from '../lib/ai.js'
import { utcDay } from '../lib/ping.js'
import { DAY_TTL_S, redis } from '../lib/store.js'

/** Longest answer the model may write: an episode or a story with its Vietnamese fits well within it. */
const MAX_TOKENS = 6000
const UPSTREAM_TIMEOUT_MS = 90_000

const fail = (status: number, error: string): Response => Response.json({ error }, { status })

/** The day's outcome counters for the stats page (aib:<day>: ok / fail / limit); a lost count never fails the call. */
async function tally(day: string, outcome: 'ok' | 'fail' | 'limit'): Promise<void> {
  try {
    await redis().pipeline().hincrby(`aib:${day}`, outcome, 1).expire(`aib:${day}`, DAY_TTL_S).exec()
  } catch (e) {
    console.error(e)
  }
}

export async function POST(request: Request): Promise<Response> {
  const url = process.env.LUOM_BACKUP_URL?.replace(/\/+$/, '')
  const key = process.env.LUOM_BACKUP_KEY
  const model = process.env.LUOM_BACKUP_MODEL
  if (!url || !key || !model) return fail(503, 'off')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail(400, 'bad request')
  }
  const ask = parseAsk(body)
  if (!ask) return fail(400, 'bad request')

  // Count the call before making it (a burst cannot slip past the caps); no store = no call.
  const day = utcDay(Date.now())
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipKey = `ai:${day}:ip:${createHash('sha256').update(`${day}|${ip}`).digest('hex').slice(0, 20)}`
  const allKey = `ai:${day}:all`
  try {
    const r = redis()
    const [ipCount, , allCount] = await r.pipeline().incr(ipKey).expire(ipKey, 2 * 86_400).incr(allKey).expire(allKey, 2 * 86_400).exec<[number, number, number, number]>()
    if (overLimit({ ip: ipCount, all: allCount }, dailyLimit(process.env.AI_DAILY_LIMIT))) {
      await tally(day, 'limit')
      return fail(429, 'limit')
    }
  } catch (e) {
    console.error(e)
    return fail(503, 'unavailable')
  }

  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: ask.system },
          { role: 'user', content: ask.user },
        ],
        max_tokens: MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error(`[ai] upstream ${res.status}`)
      await tally(day, 'fail')
      return fail(502, 'upstream')
    }
    const text = answerText(await res.json())
    await tally(day, text ? 'ok' : 'fail')
    return text ? Response.json({ text }, { headers: { 'Cache-Control': 'no-store' } }) : fail(502, 'empty')
  } catch (e) {
    console.error(`[ai] upstream: ${(e as Error).name}`)
    await tally(day, 'fail')
    return fail(502, 'upstream')
  }
}
