// Thin platform-bridge wrapper: the only place in the renderer that touches window.*API.
// Everything above (db/client, dict, reading, app integration) depends on this module, which keeps the surface small
// and easy to fake in tests.
import type { UpdateState } from '../../../shared/update'
import type { WidgetData, WidgetRating } from '../../../shared/widget'
import type { Episode, EpisodeRequest, SeasonBible, SeasonRequest } from '../../../shared/episodes'
import type { ProxyResult, ProxyStmt, SqlMethod } from '../../../shared/db'
import type { AppNotification, AppStatus, CaptureInfo, NotificationAction } from '../../../shared/app'
import type { Story, StoryRequest } from '../../../shared/story'
import type { DictionaryLookupResult, EnViEntry } from '../../../shared/dictionary'
import type { EnrichRequest } from '../../../shared/enrich'
import type { AiConfig, AiModelOption, AiStatus, ChromeSignInResult } from '../../../shared/ai'
import type { Feedback, FeedbackRequest, Situation, SituationRequest } from '../../../shared/practice'
import type { Recognition } from '../../../shared/voice'
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

/** Improve with AI: a richer entry from the AI service chosen in Settings → AI. */
export const enrichBridge = {
  run: (req: EnrichRequest): Promise<EnViEntry> => window.enrichAPI.run(req),
}

/** AI services (Lượm (Free) / ChatGPT / Custom API): readiness, Custom API models and key, ChatGPT sign-in. */
export const aiBridge = {
  status: (cfg: AiConfig): Promise<AiStatus> => window.aiAPI.status(cfg),
  models: (cfg: AiConfig): Promise<{ models: AiModelOption[]; error?: string }> => window.aiAPI.models(cfg),
  /** Custom API key (kept encrypted in main; never sent back). */
  hasKey: (): Promise<boolean> => window.aiAPI.hasKey(),
  setKey: (key: string): Promise<void> => window.aiAPI.setKey(key),
  /** Built-in ChatGPT: open the sign-in window / check / sign out. */
  chatGptSignIn: (): Promise<void> => window.aiAPI.chatGptSignIn(),
  chatGptSignedIn: (): Promise<boolean> => window.aiAPI.chatGptSignedIn(),
  chatGptSignOut: (): Promise<void> => window.aiAPI.chatGptSignOut(),
  /** Sign in with Chrome: Google sign-in works there (it is refused inside app windows). */
  chatGptChromeAvailable: (): Promise<boolean> => window.aiAPI.chatGptChromeAvailable(),
  chatGptSignInChrome: (): Promise<ChromeSignInResult> => window.aiAPI.chatGptSignInChrome(),
  chatGptChromeCancel: (): Promise<void> => window.aiAPI.chatGptChromeCancel(),
  /** Signed in in Chrome: finish now (Chrome is quit and the sign-in copied). */
  chatGptChromeDone: (): Promise<void> => window.aiAPI.chatGptChromeDone(),
  /** Lượm (Free) answers left today (null when this build has no free service). */
  freeLeft: (): Promise<number | null> => window.aiAPI.freeLeft(),
  onFreeLeft: (cb: (left: number) => void): (() => void) => window.aiAPI.onFreeLeft(cb),
}

/** App shell: menu bar, notifications, login item, quick capture, cross-window events. */
/** Daily Episodes: AI season plan and episodes (main/episodes.ts). */
export const episodesBridge = {
  season: (req: SeasonRequest): Promise<SeasonBible> => window.episodesAPI.season(req),
  episode: (req: EpisodeRequest): Promise<Episode> => window.episodesAPI.episode(req),
}

/** Write back: AI situations and feedback (main/practice.ts). */
export const practiceBridge = {
  situation: (req: SituationRequest): Promise<Situation> => window.practiceAPI.situation(req),
  feedback: (req: FeedbackRequest): Promise<Feedback> => window.practiceAPI.feedback(req),
}

/** Voice: microphone permission and on-device speech recognition (main/voice.ts). */
export const voiceBridge = {
  mic: (): Promise<'granted' | 'denied'> => window.voiceAPI.mic(),
  recognize: (wav: Uint8Array): Promise<Recognition> => window.voiceAPI.recognize(wav),
  openPrivacy: (pane: 'microphone' | 'speech'): Promise<void> => window.voiceAPI.openPrivacy(pane),
}

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
  idleSeconds: (): Promise<number> => window.appAPI.idleSeconds(),
  setWidgetData: (data: WidgetData): Promise<void> => window.appAPI.setWidgetData(data),
  takeWidgetRatings: (): Promise<WidgetRating[]> => window.appAPI.takeWidgetRatings(),
  onWidgetInbox: (callback: () => void): (() => void) => window.appAPI.onWidgetInbox(callback),
  wordsChanged: (): Promise<void> => window.appAPI.wordsChanged(),
  onNavigate: (cb: (route: string) => void): (() => void) => window.appAPI.onNavigate(cb),
  onWordsChanged: (cb: () => void): (() => void) => window.appAPI.onWordsChanged(cb),
  setCaptureShortcut: (accelerator: string): Promise<boolean> => window.appAPI.setCaptureShortcut(accelerator),
  hasAccessibility: (prompt = false): Promise<boolean> => window.appAPI.hasAccessibility(prompt),
  openCapture: (term = ''): Promise<void> => window.appAPI.openCapture(term),
  hideCapture: (): Promise<void> => window.appAPI.hideCapture(),
  /** Pop quiz card for a word flash (bottom-right, never takes focus). */
  openPopQuiz: (dictIds: number[]): Promise<boolean> => window.appAPI.openPopQuiz(dictIds),
  closePopQuiz: (): Promise<void> => window.appAPI.closePopQuiz(),
  /** Resize the pop quiz card to its content height (main clamps it and keeps the bottom edge). */
  fitPopQuiz: (height: number): Promise<void> => window.appAPI.fitPopQuiz(height),
  /** Turn the pop quiz card into Write back (wider, focused for typing). */
  practicePopQuiz: (): Promise<void> => window.appAPI.practicePopQuiz(),
  onCaptureTerm: (cb: (term: string, info?: CaptureInfo) => void): (() => void) => window.appAPI.onCaptureTerm(cb),
  onNotificationAction: (cb: (action: NotificationAction) => void): (() => void) =>
    window.appAPI.onNotificationAction(cb),
  /** Anonymous usage stats on/off, with the AI service in use. */
  setUsageSharing: (share: boolean, aiService: string): Promise<void> => window.appAPI.setUsageSharing(share, aiService),
}

/** Story mode: the AI service from Settings → AI writes a short story with the learner's words. */
export const storyBridge = {
  generate: (req: StoryRequest): Promise<Story> => window.appAPI.generateStory(req),
}
