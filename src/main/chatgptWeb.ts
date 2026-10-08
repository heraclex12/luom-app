// "ChatGPT (built in)": use the ChatGPT models on the user's own account by driving the real chatgpt.com page in a
// hidden Electron window, the same way the codex-chatgpt-web project does with its browser (sign in once, open a
// temporary chat, put the prompt in the composer, press Send, read the finished reply from the page).
// The page itself does all networking and any verification; nothing here calls ChatGPT's private API.
// One request at a time. Model / effort pickers are not automated: the account's default model answers.
import { app, BrowserWindow, ipcMain, session as electronSession, type Session } from 'electron'
import { answerState, browserUserAgent, signInStep, type PageSnapshot } from './chatgptWebState'
import { isQuitting } from './quitState'
import { cancelChromeSignIn, chromePath, forgetChromeProfile, signInWithChrome } from './chatgptChrome'
import type { AppCookie } from './chatgptWebState'

const PARTITION = 'persist:chatgpt'
const LOGIN_URL = 'https://chatgpt.com/auth/login'
const TEMP_CHAT_URL = 'https://chatgpt.com/?temporary-chat=true'
const COMPOSER_TIMEOUT_MS = 45_000
const ANSWER_TIMEOUT_MS = 240_000

// Selectors start from codex-chatgpt-web (src/chatgpt-session.ts) plus the current markup (a plain textarea and a
// "Send message" button); ChatGPT changes its markup from time to time.
const COMPOSER = [
  'form textarea[name="prompt-textarea"]',
  'form textarea',
  '[data-testid="prompt-textarea"]',
  '#prompt-textarea',
  '[contenteditable="true"][data-lexical-editor="true"]',
  'form[data-chatgpt-composer] [data-composer-markdown][contenteditable="true"][role="textbox"]',
].join(', ')
// Scoped to the composer's form: the page has other submit buttons (Dismiss, Close).
const SEND = '[data-testid="send-button"], button[aria-label="Send message"], button[aria-label="Send prompt"]'
const STOP =
  '[data-testid="stop-button"], button[aria-label="Stop generating"], form[data-chatgpt-composer] button[type="button"][aria-label="Stop"]'
const COPY =
  'button[aria-label="Copy response"], button[data-testid="copy-turn-action-button"], [data-turn-key] .turn-action-controls button'
const ASSISTANT = [
  'li[data-message-role="assistant"]',
  '[data-testid^="conversation-turn-"][data-turn="assistant"]:not([data-turn-key] *)',
  '[data-testid^="conversation-turn-"][data-message-author-role="assistant"]:not([data-turn-key] *)',
  '[data-testid^="conversation-turn-"]:has([data-message-author-role="assistant"]):not([data-turn-key] *)',
  '[data-turn-key]:has([data-conversation-role="assistant"], [data-chatgpt-agent-turn-start])',
].join(', ')

let configured = false
function chatSession(): Session {
  const s = electronSession.fromPartition(PARTITION)
  if (!configured) {
    s.setUserAgent(browserUserAgent(process.versions.chrome))
    configured = true
  }
  return s
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// ─────────────────────────── sign-in ───────────────────────────

let signInWindow: BrowserWindow | null = null

/** Small window showing only ChatGPT's login screen (in the ChatGPT profile). It closes by itself once the user is
 *  signed in; the parent window is focused again, which makes Settings re-check the status. */
export function openSignIn(parent?: BrowserWindow | null): void {
  if (signInWindow && !signInWindow.isDestroyed()) {
    signInWindow.focus()
    return
  }
  chatSession()
  const win = new BrowserWindow({
    width: 480,
    height: 720,
    title: 'Sign in to ChatGPT',
    parent: parent ?? undefined,
    minimizable: false,
    fullscreenable: false,
    webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false },
  })
  signInWindow = win
  win.setMenuBarVisibility(false)
  const onNavigate = async (url: string): Promise<void> => {
    const step = signInStep(url, await isSignedIn())
    if (win.isDestroyed()) return
    if (step === 'close') win.close()
    else if (step === 'login') void win.loadURL(LOGIN_URL)
  }
  win.webContents.on('did-navigate', (_e, url) => void onNavigate(url))
  win.webContents.on('did-navigate-in-page', (_e, url) => void onNavigate(url))
  win.on('closed', () => {
    signInWindow = null
    if (parent && !parent.isDestroyed()) parent.focus()
  })
  void win.loadURL(LOGIN_URL)
}

