// Community board for the landing page (docs/index.html, on GitHub Pages: hence CORS).
//   GET  /api/posts  approved posts, newest first (no emails)
//   POST /api/posts  a new post: public ones wait for review, private ones go only to the owner
import { listPosts, newId, roomFor, savePost } from '../lib/board.js'
import { parsePostInput, publicView } from '../lib/posts.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  Response.json(body, { status, headers: { ...CORS, ...headers } })

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(): Promise<Response> {
  try {
    const posts = (await listPosts('public', 50)).map(publicView)
    return json({ posts }, 200, { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' })
  } catch (e) {
    console.error(e)
    return json({ posts: [], error: 'The board could not load.' }, 503)
  }
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown
  try {
    // Sent as text/plain (no CORS preflight); the body is JSON either way.
    raw = JSON.parse(await request.text())
  } catch {
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 400)
  }
  const parsed = parsePostInput(raw, Date.now())
  // A bot gets the same answer as a person, so it learns nothing.
  if (!parsed.ok && parsed.error === 'spam') return json({ ok: true })
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400)
  try {
    const full = await roomFor(request)
    if (full) return json({ ok: false, error: full }, 429)
    const { input } = parsed
    await savePost({ ...input, id: newId(), status: input.private ? 'private' : 'pending', at: Date.now() })
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ ok: false, error: 'Your post could not be sent. Please try again later, or send an email.' }, 503)
  }
}
