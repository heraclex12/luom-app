// Menu bar presence + native notifications + launch at login.
// The renderer owns all learning logic: it pushes the due count here (tray title / dock badge) and asks for
// notifications when the daily reminder fires. Clicking a notification or a menu item opens the right page.
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, shell, Tray } from 'electron'
import { resourcePath } from './paths'
import { triggerCapture, getCaptureShortcut } from './capture'
import { showMainWindow } from './window'
import { SETTINGS_ROUTE, type AppNotification, type AppStatus, type NotificationAction } from '../shared/app'

let tray: Tray | null = null
let status: AppStatus = { due: 0, newAvailable: 0 }
/** Downloaded update waiting for a restart (src/main/updater.ts). */
let updateReady: { version: string; install: () => void } | null = null

export function setUpdateReady(version: string, install: () => void): void {
  updateReady = { version, install }
  refreshTray()
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
  const reviewLabel = status.due > 0 ? `Review now (${status.due} due)` : 'Study'
  const shortcut = prettyShortcut(getCaptureShortcut())
  return Menu.buildFromTemplate([
    ...(updateReady
      ? [
          { label: `Restart to update (${updateReady.version})`, click: updateReady.install },
          { type: 'separator' as const },
        ]
      : []),
    { label: reviewLabel, click: () => showMainWindow('/wordbook/study') },
    {
      label: shortcut ? `Add a word…   ${shortcut}` : 'Add a word…',
      click: () => void triggerCapture(),
    },
    { label: 'My words', click: () => showMainWindow('/wordbook/words') },
    { type: 'separator' },
    { label: 'Open Lượm', click: () => showMainWindow() },
    { label: 'Settings…', click: () => showMainWindow(SETTINGS_ROUTE) },
    { type: 'separator' },
    { label: 'Quit Lượm', role: 'quit' },
  ])
}

function refreshTray(): void {
  if (!tray) return
  tray.setTitle(status.due > 0 ? ` ${status.due}` : '', { fontType: 'monospacedDigit' })
  tray.setToolTip(status.due > 0 ? `Lượm: ${status.due} words to review` : 'Lượm')
  tray.setContextMenu(buildMenu())
  if (process.platform === 'darwin') app.dock?.setBadge(status.due > 0 ? String(status.due) : '')
}

export function createTray(): void {
  const icon = nativeImage.createFromPath(resourcePath('trayTemplate.png'))
  icon.setTemplateImage(true)
  tray = new Tray(icon)
  refreshTray()
}

// Keep shown notifications referenced so their action/click handlers survive garbage collection.
const live = new Set<Notification>()

/** Show a notification; `onClick` (main-only use) replaces opening `n.route`. */
export function notify(n: AppNotification, onClick?: () => void): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({
    title: n.title,
    body: n.body,
    silent: false,
    actions: (n.actions ?? []).map((a) => ({ type: 'button' as const, text: a.label })),
  })
  live.add(notification)
  const release = (): void => void live.delete(notification)
  notification.on('click', () => {
    release()
    if (onClick) onClick()
    else showMainWindow(n.route)
  })
  notification.on('action', (_e, index) => {
    release()
    const action = n.actions?.[index]
    if (!action) return
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('app:notification-action', { actionId: action.id, payload: n.payload } satisfies NotificationAction)
    }
  })
  notification.on('close', release)
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
  // System Settings → Notifications → this app (banners / alerts are switched on there).
  ipcMain.handle('app:open-notification-settings', () =>
    shell.openExternal('x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=com.envilearn.app'),
  )
  // Saved from the capture popup → let every window refresh its word data.
  ipcMain.handle('app:words-changed', (e) => {
    for (const w of BrowserWindow.getAllWindows()) {
      if (w.webContents.id !== e.sender.id) w.webContents.send('app:words-changed')
    }
  })
}
