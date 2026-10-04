// Global quick capture: select an English word anywhere (Chrome in any profile / window, PDFs, Slack…), press the
// hotkey, and a small popup looks it up and saves it to my words.
//
// Getting the selection: macOS has no API for "selected text in another app", so we do what PopClip-style tools do —
// send ⌘C to the frontmost app (System Events, needs Accessibility permission), read the clipboard, then restore the
// user's clipboard. Without the permission we fall back to whatever text is already on the clipboard.
import {
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  screen,
  systemPreferences,
  type NativeImage,
} from 'electron'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { loadRenderer } from './window'

const execFileAsync = promisify(execFile)

export const DEFAULT_CAPTURE_SHORTCUT = 'Alt+Command+E'

const POPUP_WIDTH = 400
const POPUP_HEIGHT = 520

let popup: BrowserWindow | null = null
let currentShortcut: string | null = null

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Whether this app may send keystrokes (System Settings → Privacy & Security → Accessibility). */
export function hasAccessibility(prompt = false): boolean {
  return process.platform === 'darwin' ? systemPreferences.isTrustedAccessibilityClient(prompt) : false
}

interface ClipboardSnapshot {
  text: string
  html: string
  rtf: string
  image: NativeImage
}

function snapshotClipboard(): ClipboardSnapshot {
  return {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
    rtf: clipboard.readRTF(),
    image: clipboard.readImage(),
  }
}

function restoreClipboard(s: ClipboardSnapshot): void {
  const data: Electron.Data = {}
  if (s.text) data.text = s.text
  if (s.html) data.html = s.html
  if (s.rtf) data.rtf = s.rtf
  if (!s.image.isEmpty()) data.image = s.image
  if (Object.keys(data).length === 0) clipboard.clear()
  else clipboard.write(data)
}

/** Copy the frontmost app's selection via a synthetic ⌘C and give the clipboard back untouched. */
async function copySelection(): Promise<string> {
  const saved = snapshotClipboard()
  const marker = `⁣envi-capture-${Date.now()}`
  clipboard.writeText(marker)
  try {
    // Let the user release the hotkey's modifiers first, otherwise ⌥⌘C reaches the app instead of ⌘C.
    await sleep(150)
    await execFileAsync('osascript', ['-e', 'tell application "System Events" to keystroke "c" using {command down}'])
    for (let waited = 0; waited < 800; waited += 40) {
      const now = clipboard.readText()
      if (now !== marker) return now
      await sleep(40)
    }
    return ''
  } finally {
    restoreClipboard(saved)
  }
}

/** The text to capture: the live selection when we can read it, else the clipboard's text. */
export async function readSelectedText(): Promise<string> {
  if (hasAccessibility()) {
    try {
      const selected = (await copySelection()).trim()
      if (selected) return selected
    } catch (e) {
      console.warn('[capture] copying the selection failed, using the clipboard', e)
    }
  }
  return clipboard.readText().trim()
}

function popupPosition(): { x: number; y: number } {
  const cursor = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(cursor)
  const x = Math.min(Math.max(cursor.x + 12, workArea.x + 8), workArea.x + workArea.width - POPUP_WIDTH - 8)
  const y = Math.min(Math.max(cursor.y + 16, workArea.y + 8), workArea.y + workArea.height - POPUP_HEIGHT - 8)
  return { x: Math.round(x), y: Math.round(y) }
}

function createPopup(): BrowserWindow {
  const win = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // NSPanel: floats above full-screen apps (e.g. full-screen Chrome) like a system popover.
    type: 'panel',
    roundedCorners: true,
    backgroundColor: '#00000000',
    transparent: true,
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.on('blur', () => {
    if (!win.isDestroyed() && !win.webContents.isDevToolsOpened()) win.hide()
  })
  win.on('closed', () => {
    popup = null
  })
  return win
}

/** Show the capture popup for a term (reuses one window; a new term is pushed to the page). */
export function openCapture(term: string): void {
  const { x, y } = popupPosition()
  if (popup && !popup.isDestroyed()) {
    popup.setPosition(x, y)
    popup.webContents.send('capture:term', term)
    popup.show()
    popup.focus()
    return
  }
  popup = createPopup()
  popup.setPosition(x, y)
  const win = popup
  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })
  loadRenderer(win, `/capture?term=${encodeURIComponent(term)}`)
}

/** Hotkey handler: grab the selection, then open the popup (empty term = type a word manually). */
export async function triggerCapture(): Promise<void> {
  const text = await readSelectedText()
  // Long selections (whole paragraphs) are not vocabulary; open empty so the user can type instead.
  openCapture(text.length <= 120 ? text.replace(/\s+/g, ' ') : '')
}

/** (Re)register the global hotkey. Returns false when the accelerator is invalid or taken by another app. */
export function setCaptureShortcut(accelerator: string): boolean {
  if (currentShortcut) globalShortcut.unregister(currentShortcut)
  currentShortcut = null
  if (!accelerator) return true
  try {
    const ok = globalShortcut.register(accelerator, () => void triggerCapture())
    if (ok) currentShortcut = accelerator
    return ok
  } catch {
    return false
  }
}

export function getCaptureShortcut(): string | null {
  return currentShortcut
}

export function registerCaptureIpc(): void {
  ipcMain.handle('capture:set-shortcut', (_e, accelerator: string) => setCaptureShortcut(accelerator))
  ipcMain.handle('capture:accessibility', (_e, prompt: boolean) => hasAccessibility(prompt))
  ipcMain.handle('capture:open', (_e, term: string) => openCapture(term ?? ''))
  ipcMain.handle('capture:hide', () => popup?.hide())
}
