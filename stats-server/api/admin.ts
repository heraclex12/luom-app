// Community review for the owner (stats page → Community; Authorization: Bearer STATS_TOKEN).
//   GET  /api/admin?status=pending|public|private   posts with their emails, and how many are in each list
//   POST /api/admin {action: approve|unpublish|delete|reply, id, reply?} or {action: create, kind, name, body, bodyVi?} (a post
//        by the owner, published at once)
import { isOwner } from '../lib/auth.js'
import { counts, deletePost, getPost, listPosts, moveTo, newId, savePost, type Status } from '../lib/board.js'
import { MAX_BODY, parseOwnerPost, tidy } from '../lib/posts.js'

const STATUSES: Status[] = ['pending', 'public', 'private']
const denied = (): Response => Response.json({ error: 'Wrong or missing token.' }, { status: 401 })
const noStore = { 'Cache-Control': 'no-store' }

export async function GET(request: Request): Promise<Response> {
  if (!isOwner(request)) return denied()
  const asked = new URL(request.url).searchParams.get('status') as Status
  const status = STATUSES.includes(asked) ? asked : 'pending'
  try {
    const [posts, n] = await Promise.all([listPosts(status, 200), counts()])
    return Response.json({ posts, counts: n }, { headers: noStore })
  } catch (e) {
    console.error(e)
    return Response.json({ error: 'The database did not answer.' }, { status: 503 })
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isOwner(request)) return denied()
  const body = (await request.json().catch(() => null)) as { action?: string; id?: string; reply?: string } | null
  if (body?.action === 'create') {
    const post = parseOwnerPost(body)
    if (!post) return Response.json({ error: 'Write something first.' }, { status: 400 })
    const id = newId()
    await savePost({ ...post, id, email: '', private: false, status: 'public', at: Date.now(), owner: true })
    return Response.json({ ok: true, id }, { headers: noStore })
  }
  const post = body?.id ? await getPost(body.id) : null
  if (!post) return Response.json({ error: 'That post is gone.' }, { status: 404 })
  switch (body?.action) {
    case 'approve':
      await moveTo(post, 'public')
      break
    case 'unpublish':
      await moveTo(post, 'pending')
      break
    case 'delete':
      await deletePost(post.id)
      break
    case 'reply': {
      const reply = tidy(String(body.reply ?? ''), MAX_BODY).slice(0, MAX_BODY)
      const { reply: _old, replyAt: _oldAt, ...rest } = post
      await savePost(reply ? { ...rest, reply, replyAt: Date.now() } : rest)
      break
    }
    default:
      return Response.json({ error: 'Unknown action.' }, { status: 400 })
  }
  return Response.json({ ok: true }, { headers: noStore })
}
