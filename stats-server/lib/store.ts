// Upstash Redis layout (all daily keys are UTC days and expire after about 13 months):
//   u:<day>        HyperLogLog of install ids seen that day (daily users; a union of days = weekly / monthly users)
//   new:<day>      installs seen for the first time that day        first:<id>  day an install was first seen
//   installs       installs ever seen                               rl:<day>:<id>  pings from one install that day
//   ver:<day> os:<day> svc:<day> cc:<day>   hashes: users per app version, macOS version, AI service, country
//   ev:<day>       hash: event counters (AI answers per feature / service / outcome, seconds, lookups, Say it…)
import { Redis } from '@upstash/redis'

let client: Redis | null = null

/** The Redis env vars are missing (the Upstash integration is not connected to the project). */
export class NotConnectedError extends Error {}

/** Works with the env names of the Vercel Marketplace integration (KV_REST_API_*) and Upstash's own. */
export function redis(): Redis {
  if (client) return client
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new NotConnectedError('Redis is not connected (KV_REST_API_URL / KV_REST_API_TOKEN).')
  client = new Redis({ url, token })
  return client
}

export const DAY_TTL_S = 400 * 86_400
/** Pings one install may send in a day (the app sends one or a few). */
export const MAX_PINGS_PER_DAY = 48
