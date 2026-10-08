// Pure decision logic for the built-in ChatGPT provider (no Electron imports, unit-tested).

/** What the in-page script reports about chatgpt.com. */
export interface PageSnapshot {
  url: string
  signedIn: boolean
  hasComposer: boolean
  /** Number of assistant turns on the page. */
  assistantTurns: number
  lastAssistantText: string
  /** The Stop button shows while ChatGPT is still writing. */
  stopVisible: boolean
  /** The turn action bar (copy button) appears under an assistant reply once it is complete. */
  copyAfterLastAssistant: boolean
  /** The current markup marks a finished reply with data-message-complete. */
  lastComplete: boolean
  /** Current markup: data-message-streaming is set on the reply while ChatGPT is still writing it. */
  lastStreaming: boolean
  /** Visible error banner text, if any. */
  errorText: string
}

export type AnswerState =
  | { kind: 'pending' }
  | { kind: 'done'; text: string }
  | { kind: 'failed'; reason: 'signed-out' | 'limit' | 'error'; message?: string }

const LIMIT_RE = /reached (our|your) (limit|usage)|limit of messages|try again (later|after)|usage cap/i

/** Done only when a NEW assistant turn (beyond `turnsBefore`) has text, streaming stopped and its actions show. */
export function answerState(s: PageSnapshot, turnsBefore: number): AnswerState {
  if (!s.signedIn) return { kind: 'failed', reason: 'signed-out' }
  if (s.errorText) return { kind: 'failed', reason: LIMIT_RE.test(s.errorText) ? 'limit' : 'error', message: s.errorText }
  if (s.assistantTurns <= turnsBefore || s.stopVisible || s.lastStreaming) return { kind: 'pending' }
  if (!s.copyAfterLastAssistant && !s.lastComplete) return { kind: 'pending' }
  // Screen-reader heading the page puts before each reply.
  const text = s.lastAssistantText.replace(/^\s*ChatGPT said:\s*/i, '').trim()
  return text ? { kind: 'done', text } : { kind: 'pending' }
}

/** Sign-in window, after each navigation: keep waiting on login / identity-provider pages, close once ChatGPT is
 *  reached signed in, and send a signed-out visit to the chat itself ("Try it first") back to the login screen. */
export function signInStep(url: string, signedIn: boolean): 'wait' | 'close' | 'login' {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return 'wait'
  }
  if (u.hostname !== 'chatgpt.com' || u.pathname.startsWith('/auth/') || u.pathname.startsWith('/api/')) return 'wait'
  return signedIn ? 'close' : 'login'
}

/**
 * The user agent the ChatGPT window presents: exactly what Chrome on a Mac sends (Chrome reduces its own to the major
 * version and a fixed macOS version). Electron's default adds "Electron/…" and the app's name ("Luom/0.6.4"), and
 * Google sign-in refuses such browsers ("This browser or app may not be secure").
 */
export function browserUserAgent(chromeVersion: string): string {
  const major = chromeVersion.split('.')[0]
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
}

// ── Sign in with Chrome: Google refuses sign-in inside app windows, so the learner signs in to ChatGPT in their real
// Chrome (a separate profile), and the ChatGPT cookies are copied into the app's ChatGPT session (chatgptChrome.ts).

/** A cookie as Chrome's DevTools protocol reports it (Storage.getCookies). */
export interface DevtoolsCookie {
  name: string
  value: string
  domain: string
  path: string
  /** Seconds since the epoch; -1 for a session cookie. */
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

/** The same cookie for Electron's session.cookies.set. */
export interface AppCookie {
  url: string
  name: string
  value: string
  domain?: string
  path: string
  secure: boolean
  httpOnly: boolean
  expirationDate?: number
  sameSite: 'unspecified' | 'no_restriction' | 'lax' | 'strict'
}

const CHATGPT_SITES = ['chatgpt.com', 'openai.com']

/** A ChatGPT / OpenAI cookie converted for the app, or null for any other site (those are never copied). */
export function toElectronCookie(c: DevtoolsCookie): AppCookie | null {
  const host = c.domain.replace(/^\./, '')
  if (!CHATGPT_SITES.some((site) => host === site || host.endsWith(`.${site}`))) return null
  return {
    url: `https://${host}${c.path || '/'}`,
    name: c.name,
    value: c.value,
    // A leading dot means the cookie is for subdomains too; without it the cookie is host-only (no domain given).
    ...(c.domain.startsWith('.') ? { domain: c.domain } : {}),
    path: c.path || '/',
    secure: c.secure,
    httpOnly: c.httpOnly,
    ...(c.expires > 0 ? { expirationDate: c.expires } : {}),
    sameSite: c.sameSite === 'Strict' ? 'strict' : c.sameSite === 'Lax' ? 'lax' : c.sameSite === 'None' ? 'no_restriction' : 'unspecified',
  }
}

/** ChatGPT's sign-in cookie (large ones are split into .0, .1, …). */
export const isSessionCookie = (name: string): boolean => /^__Secure-next-auth\.session-token(\.\d+)?$/.test(name)

/** Where Google Chrome may be installed. */
export function chromeExecutables(home: string): string[] {
  const exe = 'Google Chrome.app/Contents/MacOS/Google Chrome'
  return [`/Applications/${exe}`, `${home}/Applications/${exe}`]
}
