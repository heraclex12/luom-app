// Thin platform-bridge wrapper: the only place in the renderer that touches window.*API.
// Everything above (db/client, dict, reading, app integration) depends on this module, which keeps the surface small
// and easy to fake in tests.
import type { UpdateState } from '../../../shared/update'
import type { ProxyResult, ProxyStmt, SqlMethod } from '../../../shared/db'
import type { AppNotification, AppStatus, CaptureInfo, NotificationAction } from '../../../shared/app'
import type { Story, StoryRequest } from '../../../shared/story'
import type { DictionaryLookupResult, EnViEntry } from '../../../shared/dictionary'
import type { EnrichRequest } from '../../../shared/enrich'
import type { AiConfig, AiModelOption, AiStatus } from '../../../shared/ai'
import { bookCoverUrl, type BookFormat, type BookPaths, type PickedBookFile } from '../../../shared/books'
import type { SuggestEntry } from '../../../shared/suggest'
import type { TranslateRequest } from '../../../shared/translate'
import type { TtsSynthesizeRequest, TtsSynthesizeResult } from '../../../shared/tts'

/** 本地库桥（better-sqlite3 在 main；这里只传参数化语句）。 */
export const dbBridge = {
  open: (userId: number): Promise<void> => window.dbAPI.open(userId),
  close: (): Promise<void> => window.dbAPI.close(),
  exec: (sql: string, params: unknown[], method: SqlMethod): Promise<ProxyResult> =>
    window.dbAPI.exec(sql, params, method),
  batch: (stmts: ProxyStmt[]): Promise<ProxyResult[]> => window.dbAPI.batch(stmts),
}

/**
 * 书文件桥（文件对话框 + `<userData>/books/<hash>/` 内容寻址存储；renderer 无 fs 能力）。
 * 只做搬运不做判断：书是否已在书架、元数据怎么取，全在 reading 域。
 */
export const booksBridge = {
  /** 选书（取消返回 null）。 */
  pick: (): Promise<PickedBookFile | null> => window.booksAPI.pick(),
  /** 算书籍身份（部分 MD5，32 位小写 hex）。 */
  hash: (path: string): Promise<string> => window.booksAPI.hash(path),
  /** 拷进内容寻址存储（目标已存在则幂等跳过）。 */
  importFile: (srcPath: string, hash: string, format: BookFormat): Promise<void> =>
    window.booksAPI.import(srcPath, hash, format),
  /** 书文件在不在本机（幽灵书判定；不设状态列，每次运行时问文件系统）。 */
  stat: (hash: string, format: BookFormat): Promise<boolean> => window.booksAPI.stat(hash, format),
  /** 封面在不在本机（缺封面的 EPUB / 幽灵书都没有；决定书架挂图还是走文字书封）。 */
  statCover: (hash: string): Promise<boolean> => window.booksAPI.statCover(hash),
  /** 封面的可渲染 URL（自定义协议，直接喂 `<img src>`）。纯拼串，不碰盘，故不过 IPC。 */
  coverUrl: (hash: string): string => bookCoverUrl(hash),
  /** 读整本（开书用）。 */
  read: (hash: string, format: BookFormat): Promise<ArrayBuffer> => window.booksAPI.read(hash, format),
  /** 写封面 PNG（导入时提取）。 */
  writeCover: (hash: string, pngBytes: Uint8Array): Promise<void> =>
    window.booksAPI.writeCover(hash, pngBytes),
  /** 取绝对路径（书架封面 `<img>` 经 `file://` 直读）。 */
  paths: (hash: string, format: BookFormat): Promise<BookPaths> => window.booksAPI.paths(hash, format),
  /** 删书目录（书文件 + 封面）。 */
  deleteDir: (hash: string): Promise<void> => window.booksAPI.deleteDir(hash),
}

/** Search suggestions (Datamuse via main; failures return an empty list). */
export const suggestBridge = {
  query: (q: string): Promise<SuggestEntry[]> => window.suggestAPI.query(q),
}

/** Reader sentence translation (English → Vietnamese via main; failures throw). */
export const translateBridge = {
  sentence: (req: TranslateRequest): Promise<string> => window.translateAPI.sentence(req),
}

