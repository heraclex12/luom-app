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