/** Signed in = the page's own session endpoint returns a user for this profile. */
export async function isSignedIn(): Promise<boolean> {
  try {
    const res = await chatSession().fetch('https://chatgpt.com/api/auth/session', { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return false
    const data = (await res.json()) as { user?: unknown }
    return !!data.user
  } catch {
    return false
  }
}

/** Sign out by clearing the ChatGPT profile (cookies and storage) and the Chrome sign-in profile. */
export async function signOut(): Promise<void> {
  await chatSession().clearStorageData()
  forgetChromeProfile()
}

/** Sign in with Chrome (chatgptChrome.ts): the ChatGPT cookies from Chrome go into this session. */
async function storeChromeCookies(cookies: AppCookie[]): Promise<boolean> {
  const s = chatSession()
  for (const c of cookies) await s.cookies.set(c).catch((e: unknown) => console.warn(`[chatgpt] cookie ${c.name}: ${(e as Error).message}`))
  await s.cookies.flushStore()
  return isSignedIn()
}

// ─────────────────────────── worker ───────────────────────────

let worker: BrowserWindow | null = null

function workerWindow(): BrowserWindow {
  if (worker && !worker.isDestroyed()) return worker
  worker = new BrowserWindow({
    width: 1100,
    height: 850,
    show: false,
    title: 'ChatGPT (Lượm)',
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      // Keep timers and rendering running while hidden.
      backgroundThrottling: false,
    },
  })
  chatSession()
  worker.on('close', (e) => {
    // Shown only for a verification step; closing it just hides it again.
    if (!isQuitting() && worker && !worker.isDestroyed()) {
      e.preventDefault()
      worker.hide()
    }
  })
  return worker
}

const run = <T>(win: BrowserWindow, fn: string): Promise<T> => win.webContents.executeJavaScript(fn, true) as Promise<T>

/** Collect a PageSnapshot inside chatgpt.com. */
function snapshotScript(): string {
  return `(() => {
    const q = (s) => Array.from(document.querySelectorAll(s));
    const visible = (el) => !!el && el.getClientRects().length > 0;
    const turns = q(${JSON.stringify(ASSISTANT)});
    const last = turns[turns.length - 1];
    const copy = q(${JSON.stringify(COPY)}).filter(visible);
    const copyAfter = !!last && copy.some((b) => last.contains(b) || (last.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
    // Visible error banners only; the page also keeps hidden form-validation alerts (login dialog).
    const banner = q('[role="alert"], .text-token-text-error, [data-testid="message-error"]')
      .filter((e) => visible(e) && !e.closest('form, [role="dialog"]'))
      .map((e) => e.innerText.trim()).filter(Boolean)[0] || '';
    // Inline failures in the conversation (outside the user's own messages), e.g. "Unable to connect · Retry".
    const inline = q('[data-conversation-transcript] > :not([data-message-role="user"])')
      .map((e) => (e.innerText || '').trim())
      .find((t) => /^(unable to connect|something went wrong|network error)/i.test(t)) || '';
    // (Backslashes are doubled: this runs inside a template string.)
    const err = banner || inline.split('\\n')[0].replace(/\\s*[·•]\\s*retry.*$/i, '');
    const loginButton = q('button, a').some((b) => /^(log in|sign up)$/i.test((b.innerText || '').trim()));
    return {
      url: location.href,
      signedIn: !loginButton,
      hasComposer: !!document.querySelector(${JSON.stringify(COMPOSER)}),
      assistantTurns: turns.length,
      lastAssistantText: last ? last.innerText : '',
      stopVisible: q(${JSON.stringify(STOP)}).some(visible),
      copyAfterLastAssistant: copyAfter,
      lastComplete: !!last && last.hasAttribute('data-message-complete'),
      lastStreaming: !!last && last.hasAttribute('data-message-streaming'),
      errorText: err,
    };
  })()`
}

async function waitForComposer(win: BrowserWindow): Promise<PageSnapshot> {
  const deadline = Date.now() + COMPOSER_TIMEOUT_MS
  for (;;) {
    const s = await run<PageSnapshot>(win, snapshotScript()).catch(() => null)
    if (s && !s.signedIn) throw new Error('Sign in to ChatGPT first (Settings → AI → Sign in to ChatGPT).')
    if (s?.hasComposer) return s
    if (Date.now() > deadline) {
      // Probably a verification page: let the user see it.
      win.show()
      throw new Error('ChatGPT needs your attention in its window (for example a verification step). Finish it, then try again.')
    }
    await sleep(500)
  }
}

let queue: Promise<unknown> = Promise.resolve()

/** Send one prompt in a fresh temporary chat and return the finished reply text. */
export function askChatGpt(prompt: string): Promise<string> {
  const job = queue.then(() => askNow(prompt))
  queue = job.catch(() => {})
  return job
}

async function askNow(prompt: string): Promise<string> {
  const win = workerWindow()
  await win.loadURL(TEMP_CHAT_URL)
  const before = await waitForComposer(win)

  // Focus the composer and insert the text like typing (works for the textarea and the older rich-text editor).
  // Select all first so a draft ChatGPT kept in the box is replaced, not appended to.
  await run(win, `(() => { const c = document.querySelector(${JSON.stringify(COMPOSER)}); c.focus(); return true })()`)
  win.webContents.selectAll()
  await win.webContents.insertText(prompt)
  await sleep(400)
  const sent = await run<boolean>(
    win,
    `(() => { const c = document.querySelector(${JSON.stringify(COMPOSER)});
      const scope = (c && c.closest('form')) || document;
      const b = Array.from(scope.querySelectorAll(${JSON.stringify(SEND)})).find((x) => !x.disabled);
      if (!b) return false; b.click(); return true })()`,
  )
  if (!sent) throw new Error('Could not press Send on ChatGPT. The page may have changed; try again later.')

  const deadline = Date.now() + ANSWER_TIMEOUT_MS
  for (;;) {
    await sleep(700)
    const s = await run<PageSnapshot>(win, snapshotScript()).catch(() => null)
    if (s) {
      const state = answerState(s, before.assistantTurns)
      if (state.kind === 'done') return state.text
      if (state.kind === 'failed') {
        if (state.reason === 'signed-out') throw new Error('Sign in to ChatGPT first (Settings → AI → Sign in to ChatGPT).')
        if (state.reason === 'limit') throw new Error(`ChatGPT: ${state.message ?? 'usage limit reached.'}`)
        throw new Error(`ChatGPT: ${state.message ?? 'something went wrong.'}`)
      }
    }
    if (Date.now() > deadline) throw new Error('ChatGPT took too long to answer. Try again.')
  }
}

export function registerChatGptWebIpc(): void {
  ipcMain.handle('chatgpt-web:sign-in', (e) => openSignIn(BrowserWindow.fromWebContents(e.sender)))
  ipcMain.handle('chatgpt-web:signed-in', () => isSignedIn())
  ipcMain.handle('chatgpt-web:sign-out', () => signOut())
  ipcMain.handle('chatgpt-web:chrome-available', () => chromePath() !== null)
  ipcMain.handle('chatgpt-web:sign-in-chrome', () => signInWithChrome(storeChromeCookies))
  ipcMain.handle('chatgpt-web:chrome-cancel', () => cancelChromeSignIn())
}
