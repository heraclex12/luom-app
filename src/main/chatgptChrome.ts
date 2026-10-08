// Sign in with Chrome. Google refuses its sign-in inside app windows ("This browser or app may not be secure"), so,
// like codex-chatgpt-web, the learner signs in to ChatGPT in their real Google Chrome, in a separate profile kept in
// the app's data folder (their own Chrome profile is never touched):
// 1. Chrome opens on the ChatGPT login, with no automation attached (Google sees a normal browser);
// 2. the profile's cookie file is checked every couple of seconds for ChatGPT's sign-in cookie, by name only (values
//    stay encrypted); once it is there, that Chrome is quit;
// 3. Chrome is started again on the same profile, headless, and asked over its DevTools pipe for its cookies (Chrome
//    decrypts them itself); the ChatGPT / OpenAI ones are copied into the app's ChatGPT session (chatgptWeb.ts).
import { app } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Readable, Writable } from 'node:stream'
import Database from 'better-sqlite3'
import type { ChromeSignInResult } from '../shared/ai'
import { chromeExecutables, isSessionCookie, toElectronCookie, type AppCookie, type DevtoolsCookie } from './chatgptWebState'

const LOGIN_URL = 'https://chatgpt.com/auth/login'
const POLL_MS = 2000
/** Give up waiting for the sign-in after this long (Chrome is quit). */
const SIGN_IN_TIMEOUT_MS = 15 * 60_000


export const chromePath = (): string | null => chromeExecutables(homedir()).find((p) => existsSync(p)) ?? null
const profileDir = (): string => join(app.getPath('userData'), 'chatgpt-chrome')

let running: ChildProcess | null = null
let cancelled = false

/** Whether the profile's cookie file already has ChatGPT's sign-in cookie (a copy is read: Chrome keeps it open). */
function hasSessionCookie(): boolean {
  const file = join(profileDir(), 'Default', 'Cookies')
  if (!existsSync(file)) return false
  const copy = join(tmpdir(), `luom-chrome-cookies-${process.pid}`)
  try {
    copyFileSync(file, copy)
    const db = new Database(copy, { readonly: true, fileMustExist: true })
    try {
      const rows = db.prepare("SELECT name FROM cookies WHERE host_key LIKE '%chatgpt.com'").all() as { name: string }[]
      return rows.some((r) => isSessionCookie(r.name))
    } finally {
      db.close()
    }
  } catch {
    return false // half-written file: try again on the next poll
  } finally {
    rmSync(copy, { force: true })
  }
}

/** Every cookie of the profile, through a headless Chrome on its DevTools pipe (fds 3 and 4; no network port). */
function readCookies(exe: string): Promise<DevtoolsCookie[]> {
  return new Promise((resolve, reject) => {
    const chrome = spawn(
      exe,
      [`--user-data-dir=${profileDir()}`, '--headless=new', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', 'about:blank'],
      { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
    )
    const toChrome = chrome.stdio[3] as Writable
    const fromChrome = chrome.stdio[4] as Readable
    const send = (id: number, method: string): void => void toChrome.write(`${JSON.stringify({ id, method })}\0`)
    const timer = setTimeout(() => {
      chrome.kill()
      reject(new Error('Chrome did not answer.'))
    }, 20_000)
    let buffer = ''
    fromChrome.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      let end: number
      while ((end = buffer.indexOf('\0')) >= 0) {
        const message = JSON.parse(buffer.slice(0, end)) as { id?: number; result?: { cookies?: DevtoolsCookie[] }; error?: { message: string } }
        buffer = buffer.slice(end + 1)
        if (message.id !== 1) continue
        clearTimeout(timer)
        send(2, 'Browser.close')
        if (message.error) reject(new Error(message.error.message))
        else resolve(message.result?.cookies ?? [])
      }
    })
    chrome.once('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    send(1, 'Storage.getCookies')
  })
}

/** Open Chrome for the ChatGPT login, wait for the sign-in, then copy the ChatGPT cookies with `store`. */
export async function signInWithChrome(store: (cookies: AppCookie[]) => Promise<boolean>): Promise<ChromeSignInResult> {
  const exe = chromePath()
  if (!exe) return { ok: false, reason: 'no-chrome', message: 'Google Chrome is not installed on this Mac.' }
  if (running) return { ok: false, reason: 'busy', message: 'The Chrome sign-in window is already open.' }
  mkdirSync(profileDir(), { recursive: true })
  cancelled = false
  const chrome = spawn(exe, [`--user-data-dir=${profileDir()}`, '--no-first-run', '--no-default-browser-check', '--new-window', LOGIN_URL], {
    stdio: 'ignore',
  })
  running = chrome
  const exited = new Promise<void>((resolve) => {
    chrome.once('exit', () => resolve())
    chrome.once('error', () => resolve())
  })
  const started = Date.now()
  const poll = setInterval(() => {
    // Signed in (or taking too long): quit that Chrome; the learner may also quit it themselves.
    if (hasSessionCookie() || Date.now() - started > SIGN_IN_TIMEOUT_MS) chrome.kill('SIGTERM')
  }, POLL_MS)
  await exited
  clearInterval(poll)
  running = null
  if (cancelled) return { ok: false, reason: 'cancelled', message: 'Sign-in cancelled.' }

  try {
    const cookies = (await readCookies(exe)).map(toElectronCookie).filter((c) => c !== null)
    if (!cookies.some((c) => isSessionCookie(c.name)))
      return { ok: false, reason: 'not-signed-in', message: 'Chrome closed before you finished signing in to ChatGPT.' }
    return (await store(cookies))
      ? { ok: true }
      : { ok: false, reason: 'failed', message: 'ChatGPT did not accept the sign-in from Chrome. Please try again.' }
  } catch (e) {
    return { ok: false, reason: 'failed', message: `Could not read the sign-in from Chrome: ${(e as Error).message}` }
  }
}

/** Stop waiting and quit the sign-in Chrome. */
export function cancelChromeSignIn(): void {
  cancelled = true
  running?.kill('SIGTERM')
}

/** Forget the Chrome sign-in profile (signing out of ChatGPT in the app). */
export function forgetChromeProfile(): void {
  rmSync(profileDir(), { recursive: true, force: true })
}
