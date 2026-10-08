// ChatGPT (built in): deciding from page snapshots when an answer is finished. Finishing too early returns half a
// reply; never finishing hangs the request. The snapshot is collected inside chatgpt.com by an in-page script.
import { describe, expect, it } from 'vitest'
import {
  answerState,
  browserUserAgent,
  chromeExecutables,
  isSessionCookie,
  signInStep,
  toElectronCookie,
  type PageSnapshot,
} from './chatgptWebState'

const snap = (over: Partial<PageSnapshot> = {}): PageSnapshot => ({
  url: 'https://chatgpt.com/?temporary-chat=true',
  signedIn: true,
  hasComposer: true,
  assistantTurns: 1,
  lastAssistantText: '{"ok":true}',
  stopVisible: false,
  copyAfterLastAssistant: true,
  lastComplete: false,
  lastStreaming: false,
  errorText: '',
  ...over,
})

describe('answerState', () => {
  it('waits while there is no new assistant turn or it is still streaming', () => {
    expect(answerState(snap({ assistantTurns: 0, lastAssistantText: '' }), 0).kind).toBe('pending')
    expect(answerState(snap({ stopVisible: true }), 0).kind).toBe('pending')
    expect(answerState(snap({ copyAfterLastAssistant: false }), 0).kind).toBe('pending')
  })
  it('is done when the new turn has text, streaming stopped and its action bar is shown', () => {
    expect(answerState(snap(), 0)).toEqual({ kind: 'done', text: '{"ok":true}' })
  })
  it('is done when the reply is marked complete even if no action bar is found', () => {
    expect(answerState(snap({ copyAfterLastAssistant: false, lastComplete: true }), 0).kind).toBe('done')
    expect(answerState(snap({ copyAfterLastAssistant: false, lastComplete: true, stopVisible: true }), 0).kind).toBe(
      'pending',
    )
  })
  it('waits while the reply is marked as streaming, even if its copy button is already shown', () => {
    expect(answerState(snap({ lastStreaming: true }), 0).kind).toBe('pending')
  })
  it('drops the hidden "ChatGPT said:" label from the reply', () => {
    expect(answerState(snap({ lastAssistantText: 'ChatGPT said:\n\n{"vi":"kiên cường"}' }), 0)).toEqual({
      kind: 'done',
      text: '{"vi":"kiên cường"}',
    })
  })
  it('reports a connection failure shown in the conversation', () => {
    expect(answerState(snap({ assistantTurns: 0, errorText: 'Unable to connect' }), 0)).toMatchObject({
      kind: 'failed',
      reason: 'error',
    })
  })
  it('ignores assistant turns that existed before sending', () => {
    expect(answerState(snap({ assistantTurns: 1 }), 1).kind).toBe('pending')
  })
  it('reports sign-out, rate limits and ChatGPT error messages', () => {
    expect(answerState(snap({ signedIn: false }), 0)).toEqual({ kind: 'failed', reason: 'signed-out' })
    expect(answerState(snap({ errorText: 'You’ve reached our limit of messages. Try again later.' }), 0)).toEqual({
      kind: 'failed',
      reason: 'limit',
      message: 'You’ve reached our limit of messages. Try again later.',
    })
    expect(answerState(snap({ errorText: 'Something went wrong while generating the response.' }), 0)).toMatchObject({
      kind: 'failed',
      reason: 'error',
    })
  })
})

describe('signInStep', () => {
  it('keeps the window open on the login and OpenAI auth pages', () => {
    expect(signInStep('https://chatgpt.com/auth/login', false)).toBe('wait')
    expect(signInStep('https://auth.openai.com/log-in', false)).toBe('wait')
    expect(signInStep('https://accounts.google.com/o/oauth2/v2/auth?x=1', false)).toBe('wait')
  })
  it('closes once ChatGPT is reached signed in', () => {
    expect(signInStep('https://chatgpt.com/', true)).toBe('close')
  })
  it('sends a signed-out visit to the chat page back to the login screen ("Try it first")', () => {
    expect(signInStep('https://chatgpt.com/', false)).toBe('login')
  })
})

describe('browserUserAgent', () => {
  it('is a plain Chrome user agent: no Electron and no app name, which make Google refuse to sign in', () => {
    const ua = browserUserAgent('136.0.7103.48')
    expect(ua).toBe(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    )
    expect(ua).not.toMatch(/Electron|Luom|envi-learn/i)
  })
})

describe('Sign in with Chrome', () => {
  const cookie = {
    name: '__Secure-next-auth.session-token',
    value: 'v',
    domain: '.chatgpt.com',
    path: '/',
    expires: 1800000000.5,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax' as const,
  }

  it('copies ChatGPT and OpenAI cookies into the app as Chrome had them', () => {
    expect(toElectronCookie(cookie)).toEqual({
      url: 'https://chatgpt.com/',
      name: '__Secure-next-auth.session-token',
      value: 'v',
      domain: '.chatgpt.com',
      path: '/',
      secure: true,
      httpOnly: true,
      expirationDate: 1800000000.5,
      sameSite: 'lax',
    })
    expect(toElectronCookie({ ...cookie, domain: 'auth.openai.com', sameSite: 'None' })).toMatchObject({
      url: 'https://auth.openai.com/',
      sameSite: 'no_restriction',
    })
  })
  it('keeps host-only and session cookies as they are', () => {
    const host = toElectronCookie({ ...cookie, name: '__Host-next-auth.csrf-token', domain: 'chatgpt.com', expires: -1, sameSite: undefined })
    expect(host).not.toHaveProperty('domain')
    expect(host).not.toHaveProperty('expirationDate')
    expect(host).toMatchObject({ url: 'https://chatgpt.com/', sameSite: 'unspecified' })
  })
  it('leaves every other site alone', () => {
    expect(toElectronCookie({ ...cookie, domain: '.google.com' })).toBeNull()
    expect(toElectronCookie({ ...cookie, domain: '.notchatgpt.com' })).toBeNull()
  })
  it('knows the ChatGPT sign-in cookie, also when split in parts', () => {
    expect(isSessionCookie('__Secure-next-auth.session-token')).toBe(true)
    expect(isSessionCookie('__Secure-next-auth.session-token.1')).toBe(true)
    expect(isSessionCookie('__Secure-next-auth.callback-url')).toBe(false)
  })
  it('looks for Chrome in Applications, then in the home Applications folder', () => {
    expect(chromeExecutables('/Users/me')).toEqual([
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Users/me/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ])
  })
})
