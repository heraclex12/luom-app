// Community board on the landing page (docs/index.html): anyone can post a question, idea or bug report, with a name
// and an email only if they want. Public posts wait for the owner's approval (stats page → Community); a private one
// goes only to the owner. Emails are never shown publicly.

/** What a visitor can post. */
export const KINDS = ['question', 'idea', 'bug', 'other'] as const
/** The owner can also post news and tips. */
export const OWNER_KINDS = [...KINDS, 'news', 'tip'] as const
export type Kind = (typeof OWNER_KINDS)[number]

export interface PostInput {
  kind: Kind
  body: string
  name: string
  email: string
  /** Only for the owner (never published). */
  private: boolean
}

export interface Post extends PostInput {
  id: string
  /** pending = waiting for review; public = on the board; private = owner only. */
  status: 'pending' | 'public' | 'private'
  at: number
  reply?: string
  replyAt?: number
  /** Written by the owner (shown with a Developer badge). */
  owner?: boolean
}

/** What the landing page shows. */
export interface PublicPost {
  id: string
  kind: Kind
  body: string
  name: string
  at: number
  reply?: string
  replyAt?: number
  owner?: true
}

export const MAX_BODY = 2000
const MIN_BODY = 10
const MAX_NAME = 40
const MAX_LINKS = 2
/** A person takes longer than this to write a post; a bot does not. */
const MIN_WRITE_MS = 3000

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i

/** Plain text: no control characters, single spaces, at most one blank line in a row. */
export function tidy(text: string, max: number): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/[  ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max + 1)
}

type Parsed = { ok: true; input: PostInput } | { ok: false; error: string }

/** A visitor's post, checked. error 'spam' means a bot (answered as if it worked). */
export function parsePostInput(raw: unknown, now: number): Parsed {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Something went wrong. Please try again.' }
  const b = raw as Record<string, unknown>
  const text = (v: unknown, max: number): string => (typeof v === 'string' ? tidy(v, max) : '')
  if (text(b.website, 200)) return { ok: false, error: 'spam' }
  if (typeof b.openedAt !== 'number' || now - b.openedAt < MIN_WRITE_MS) return { ok: false, error: 'spam' }

  const body = text(b.body, MAX_BODY)
  if (body.length < MIN_BODY) return { ok: false, error: 'Please write a little more (at least 10 characters).' }
  if (body.length > MAX_BODY) return { ok: false, error: `Please keep it under ${MAX_BODY} characters.` }
  if ((body.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) return { ok: false, error: 'Please include at most two links.' }
  const email = text(b.email, 254).toLowerCase()
  if (email && !EMAIL.test(email)) return { ok: false, error: 'That email address does not look right.' }
  const kind = (KINDS as readonly unknown[]).includes(b.kind) ? (b.kind as Kind) : 'other'
  return { ok: true, input: { kind, body, name: text(b.name, MAX_NAME).slice(0, MAX_NAME), email, private: b.private === true } }
}

/** A post the owner writes from the owner page (published at once). */
export function parseOwnerPost(raw: unknown): { kind: Kind; name: string; body: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const body = typeof b.body === 'string' ? tidy(b.body, MAX_BODY) : ''
  if (!body || body.length > MAX_BODY) return null
  const kind = (OWNER_KINDS as readonly unknown[]).includes(b.kind) ? (b.kind as Kind) : 'news'
  const name = (typeof b.name === 'string' ? tidy(b.name, MAX_NAME) : '').slice(0, MAX_NAME) || 'Lượm'
  return { kind, name, body }
}

export function publicView(p: Post): PublicPost {
  return {
    id: p.id,
    kind: p.kind,
    body: p.body,
    name: p.name || 'Anonymous',
    at: p.at,
    ...(p.reply ? { reply: p.reply, replyAt: p.replyAt } : {}),
    ...(p.owner ? { owner: true as const } : {}),
  }
}
