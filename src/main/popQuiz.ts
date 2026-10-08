// Pop quiz: a small card that slides in at the bottom-right corner when a word flash is due, asking what your
// words mean, one after another (renderer route /popquiz). It never takes focus; answering is a real review
// (quickRate). A card still on screen is never replaced mid-round.
import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { loadRenderer } from './window'

const WIDTH = 360
const HEIGHT = 250
const MAX_HEIGHT = 520
const MARGIN = 16

let card: BrowserWindow | null = null

function position(height = HEIGHT): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea
  return { x: area.x + area.width - WIDTH - MARGIN, y: area.y + area.height - height - MARGIN }
}

/** Long meanings make the card taller: grow (or shrink) to the content, bottom edge staying put. */
function fit(height: number): void {
  if (!card || card.isDestroyed() || !Number.isFinite(height)) return
  const area = screen.getPrimaryDisplay().workArea
  const h = Math.round(Math.min(Math.max(height, 120), MAX_HEIGHT, area.height - 2 * MARGIN))
  if (h === card.getBounds().height) return
  card.setBounds({ ...position(h), width: WIDTH, height: h })
}

/** Show a quiz for these words; false when a card is still up (the learner is mid-round). */
export function openPopQuiz(dictIds: readonly number[]): boolean {
  const ids = dictIds.filter((id) => Number.isInteger(id) && id > 0)
  if (ids.length === 0) return false
  if (card && !card.isDestroyed() && card.isVisible()) return false
  // A fresh nonce each time so the card resets even when the same words come back.
  const route = `/popquiz?ids=${ids.join(',')}&n=${Date.now()}`
  if (card && !card.isDestroyed()) {
    loadRenderer(card, route)
    card.showInactive()
    return true
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
  return true
}

export function registerPopQuizIpc(): void {
  ipcMain.handle('popquiz:open', (_e, dictIds: number[]) => openPopQuiz(Array.isArray(dictIds) ? dictIds : []))
  ipcMain.handle('popquiz:close', () => card?.close())
  ipcMain.handle('popquiz:fit', (_e, height: number) => fit(height))
}
