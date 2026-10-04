// Pop quiz: a small card that slides in at the bottom-right corner when a word flash is due, asking what one of
// your words means (renderer route /popquiz). It never takes focus; answering is a real review (quickRate).
import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { loadRenderer } from './window'

const WIDTH = 360
const HEIGHT = 250
const MARGIN = 16

let card: BrowserWindow | null = null

function position(): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea
  return { x: area.x + area.width - WIDTH - MARGIN, y: area.y + area.height - HEIGHT - MARGIN }
}

export function openPopQuiz(dictId: number): void {
  // A fresh nonce each time so the card resets even when the same word comes back.
  const route = `/popquiz?dictId=${dictId}&n=${Date.now()}`
  if (card && !card.isDestroyed()) {
    loadRenderer(card, route)
    card.showInactive()
    return
  }
  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    ...position(),
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    type: 'panel',
    roundedCorners: true,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false },
  })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.once('ready-to-show', () => win.showInactive())
  win.on('closed', () => {
    card = null
  })
  card = win
  loadRenderer(win, route)
}

export function registerPopQuizIpc(): void {
  ipcMain.handle('popquiz:open', (_e, dictId: number) => openPopQuiz(dictId))
  ipcMain.handle('popquiz:close', () => card?.close())
}
