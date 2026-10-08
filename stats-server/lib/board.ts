// Community board storage in Upstash Redis:
//   post:<id>        the post (JSON)
//   posts:pending    ids waiting for review, by time   posts:public  ids on the board   posts:private  owner-only ids
//   prl:<day>:<ip>   posts from one (hashed) address that day
import { createHash, randomBytes } from 'node:crypto'
import { utcDay } from './ping.js'
import type { Post } from './posts.js'
import { redis } from './store.js'

export const LISTS = { pending: 'posts:pending', public: 'posts:public', private: 'posts:private' } as const
export type Status = keyof typeof LISTS

/** Posts one address may send a day, and how many may wait for review at once (beyond that: email instead). */
const MAX_POSTS_PER_DAY = 5
const MAX_WAITING = 500

export const newId = (): string => randomBytes(9).toString('base64url')

/** Visitor's address, hashed with the day (and a secret): enough to limit posts, not to identify anyone. */
function addressKey(request: Request): string {
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const day = utcDay(Date.now())
  const hash = createHash('sha256').update(`${process.env.STATS_TOKEN ?? ''}|${day}|${ip}`).digest('base64url').slice(0, 16)
  return `prl:${day}:${hash}`
}

/** Room for one more post from this visitor (and on the board), or the reason there is none. */
export async function roomFor(request: Request): Promise<string | null> {
  const r = redis()
  const key = addressKey(request)
  const sent = await r.incr(key)
  if (sent === 1) await r.expire(key, 2 * 86_400)
  if (sent > MAX_POSTS_PER_DAY) return 'You have posted a lot today. Please try again tomorrow, or send an email.'
  const [pending, priv] = await Promise.all([r.zcard(LISTS.pending), r.zcard(LISTS.private)])
  if (pending + priv >= MAX_WAITING) return 'The board is very busy right now. Please send an email instead.'
  return null
}

export async function savePost(post: Post): Promise<void> {
  const r = redis()
  await r.set(`post:${post.id}`, post)
  await r.zadd(LISTS[post.status], { score: post.at, member: post.id })
}

/** Newest first. */
export async function listPosts(status: Status, limit: number): Promise<Post[]> {
  const r = redis()
  const ids = await r.zrange<string[]>(LISTS[status], 0, limit - 1, { rev: true })
  if (!ids.length) return []
  const posts = await r.mget<(Post | null)[]>(...ids.map((id) => `post:${id}`))
  return posts.filter((p): p is Post => !!p)
}

export const getPost = (id: string): Promise<Post | null> => redis().get<Post>(`post:${id}`)

/** Move a post to another list (approve / unpublish). */
export async function moveTo(post: Post, status: Status): Promise<void> {
  const r = redis()
  await r.zrem(LISTS[post.status], post.id)
  await savePost({ ...post, status })
}

export async function deletePost(id: string): Promise<void> {
  const r = redis()
  await Promise.all([r.del(`post:${id}`), ...Object.values(LISTS).map((list) => r.zrem(list, id))])
}

export async function counts(): Promise<Record<Status, number>> {
  const r = redis()
  const [pending, pub, priv] = await Promise.all([r.zcard(LISTS.pending), r.zcard(LISTS.public), r.zcard(LISTS.private)])
  return { pending, public: pub, private: priv }
}
