// Desktop widget (native/widget/, a WidgetKit extension inside Luom.app/Contents/PlugIns): main writes the words the
// renderer picked to <userData>/widget.json, which the sandboxed widget may read; collects the answers the widget
// leaves in <userData>/widget-inbox/ (the renderer rates them); and opens the luom:// links the widget's words carry.
// See shared/widget.ts.
import { app, BrowserWindow, ipcMain } from 'electron'
import { watch } from 'node:fs'
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  parseWidgetRating,
  routeForWidgetUrl,
  sanitizeWidgetData,
  WIDGET_FILE,
  WIDGET_INBOX,
  type WidgetRating,
} from '../shared/widget'
import { showMainWindow } from './window'

let lastWritten: string | null = null

/** Write the widget file when its words changed (atomic: the widget may read it at any moment). */
async function writeWidgetData(v: unknown): Promise<void> {
  const data = sanitizeWidgetData(v)
  if (!data) return
  // updatedAt changes on every call; compare the rest so an unchanged list doesn't touch the file.
  const key = JSON.stringify({ ...data, updatedAt: 0 })
  const file = join(app.getPath('userData'), WIDGET_FILE)
  if (lastWritten === null) {
    const old = await readFile(file, 'utf8').catch(() => null)
    lastWritten = old ? JSON.stringify({ ...sanitizeWidgetData(JSON.parse(old)), updatedAt: 0 }) : ''
  }
  if (key === lastWritten) return
  await writeFile(`${file}.tmp`, JSON.stringify(data), 'utf8')
  await rename(`${file}.tmp`, file)
  lastWritten = key
}

const inboxDir = (): string => join(app.getPath('userData'), WIDGET_INBOX)

/** Answers waiting in the inbox, oldest first; each file is removed once read (bad files too). */
async function takeRatings(): Promise<WidgetRating[]> {
  const dir = inboxDir()
  const names = (await readdir(dir).catch(() => [] as string[])).filter((n) => n.endsWith('.json'))
  const out: WidgetRating[] = []
  for (const name of names) {
    const file = join(dir, name)
    const r = parseWidgetRating(await readFile(file, 'utf8').catch(() => ''))
    await unlink(file).catch(() => {})
    if (r) out.push(r)
  }
  return out.sort((a, b) => a.at - b.at)
}

/** The widget may only write inside this folder, and cannot create it: make it, then tell the windows about answers. */
async function watchInbox(): Promise<void> {
  const dir = inboxDir()
  await mkdir(dir, { recursive: true })
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(dir, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      for (const w of BrowserWindow.getAllWindows()) w.webContents.send('app:widget-inbox')
    }, 300)
  }).on('error', (e) => console.warn('[widget] inbox watch failed', e))
}

export function registerWidgetIpc(): void {
  ipcMain.handle('app:widget-data', (_e, data: unknown) => writeWidgetData(data).catch((e) => console.warn('[widget] write failed', e)))
  ipcMain.handle('app:widget-take-ratings', () => takeRatings())
  void watchInbox().catch((e) => console.warn('[widget] inbox setup failed', e))
}

/**
 * luom:// links from the widget. Registered before app ready: a click can launch Lượm, and the link then arrives
 * before the window exists, so it waits for ready.
 */
export function handleWidgetLinks(): void {
  app.on('open-url', (event, url) => {
    event.preventDefault()
    const route = routeForWidgetUrl(url)
    if (app.isReady()) showMainWindow(route)
    else void app.whenReady().then(() => showMainWindow(route))
  })
}
