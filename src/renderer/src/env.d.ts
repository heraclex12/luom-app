/// <reference types="vite/client" />

/** App version (= package.json version), injected at build time. */
declare const __APP_VERSION__: string

// 跨进程契约（src/shared/*）。用 inline import 类型引入为全局别名，避免顶层 import 让本文件退化为模块。
type AppNotification = import('../../shared/app').AppNotification
type AppStatus = import('../../shared/app').AppStatus
type CaptureInfo = import('../../shared/app').CaptureInfo
type NotificationAction = import('../../shared/app').NotificationAction
type Story = import('../../shared/story').Story
type StoryRequest = import('../../shared/story').StoryRequest
type DictionaryLookupResult = import('../../shared/dictionary').DictionaryLookupResult
type EnViEntry = import('../../shared/dictionary').EnViEntry
type EnrichRequest = import('../../shared/enrich').EnrichRequest
type AiConfig = import('../../shared/ai').AiConfig
type AiStatus = import('../../shared/ai').AiStatus
type AiModelOption = import('../../shared/ai').AiModelOption
type BookFormat = import('../../shared/books').BookFormat
type BookPaths = import('../../shared/books').BookPaths
type PickedBookFile = import('../../shared/books').PickedBookFile
type ProxyStmt = import('../../shared/db').ProxyStmt
type ProxyResult = import('../../shared/db').ProxyResult
type SqlMethod = import('../../shared/db').SqlMethod
type SuggestEntry = import('../../shared/suggest').SuggestEntry
type TranslateRequest = import('../../shared/translate').TranslateRequest
type TtsSynthesizeRequest = import('../../shared/tts').TtsSynthesizeRequest
type TtsSynthesizeResult = import('../../shared/tts').TtsSynthesizeResult

// preload 经 contextBridge 暴露到 window 的平台面（与 src/preload/index.ts 对齐）：8 桥 23 方法，保持最小。
interface Window {
  dbAPI: {
    open: (userId: number) => Promise<void>
    close: () => Promise<void>
    exec: (sql: string, params: unknown[], method: SqlMethod) => Promise<ProxyResult>
    batch: (stmts: ProxyStmt[]) => Promise<ProxyResult[]>
  }
  booksAPI: {
    pick: () => Promise<PickedBookFile | null>
    hash: (path: string) => Promise<string>
    import: (srcPath: string, hash: string, format: BookFormat) => Promise<void>
    stat: (hash: string, format: BookFormat) => Promise<boolean>
    statCover: (hash: string) => Promise<boolean>
    read: (hash: string, format: BookFormat) => Promise<ArrayBuffer>
    writeCover: (hash: string, pngBytes: Uint8Array) => Promise<void>
    paths: (hash: string, format: BookFormat) => Promise<BookPaths>
    deleteDir: (hash: string) => Promise<void>
  }
  suggestAPI: {
    query: (q: string) => Promise<SuggestEntry[]>
  }
  translateAPI: {
    sentence: (req: TranslateRequest) => Promise<string>
  }
  ttsAPI: {
    synthesize: (req: TtsSynthesizeRequest) => Promise<TtsSynthesizeResult>
  }
  dictionaryAPI: {
    lookup: (term: string) => Promise<DictionaryLookupResult>
  }
  enrichAPI: {
    run: (req: EnrichRequest) => Promise<EnViEntry>
  }
  aiAPI: {
    status: (cfg: AiConfig) => Promise<AiStatus>
    models: (cfg: AiConfig) => Promise<{ models: AiModelOption[]; error?: string }>
    hasKey: (provider: 'anthropic' | 'openrouter') => Promise<boolean>
    setKey: (provider: 'anthropic' | 'openrouter', key: string) => Promise<void>
    chatGptSignIn: () => Promise<void>
    chatGptSignedIn: () => Promise<boolean>
    chatGptSignOut: () => Promise<void>
    chatGptShow: () => Promise<void>
  }
  appAPI: {
    setStatus: (status: AppStatus) => Promise<void>
    notify: (n: AppNotification) => Promise<void>
    show: (route?: string) => Promise<void>
    getLoginItem: () => Promise<boolean>
    setLoginItem: (open: boolean) => Promise<boolean>
    refreshMenu: () => Promise<void>
    wordsChanged: () => Promise<void>
    onNavigate: (callback: (route: string) => void) => () => void
    onWordsChanged: (callback: () => void) => () => void
    setCaptureShortcut: (accelerator: string) => Promise<boolean>
    hasAccessibility: (prompt: boolean) => Promise<boolean>
    openCapture: (term: string) => Promise<void>
    hideCapture: () => Promise<void>
    onCaptureTerm: (callback: (term: string, info?: CaptureInfo) => void) => () => void
    onNotificationAction: (callback: (action: NotificationAction) => void) => () => void
    generateStory: (req: StoryRequest) => Promise<Story>
  }
}
