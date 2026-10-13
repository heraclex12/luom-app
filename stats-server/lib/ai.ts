// Backup AI relay rules (pure; api/ai.ts does the I/O). The app asks here only after every free model failed.

export interface Ask {
  system: string
  user: string
}

/** Prompt sizes the app actually sends (an episode with its JSON schema is a few thousand characters). */
export const AI_MAX_SYSTEM = 8_000
export const AI_MAX_USER = 24_000

/** Calls one IP address may make a day: the app's free allowance (10 AI answers a day per learner). */
export const AI_PER_IP_PER_DAY = 10
/** Calls for everyone together a day (about 100 learners), unless AI_DAILY_LIMIT says otherwise: the bound on the bill. */
export const AI_PER_DAY = 1000

const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() && v.length <= max ? v : null

export function parseAsk(body: unknown): Ask | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const system = text(b.system, AI_MAX_SYSTEM)
  const user = text(b.user, AI_MAX_USER)
  return system && user ? { system, user } : null
}

export function dailyLimit(env: string | undefined): number {
  const n = Number(env)
  return Number.isInteger(n) && n > 0 ? n : AI_PER_DAY
}

/** Which cap this call goes over (counts include it), or null. */
export function overLimit(counts: { ip: number; all: number }, perDay: number): 'ip' | 'all' | null {
  if (counts.ip > AI_PER_IP_PER_DAY) return 'ip'
  if (counts.all > perDay) return 'all'
  return null
}

export function answerText(data: unknown): string {
  const choices = (data as { choices?: { message?: { content?: unknown } }[] } | null)?.choices
  const content = Array.isArray(choices) ? choices[0]?.message?.content : undefined
  return typeof content === 'string' ? content : ''
}