/** Edge TTS 合成转发桥（main 带头 wss 直连；返回整段 MP3 + 逐词边界；失败抛错交上层回滚提示）。 */
export const ttsBridge = {
  synthesize: (req: TtsSynthesizeRequest): Promise<TtsSynthesizeResult> =>
    window.ttsAPI.synthesize(req),
}

/** EN→VI dictionary lookups (main fetches; not-found resolves, network failure rejects). */
export const dictionaryBridge = {
  lookup: (term: string): Promise<DictionaryLookupResult> => window.dictionaryAPI.lookup(term),
}

/** Optional AI enrichment with the user's Anthropic key (kept encrypted in main). */
export const enrichBridge = {
  run: (req: EnrichRequest): Promise<EnViEntry> => window.enrichAPI.run(req),
}

/** AI providers (Claude / OpenRouter / ChatGPT bridge): readiness, model lists, encrypted keys. */
export const aiBridge = {
  status: (cfg: AiConfig): Promise<AiStatus> => window.aiAPI.status(cfg),
  models: (cfg: AiConfig): Promise<{ models: AiModelOption[]; error?: string }> => window.aiAPI.models(cfg),
  hasKey: (provider: 'anthropic' | 'openrouter'): Promise<boolean> => window.aiAPI.hasKey(provider),
  setKey: (provider: 'anthropic' | 'openrouter', key: string): Promise<void> => window.aiAPI.setKey(provider, key),
  /** Whether this build includes a free OpenRouter key (the key itself never leaves main). */
  hasBuiltInKey: (): Promise<boolean> => window.aiAPI.hasBuiltInKey(),
  /** Built-in ChatGPT: open the sign-in window / check / sign out. */
  chatGptSignIn: (): Promise<void> => window.aiAPI.chatGptSignIn(),
  chatGptSignedIn: (): Promise<boolean> => window.aiAPI.chatGptSignedIn(),
  chatGptSignOut: (): Promise<void> => window.aiAPI.chatGptSignOut(),
}

/** App shell: menu bar, notifications, login item, quick capture, cross-window events. */
/** Auto-update (GitHub Releases): status, check now, restart to install. */
export const updateBridge = {
  get: (): Promise<UpdateState> => window.updateAPI.get(),
  check: (): Promise<UpdateState> => window.updateAPI.check(),
  install: (): Promise<void> => window.updateAPI.install(),
  onState: (cb: (state: UpdateState) => void): (() => void) => window.updateAPI.onState(cb),
}

export const appBridge = {
  openNotificationSettings: (): Promise<void> => window.appAPI.openNotificationSettings(),
  setStatus: (status: AppStatus): Promise<void> => window.appAPI.setStatus(status),
  notify: (n: AppNotification): Promise<void> => window.appAPI.notify(n),
  show: (route?: string): Promise<void> => window.appAPI.show(route),
  getLoginItem: (): Promise<boolean> => window.appAPI.getLoginItem(),
  setLoginItem: (open: boolean): Promise<boolean> => window.appAPI.setLoginItem(open),
  refreshMenu: (): Promise<void> => window.appAPI.refreshMenu(),
  wordsChanged: (): Promise<void> => window.appAPI.wordsChanged(),
  onNavigate: (cb: (route: string) => void): (() => void) => window.appAPI.onNavigate(cb),
  onWordsChanged: (cb: () => void): (() => void) => window.appAPI.onWordsChanged(cb),
  setCaptureShortcut: (accelerator: string): Promise<boolean> => window.appAPI.setCaptureShortcut(accelerator),
  hasAccessibility: (prompt = false): Promise<boolean> => window.appAPI.hasAccessibility(prompt),
  openCapture: (term = ''): Promise<void> => window.appAPI.openCapture(term),
  hideCapture: (): Promise<void> => window.appAPI.hideCapture(),
  onCaptureTerm: (cb: (term: string, info?: CaptureInfo) => void): (() => void) => window.appAPI.onCaptureTerm(cb),
  onNotificationAction: (cb: (action: NotificationAction) => void): (() => void) =>
    window.appAPI.onNotificationAction(cb),
}

/** Story mode: Claude writes a short story with the learner's words (needs the Anthropic key). */
export const storyBridge = {
  generate: (req: StoryRequest): Promise<Story> => window.appAPI.generateStory(req),
}
