// Platform surface exposed to the renderer through contextBridge — an explicit allow-list.
// The renderer never gets ipcRenderer or Node; only the primitives listed here.
import { contextBridge, ipcRenderer } from 'electron'
import type { AppNotification, AppStatus } from '../shared/app'
import type { DictionaryLookupResult, EnViEntry } from '../shared/dictionary'
import type { EnrichRequest } from '../shared/enrich'
import type { BookFormat, BookPaths, PickedBookFile } from '../shared/books'
import type { ProxyResult, ProxyStmt, SqlMethod } from '../shared/db'
import type { SuggestEntry } from '../shared/suggest'
import type { TranslateRequest } from '../shared/translate'
import type { TtsSynthesizeRequest, TtsSynthesizeResult } from '../shared/tts'

// 本地库桥：drizzle sqlite-proxy 经此把参数化语句送到 main 执行（main 持 better-sqlite3）。
const dbAPI = {
  open: (userId: number): Promise<void> => ipcRenderer.invoke('db:open', userId),
  close: (): Promise<void> => ipcRenderer.invoke('db:close'),
  exec: (sql: string, params: unknown[], method: SqlMethod): Promise<ProxyResult> =>
    ipcRenderer.invoke('db:exec', sql, params, method),
  batch: (stmts: ProxyStmt[]): Promise<ProxyResult[]> => ipcRenderer.invoke('db:batch', stmts),
}

// 书文件桥：文件对话框 + 内容寻址存储（`<userData>/books/<hash>/`）的读写删，renderer 无 fs 能力。
const booksAPI = {
  pick: (): Promise<PickedBookFile | null> => ipcRenderer.invoke('books:pick'),
  hash: (path: string): Promise<string> => ipcRenderer.invoke('books:hash', path),
  import: (srcPath: string, hash: string, format: BookFormat): Promise<void> =>
    ipcRenderer.invoke('books:import', srcPath, hash, format),
  stat: (hash: string, format: BookFormat): Promise<boolean> =>
    ipcRenderer.invoke('books:stat', hash, format),
  statCover: (hash: string): Promise<boolean> => ipcRenderer.invoke('books:stat-cover', hash),
  read: (hash: string, format: BookFormat): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('books:read', hash, format),
  writeCover: (hash: string, pngBytes: Uint8Array): Promise<void> =>
    ipcRenderer.invoke('books:write-cover', hash, pngBytes),
  paths: (hash: string, format: BookFormat): Promise<BookPaths> =>
    ipcRenderer.invoke('books:paths', hash, format),
  deleteDir: (hash: string): Promise<void> => ipcRenderer.invoke('books:delete-dir', hash),
}

// 有道 suggest 转发桥：main 的 fetch 不带 Origin（渲染层直连被 403，lookup.md §2）。
const suggestAPI = {
  query: (q: string): Promise<SuggestEntry[]> => ipcRenderer.invoke('suggest:query', q),
}

// 句子翻译转发桥：Google/Azure 接口 renderer 直连被 CORS 拦，main 转发（原文 en、译文中文写死）。
const translateAPI = {
  sentence: (req: TranslateRequest): Promise<string> => ipcRenderer.invoke('translate:sentence', req),
}

// Edge TTS 合成转发桥：wss 接口需自定义头，renderer 的 WebSocket 设不了头，故 main 带头直连转发。
const ttsAPI = {
  synthesize: (req: TtsSynthesizeRequest): Promise<TtsSynthesizeResult> =>
    ipcRenderer.invoke('tts:synthesize', req),
}

// Subscribe to a main → renderer event; returns an unsubscribe function (prevents listener leaks).
function on<T extends unknown[]>(channel: string, callback: (...args: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]): void => callback(...(args as T))
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// EN→VI dictionary lookups (Google + Free Dictionary, fetched by main).
const dictionaryAPI = {
  lookup: (term: string): Promise<DictionaryLookupResult> => ipcRenderer.invoke('dictionary:lookup', term),
}

// Optional AI enrichment (key stored encrypted in main).
const enrichAPI = {
  hasKey: (): Promise<boolean> => ipcRenderer.invoke('enrich:has-key'),
  setKey: (key: string): Promise<void> => ipcRenderer.invoke('enrich:set-key', key),
  run: (req: EnrichRequest): Promise<EnViEntry> => ipcRenderer.invoke('enrich:run', req),
}

// App shell: menu bar status, notifications, login item, quick capture, cross-window events.
const appAPI = {
  setStatus: (status: AppStatus): Promise<void> => ipcRenderer.invoke('app:status', status),
  notify: (n: AppNotification): Promise<void> => ipcRenderer.invoke('app:notify', n),
  show: (route?: string): Promise<void> => ipcRenderer.invoke('app:show', route),
  getLoginItem: (): Promise<boolean> => ipcRenderer.invoke('app:get-login-item'),
  setLoginItem: (open: boolean): Promise<boolean> => ipcRenderer.invoke('app:set-login-item', open),
  refreshMenu: (): Promise<void> => ipcRenderer.invoke('app:refresh-menu'),
  wordsChanged: (): Promise<void> => ipcRenderer.invoke('app:words-changed'),
  onNavigate: (callback: (route: string) => void): (() => void) => on('app:navigate', callback),
  onWordsChanged: (callback: () => void): (() => void) => on('app:words-changed', callback),
  setCaptureShortcut: (accelerator: string): Promise<boolean> =>
    ipcRenderer.invoke('capture:set-shortcut', accelerator),
  hasAccessibility: (prompt: boolean): Promise<boolean> => ipcRenderer.invoke('capture:accessibility', prompt),
  openCapture: (term: string): Promise<void> => ipcRenderer.invoke('capture:open', term),
  hideCapture: (): Promise<void> => ipcRenderer.invoke('capture:hide'),
  onCaptureTerm: (callback: (term: string) => void): (() => void) => on('capture:term', callback),
}

contextBridge.exposeInMainWorld('dbAPI', dbAPI)
contextBridge.exposeInMainWorld('booksAPI', booksAPI)
contextBridge.exposeInMainWorld('suggestAPI', suggestAPI)
contextBridge.exposeInMainWorld('translateAPI', translateAPI)
contextBridge.exposeInMainWorld('ttsAPI', ttsAPI)
contextBridge.exposeInMainWorld('dictionaryAPI', dictionaryAPI)
contextBridge.exposeInMainWorld('enrichAPI', enrichAPI)
contextBridge.exposeInMainWorld('appAPI', appAPI)
