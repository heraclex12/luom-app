// Community board (pure parts): what a visitor may post, and what the public list shows.
import { describe, expect, it } from 'vitest'
import { parsePostInput, publicView, type Post } from './posts'

const NOW = 1_800_000_000_000
const base = { kind: 'question', body: 'How do I change the capture shortcut?', name: '', email: '', openedAt: NOW - 20_000 }

describe('parsePostInput', () => {
  it('accepts an anonymous question', () => {
    expect(parsePostInput(base, NOW)).toEqual({
      ok: true,
      input: { kind: 'question', body: 'How do I change the capture shortcut?', name: '', email: '', private: false },
    })
  })
  it('keeps an optional name and email, and a private message', () => {
    const r = parsePostInput({ ...base, name: '  Lan  ', email: 'Lan@Example.com ', private: true }, NOW)
    expect(r).toMatchObject({ ok: true, input: { name: 'Lan', email: 'lan@example.com', private: true } })
  })
  it('tidies the text: no control characters, at most two blank lines', () => {
    const r = parsePostInput({ ...base, body: 'Hi\u0000 there\n\n\n\n\nsecond\tline  ' }, NOW)
    expect(r).toMatchObject({ ok: true, input: { body: 'Hi there\n\nsecond line' } })
  })
  it('explains what is wrong', () => {
    expect(parsePostInput({ ...base, body: 'hi' }, NOW)).toEqual({ ok: false, error: 'Please write a little more (at least 10 characters).' })
    expect(parsePostInput({ ...base, body: 'x'.repeat(2001) }, NOW)).toEqual({ ok: false, error: 'Please keep it under 2000 characters.' })
    expect(parsePostInput({ ...base, email: 'not-an-email' }, NOW)).toEqual({ ok: false, error: 'That email address does not look right.' })
    expect(parsePostInput({ ...base, kind: 'rant' }, NOW)).toMatchObject({ ok: true, input: { kind: 'other' } })
    expect(parsePostInput(null, NOW)).toEqual({ ok: false, error: 'Something went wrong. Please try again.' })
  })
  it('turns away bots: the hidden field filled in, sent too fast, or full of links', () => {
    expect(parsePostInput({ ...base, website: 'spam.example' }, NOW)).toEqual({ ok: false, error: 'spam' })
    expect(parsePostInput({ ...base, openedAt: NOW - 1000 }, NOW)).toEqual({ ok: false, error: 'spam' })
    expect(parsePostInput({ ...base, body: 'see http://a.example http://b.example http://c.example' }, NOW)).toEqual({
      ok: false,
      error: 'Please include at most two links.',
    })
  })
})

describe('publicView', () => {
  it('never shows the email or the review state', () => {
    const post: Post = {
      id: 'p1',
      kind: 'idea',
      body: 'Dark mode for the widget',
      name: '',
      email: 'lan@example.com',
      private: false,
      status: 'public',
      at: NOW,
      reply: 'Coming soon!',
      replyAt: NOW + 1,
    }
    expect(publicView(post)).toEqual({ id: 'p1', kind: 'idea', body: 'Dark mode for the widget', name: 'Anonymous', at: NOW, reply: 'Coming soon!', replyAt: NOW + 1 })
  })
})
