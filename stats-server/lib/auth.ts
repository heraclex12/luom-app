// The owner's pages (stats, community review) use one token: STATS_TOKEN, sent as "Authorization: Bearer …".
import { timingSafeEqual } from 'node:crypto'

export function isOwner(request: Request): boolean {
  const expected = process.env.STATS_TOKEN
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!expected || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}
