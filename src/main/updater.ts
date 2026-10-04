// Auto-update from GitHub Releases (electron-updater; feed configured by `publish` in electron-builder.yml).
// Checks on launch and every few hours, downloads in the background, then offers "Restart to update" (notification,
// menu bar, Settings). If the user just quits, the update installs on quit. macOS only installs an update signed by
// the same certificate as the running app (see README → Releases).
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '../shared/update'
import { nextUpdateState, shouldCheckForUpdate, UPDATE_CHECK_INTERVAL_MS, type UpdateEvent } from './updateState'
import { notify, setUpdateReady } from './menubar'
import { markQuitting } from './quitState'

let state: UpdateState = { kind: 'idle' }
let lastCheckAt: number | null = null

function apply(e: UpdateEvent): void {
  const prev = state
  state = nextUpdateState(state, e)
  if (state === prev) return
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('update:state', state)
  if (state.kind === 'ready' && prev.kind !== 'ready') {
    setUpdateReady(state.version, installUpdate)
    notify(
      {
        title: `Lượm ${state.version} is ready`,
        body: 'Click to restart and update now, or it installs the next time you quit.',
      },
      installUpdate,
    )
  }
}

async function check(): Promise<void> {
  if (state.kind === 'unsupported' || state.kind === 'checking' || state.kind === 'downloading') return
  lastCheckAt = Date.now()
  try {
    await autoUpdater.checkForUpdates()
  } catch (e) {
    apply({ type: 'error', message: e instanceof Error ? e.message : String(e) })
  }
}

export function installUpdate(): void {
  if (state.kind !== 'ready') return
  // quitAndInstall closes the windows before before-quit fires; mark the quit first so they don't just hide.
  markQuitting()
  setImmediate(() => autoUpdater.quitAndInstall())
}

export function startUpdater(): void {
  if (!app.isPackaged) {
    state = { kind: 'unsupported' }
    return
  }
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => apply({ type: 'checking' }))
  autoUpdater.on('update-available', (info) => apply({ type: 'available', version: info.version }))
  autoUpdater.on('download-progress', (p) => apply({ type: 'progress', percent: p.percent }))
  autoUpdater.on('update-downloaded', (info) => apply({ type: 'downloaded', version: info.version }))
  autoUpdater.on('update-not-available', () => apply({ type: 'none', at: Date.now() }))
  autoUpdater.on('error', (e) => apply({ type: 'error', message: e?.message ?? String(e) }))

  void check()
  setInterval(() => {
    if (shouldCheckForUpdate(Date.now(), lastCheckAt)) void check()
  }, UPDATE_CHECK_INTERVAL_MS / 6)
}

export function registerUpdaterIpc(): void {
  ipcMain.handle('update:get', () => state)
  ipcMain.handle('update:check', async () => {
    await check()
    return state
  })
  ipcMain.handle('update:install', () => installUpdate())
}
