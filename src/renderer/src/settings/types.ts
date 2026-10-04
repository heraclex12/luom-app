// 用户设置装配后的读出视图：跨域用户偏好（sync.md §2 / docs/db/01-user.md）。本地表是键级 KV（每项一个键），
// 本接口是 getSettings 按键注册表装配后的结果。命名一律 camelCase；键与默认值见 settings/defaults.ts 注册表。
// 现有学习偏好七项 + 阅读两项，后续新增阅读 / TTS 偏好同样走这里（reading.*/tts.* 键，同一集合）。

// ────────────────── 设置（user_setting，键级 KV） ──────────────────

export interface Settings {
  newPerDay: number
  reviewsPerDay: number
  newReviewMix: 'mix' | 'newFirst' | 'reviewFirst'
  newCardOrder: 'random' | 'joinTime'
  meaningSource: 'concise' | 'collins'
  accent: 'us' | 'uk'
  autoPlayAudio: 0 | 1
  /** 正文字号 px（首版 UI 只给四挡，值域 14–28 是为将来换控件留的余量）。 */
  readingFontSize: number
  readingFontFamily: 'serif' | 'sans'
  /** Daily study reminder on/off (1/0) and its local time "HH:MM". */
  reminderEnabled: 0 | 1
  reminderTime: string
  /** Word flash notifications: show one of my words every N hours during the day (0 = off). */
  flashIntervalHours: 0 | 1 | 2 | 3 | 4
  /** How a word flash appears: a pop quiz card to answer (active recall) or a plain notification. */
  flashStyle: 'quiz' | 'notification'
  /** Global quick-capture hotkey (Electron accelerator; empty = disabled). */
  captureShortcut: string
  /** Learning mode preset (how reminders push and how cards are practised). */
  learningMode: 'glance' | 'quick' | 'standard' | 'focus' | 'play'
  /** First-run setup finished (1) or not (0). */
  onboarded: 0 | 1
  /** Cards to practise per day (goal / quests / streak). */
  dailyGoal: number
  /** Follow-up reminders: gentle = daily only, regular = + evening nudge, persistent = every 2h until the goal is met. */
  reminderIntensity: 'gentle' | 'regular' | 'persistent'
  /** Collection the capture popup files new words into (0 = none). */
  captureCollectionId: number
  /** Which AI service writes entries and stories: ChatGPT (your account), OpenRouter (free models) or Claude. */
  aiProvider: 'chatgpt-web' | 'openrouter' | 'anthropic'
  /** OpenRouter model id. */
  openrouterModel: string
  /** Claude model used for "Improve with AI". */
  aiModel: 'claude-opus-5' | 'claude-sonnet-5' | 'claude-haiku-4-5'
}
