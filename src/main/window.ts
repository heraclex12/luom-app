// Main window. Closing it only hides it: the app keeps running in the menu bar so daily reminders and the
// capture hotkey keep working. Quit from the menu bar icon or with ⌘Q.
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'

let mainWindow: BrowserWindow | null = null
let quitting = false

app.on('before-quit', () => {
  quitting = true
})

/** Load the renderer at a hash route (dev server in development, packaged html in production). */
export function loadRenderer(win: BrowserWindow, route = '/'): void {
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) void win.loadURL(`${rendererUrl}#${route}`)
  else void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route })
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
}

export function createWindow(options: { show?: boolean } = {}): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 820,
    minHeight: 560,
    show: false,
    title: 'EnVi Learn',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // The reminder scheduler runs in this renderer even while the window is hidden; don't throttle its timers.
      backgroundThrottling: false,
      // Chromium's built-in PDF viewer for <iframe src=".pdf"> (reader).
      plugins: true,
    },
  })
  mainWindow = win

  // External links open in the system browser; navigating the SPA away from file:// would lose the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (options.show !== false) win.once('ready-to-show', () => win.show())

  // Hide instead of close so the renderer (reminders, data) stays alive.
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      win.hide()
    }
  })
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  loadRenderer(win)
  return win
}

/** Bring the main window to front (creating it if needed), optionally navigating to a route. */
export function showMainWindow(route?: string): void {
  let win = getMainWindow()
  if (!win) win = createWindow()
  if (route) {
    const send = (): void => win!.webContents.send('app:navigate', route)
    if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send)
    else send()
  }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  app.focus({ steal: true })
}
