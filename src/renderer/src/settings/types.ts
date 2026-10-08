// 用户设置装配后的读出视图：跨域用户偏好（sync.md §2 / docs/db/01-user.md）。本地表是键级 KV（每项一个键），
// 本接口是 getSettings 按键注册表装配后的结果。命名一律 camelCase；键与默认值见 settings/defaults.ts 注册表。
// 现有学习偏好七项 + 阅读两项，后续新增阅读 / TTS 偏好同样走这里（reading.*/tts.* 键，同一集合）。

import type { AiProvider, LuomModel } from '../../../shared/ai'

// ────────────────── 设置（user_setting，键级 KV） ──────────────────

/** Word flash intervals offered in Settings (minutes; 0 = off). */
export const FLASH_EVERY_MINUTES = [0, 10, 15, 20, 30, 60, 120, 180, 240] as const
export type FlashEveryMinutes = (typeof FLASH_EVERY_MINUTES)[number]
/** Words per pop quiz offered in Settings. */
export const FLASH_WORD_COUNTS = [1, 2, 3, 5] as const
export type FlashWordCount = (typeof FLASH_WORD_COUNTS)[number]

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
  /** Word flashes: bring back my words every N minutes during the day (0 = off). */
  flashEveryMinutes: FlashEveryMinutes
  /** Words in one pop quiz (asked one after another); a notification always shows one. */
  flashWordCount: FlashWordCount
  /** Active hours for word flashes: from this hour (0–23) until this hour; an end before the start runs past
   *  midnight, equal = all day. */
  activeFrom: number
  activeUntil: number
  /** After a pop quiz round: offer to use the words in a sentence (Write back), go straight on, or never. */
  afterPopQuiz: 'ask' | 'always' | 'never'
  /** Language of Write back feedback explanations (corrections stay in English). */
  feedbackLanguage: 'en' | 'vi'
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
  /** Which AI service writes entries and stories: Lượm (Free), ChatGPT (your account) or a Custom API. */
  aiProvider: AiProvider
  /** Lượm (Free) model choice (Auto = the free models router). */
  luomModel: LuomModel
  /** Custom API base URL (OpenAI-compatible), e.g. https://api.openai.com/v1; '' = not set. */
  customBaseUrl: string
  /** Custom API model id; '' = not chosen. */
  customModel: string
}
