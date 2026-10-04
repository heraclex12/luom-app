// ChatGPT (built in): deciding from page snapshots when an answer is finished. Finishing too early returns half a
// reply; never finishing hangs the request. The snapshot is collected inside chatgpt.com by an in-page script.
import { describe, expect, it } from 'vitest'
import { answerState, signInStep, type PageSnapshot } from './chatgptWebState'

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
