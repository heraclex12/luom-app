// Global quick capture: select an English word anywhere (Chrome in any profile / window, PDFs, Slack…), press the
// hotkey, and a small popup looks it up and saves it to my words.
//
// Getting the selection: the native helper (native/selection-helper.swift) reads the selected text through the macOS
// Accessibility API, or sends a clean ⌘C and restores the clipboard. The selection always wins; the clipboard's
// existing text is used only when nothing is selected. Needs Accessibility permission for this app.
import {
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  screen,
  shell,
  systemPreferences,
  type NativeImage,
} from 'electron'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { chooseCaptureText, type CaptureSource, type HelperResult, parseHelperOutput } from './captureText'
import { resourcePath } from './paths'
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

/** Legacy path when the helper binary is missing: synthetic ⌘C through System Events. */
async function copySelectionViaAppleScript(): Promise<string> {
  const saved = snapshotClipboard()
  const marker = `\u2063envi-capture-${Date.now()}`
  clipboard.writeText(marker)
  try {
    await sleep(150) // let the hotkey's modifiers go, otherwise ⌥⌘C reaches the app instead of ⌘C
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

/** Ask the native helper for the frontmost app's selection; null when the helper is unavailable or failed. */
async function runSelectionHelper(): Promise<HelperResult | null> {
  const bin = resourcePath('bin', 'selection-helper')
  if (!existsSync(bin)) return null
  try {
    const { stdout } = await execFileAsync(bin, [], { timeout: 4000 })
    return parseHelperOutput(stdout)
  } catch (e) {
    console.warn('[capture] selection helper failed', e)
    return null
  }
}

export interface CaptureText {
  text: string
  source: CaptureSource
  /** Accessibility permission granted (otherwise only the clipboard can be used). */
  trusted: boolean
}

/** The text to capture: the live selection when there is one, else the clipboard's text. */
export async function readCaptureText(): Promise<CaptureText> {
  let helper = await runSelectionHelper()
  if (!helper && hasAccessibility()) {
    try {
      const copied = await copySelectionViaAppleScript()
      helper = { text: copied, source: copied ? 'copy' : 'none', trusted: true }
    } catch (e) {
      console.warn('[capture] AppleScript copy failed', e)
    }
  }
  const picked = chooseCaptureText(helper, clipboard.readText())
  return { ...picked, trusted: helper?.trusted ?? hasAccessibility() }
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
export function openCapture(term: string, info: { source: CaptureSource; trusted: boolean } = { source: 'none', trusted: hasAccessibility() }): void {
  const { x, y } = popupPosition()
  if (popup && !popup.isDestroyed()) {
    popup.setPosition(x, y)
    popup.webContents.send('capture:term', term, info)
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
  loadRenderer(win, `/capture?${new URLSearchParams({ term, source: info.source, trusted: info.trusted ? '1' : '0' })}`)
}

/** Hotkey handler: grab the selection (or clipboard), then open the popup (empty term = type a word manually). */
export async function triggerCapture(): Promise<void> {
  const { text, source, trusted } = await readCaptureText()
  openCapture(text, { source, trusted })
}

/** (Re)register the global hotkey. Returns false when the accelerator is invalid or taken by another app. */
export function setCaptureShortcut(accelerator: string): boolean {
  if (currentShortcut) globalShortcut.unregister(currentShortcut)
  currentShortcut = null
  try {
    if (!accelerator) return true
    const ok = globalShortcut.register(accelerator, () => void triggerCapture())
    if (ok) currentShortcut = accelerator
    return ok
  } catch {
    return false
  } finally {
    for (const l of shortcutListeners) l(currentShortcut)
  }
}

const shortcutListeners = new Set<(accelerator: string | null) => void>()

/** Called after every (re)registration of the global hotkey (the app menu drops a clashing accelerator). */
export function onCaptureShortcutChange(listener: (accelerator: string | null) => void): void {
  shortcutListeners.add(listener)
}

export function getCaptureShortcut(): string | null {
  return currentShortcut
}

export function registerCaptureIpc(): void {
  ipcMain.handle('capture:set-shortcut', (_e, accelerator: string) => setCaptureShortcut(accelerator))
  ipcMain.handle('capture:accessibility', (_e, prompt: boolean) => {
    const trusted = hasAccessibility(prompt)
    // macOS only shows its prompt once; an entry left from an older build (different signature) looks enabled but
    // no longer applies. Open the list so the user can remove it and add Lượm again.
    if (prompt && !trusted)
      void shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
    return trusted
  })
  ipcMain.handle('capture:open', (_e, term: string) => openCapture(term ?? ''))
  ipcMain.handle('capture:hide', () => popup?.hide())
}
