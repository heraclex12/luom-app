// Menu bar presence + native notifications + launch at login.
// The renderer owns all learning logic: it pushes the due count here (tray title / dock badge) and asks for
// notifications when the daily reminder fires. Clicking a notification or a menu item opens the right page.
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, Tray } from 'electron'
import { join } from 'node:path'
import { triggerCapture, getCaptureShortcut } from './capture'
import { showMainWindow } from './window'
import { SETTINGS_ROUTE, type AppNotification, type AppStatus } from '../shared/app'

let tray: Tray | null = null
let status: AppStatus = { due: 0, newAvailable: 0 }

/** resources/ lives next to the app in dev and under Contents/Resources when packaged. */
export function resourcePath(...parts: string[]): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'resources', ...parts)
    : join(app.getAppPath(), 'resources', ...parts)
}

/** Human-readable accelerator for menus (Alt+Command+E → ⌥⌘E). */
function prettyShortcut(acc: string | null): string {
  if (!acc) return ''
  return acc
    .replace(/CommandOrControl|CmdOrCtrl|Command|Cmd/g, '⌘')
    .replace(/Control|Ctrl/g, '⌃')
    .replace(/Alt|Option/g, '⌥')
    .replace(/Shift/g, '⇧')
    .replace(/\+/g, '')
}

function buildMenu(): Menu {
  const reviewLabel = status.due > 0 ? `Review now — ${status.due} due` : 'Study'
  const shortcut = prettyShortcut(getCaptureShortcut())
  return Menu.buildFromTemplate([
    { label: reviewLabel, click: () => showMainWindow('/wordbook/study') },
    {
      label: shortcut ? `Add a word…   ${shortcut}` : 'Add a word…',
      click: () => void triggerCapture(),
    },
    { label: 'My words', click: () => showMainWindow('/wordbook/words') },
    { type: 'separator' },
    { label: 'Open EnVi Learn', click: () => showMainWindow() },
    { label: 'Settings…', click: () => showMainWindow(SETTINGS_ROUTE) },
    { type: 'separator' },
    { label: 'Quit EnVi Learn', role: 'quit' },
  ])
}

function refreshTray(): void {
  if (!tray) return
  tray.setTitle(status.due > 0 ? ` ${status.due}` : '', { fontType: 'monospacedDigit' })
  tray.setToolTip(status.due > 0 ? `EnVi Learn — ${status.due} words to review` : 'EnVi Learn')
  tray.setContextMenu(buildMenu())
  if (process.platform === 'darwin') app.dock?.setBadge(status.due > 0 ? String(status.due) : '')
}

export function createTray(): void {
  const icon = nativeImage.createFromPath(resourcePath('trayTemplate.png'))
  icon.setTemplateImage(true)
  tray = new Tray(icon)
  refreshTray()
}

function notify(n: AppNotification): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title: n.title, body: n.body, silent: false })
  notification.on('click', () => showMainWindow(n.route))
  notification.show()
}

export function registerMenubarIpc(): void {
  ipcMain.handle('app:status', (_e, next: AppStatus) => {
    status = next
    refreshTray()
  })
  ipcMain.handle('app:notify', (_e, n: AppNotification) => notify(n))
  ipcMain.handle('app:show', (_e, route?: string) => showMainWindow(route))
  ipcMain.handle('app:get-login-item', () => app.getLoginItemSettings().openAtLogin)
  ipcMain.handle('app:set-login-item', (_e, open: boolean) => {
    app.setLoginItemSettings({ openAtLogin: open, openAsHidden: true })
    return app.getLoginItemSettings().openAtLogin
  })
  ipcMain.handle('app:refresh-menu', () => refreshTray())
  // Saved from the capture popup → let every window refresh its word data.
  ipcMain.handle('app:words-changed', (e) => {
    for (const w of BrowserWindow.getAllWindows()) {
      if (w.webContents.id !== e.sender.id) w.webContents.send('app:words-changed')
    }
  })
}
