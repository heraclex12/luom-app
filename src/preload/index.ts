// Platform surface exposed to the renderer through contextBridge — an explicit allow-list.
// The renderer never gets ipcRenderer or Node; only the primitives listed here.
import { contextBridge, ipcRenderer } from 'electron'
import type { AppNotification, AppStatus, CaptureInfo, NotificationAction } from '../shared/app'
import type { Story, StoryRequest } from '../shared/story'
import type { DictionaryLookupResult, EnViEntry } from '../shared/dictionary'
import type { EnrichRequest } from '../shared/enrich'
import type { AiConfig, AiModelOption, AiStatus } from '../shared/ai'
import type { BookFormat, BookPaths, PickedBookFile } from '../shared/books'
import type { ProxyResult, ProxyStmt, SqlMethod } from '../shared/db'
import type { SuggestEntry } from '../shared/suggest'
import type { TranslateRequest } from '../shared/translate'
import type { TtsSynthesizeRequest, TtsSynthesizeResult } from '../shared/tts'

// Local DB bridge: drizzle sqlite-proxy sends parameterised statements to main (which owns better-sqlite3).
const dbAPI = {
  open: (userId: number): Promise<void> => ipcRenderer.invoke('db:open', userId),
  close: (): Promise<void> => ipcRenderer.invoke('db:close'),
  exec: (sql: string, params: unknown[], method: SqlMethod): Promise<ProxyResult> =>
    ipcRenderer.invoke('db:exec', sql, params, method),
  batch: (stmts: ProxyStmt[]): Promise<ProxyResult[]> => ipcRenderer.invoke('db:batch', stmts),
}

// Book files bridge: file dialog + content-addressed storage (`<userData>/books/<hash>/`); renderer has no fs.
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

// Word suggestions (Datamuse API), fetched by main.
const suggestAPI = {
  query: (q: string): Promise<SuggestEntry[]> => ipcRenderer.invoke('suggest:query', q),
}

// Sentence translation, proxied through main to avoid CORS (en → vi).
const translateAPI = {
  sentence: (req: TranslateRequest): Promise<string> => ipcRenderer.invoke('translate:sentence', req),
}

// Edge TTS: the wss endpoint needs custom headers the renderer WebSocket can't set, so main proxies it.
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
  run: (req: EnrichRequest): Promise<EnViEntry> => ipcRenderer.invoke('enrich:run', req),
}

// AI providers: readiness, model lists and encrypted keys (keys never come back to the renderer).
const aiAPI = {
  status: (cfg: AiConfig): Promise<AiStatus> => ipcRenderer.invoke('ai:status', cfg),
  models: (cfg: AiConfig): Promise<{ models: AiModelOption[]; error?: string }> => ipcRenderer.invoke('ai:models', cfg),
  hasKey: (provider: 'anthropic' | 'openrouter'): Promise<boolean> => ipcRenderer.invoke('ai:has-key', provider),
  setKey: (provider: 'anthropic' | 'openrouter', key: string): Promise<void> =>
    ipcRenderer.invoke('ai:set-key', provider, key),
  chatGptSignIn: (): Promise<void> => ipcRenderer.invoke('chatgpt-web:sign-in'),
  chatGptSignedIn: (): Promise<boolean> => ipcRenderer.invoke('chatgpt-web:signed-in'),
  chatGptSignOut: (): Promise<void> => ipcRenderer.invoke('chatgpt-web:sign-out'),
  chatGptShow: (): Promise<void> => ipcRenderer.invoke('chatgpt-web:show'),
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
  onCaptureTerm: (callback: (term: string, info?: CaptureInfo) => void): (() => void) =>
    on('capture:term', callback),
  onNotificationAction: (callback: (action: NotificationAction) => void): (() => void) =>
    on('app:notification-action', callback),
  generateStory: (req: StoryRequest): Promise<Story> => ipcRenderer.invoke('story:generate', req),
}

contextBridge.exposeInMainWorld('dbAPI', dbAPI)
contextBridge.exposeInMainWorld('booksAPI', booksAPI)
contextBridge.exposeInMainWorld('suggestAPI', suggestAPI)
contextBridge.exposeInMainWorld('translateAPI', translateAPI)
contextBridge.exposeInMainWorld('ttsAPI', ttsAPI)
contextBridge.exposeInMainWorld('dictionaryAPI', dictionaryAPI)
contextBridge.exposeInMainWorld('enrichAPI', enrichAPI)
contextBridge.exposeInMainWorld('aiAPI', aiAPI)
contextBridge.exposeInMainWorld('appAPI', appAPI)
