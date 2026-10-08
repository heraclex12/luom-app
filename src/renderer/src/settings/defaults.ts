// 用户设置键注册表：客户端唯一常量源（single source of truth）。每个 Settings 属性 → 其 wire 键、默认值、校验器。
// 键为 <域>.<驼峰名>，是 wire 契约：上线后改名 = 数据迁移，故一次定死；value 为 JSON 编码标量文本。
// 读路径（settings/settings.ts）按本表装配：缺键补默认、坏值回退默认；加设置项 = 在此注册一个键，服务端零改动。
import { FLASH_EVERY_MINUTES, FLASH_WORD_COUNTS, type Settings } from './types'
import { isLuomModel, luomModelForId } from '../../../shared/ai'

/** 单个设置项：wire 键 + 默认值 + 校验器（JSON.parse 后判类型/枚举/值域）。 */
export interface SettingSpec {
  /** wire 自然键 <域>.<驼峰名>。 */
  key: string
  /** 缺行或坏值时回退的默认值。 */
  default: unknown
  /** JSON.parse 后的值是否合法；不合法 → 读路径回退默认 + 大声提示。 */
  validate: (v: unknown) => boolean
  /** A renamed setting: while this key has no row, read the old key's value through `map` (undefined = default). */
  legacy?: { key: string; map: (v: unknown) => unknown }
}

/** 保住定义处的逐键类型检查（default 与 validate 都收敛到 T），对外擦除为松类型 SettingSpec。 */
function spec<T>(key: string, def: T, validate: (v: unknown) => v is T, legacy?: SettingSpec['legacy']): SettingSpec {
  return { key, default: def, validate, legacy }
}

/** Free text such as an address or a model id ('' = not set). */
const isShortText = (v: unknown): v is string => typeof v === 'string' && v.length <= 500

const isNonNegInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

/** 正文字号值域：UI 首版只给四挡（14/16/20/24），校验按整数 14–28 收口，将来换连续控件免数据迁移。 */
const READING_FONT_SIZE = { min: 14, max: 28 }

export const SETTINGS_REGISTRY: Record<keyof Settings, SettingSpec> = {
  newPerDay: spec<Settings['newPerDay']>('wordbook.newPerDay', 20, isNonNegInt),
  reviewsPerDay: spec<Settings['reviewsPerDay']>('wordbook.reviewsPerDay', 50, isNonNegInt),
  newReviewMix: spec<Settings['newReviewMix']>(
    'wordbook.newReviewMix',
    'mix',
    (v): v is Settings['newReviewMix'] => v === 'mix' || v === 'newFirst' || v === 'reviewFirst',
  ),
  newCardOrder: spec<Settings['newCardOrder']>(
    'wordbook.newCardOrder',
    'random',
    (v): v is Settings['newCardOrder'] => v === 'random' || v === 'joinTime',
  ),
  meaningSource: spec<Settings['meaningSource']>(
    'wordcard.meaningSource',
    'concise',
    (v): v is Settings['meaningSource'] => v === 'concise' || v === 'collins',
  ),
  accent: spec<Settings['accent']>(
    'wordcard.accent',
    'us',
    (v): v is Settings['accent'] => v === 'us' || v === 'uk',
  ),
  autoPlayAudio: spec<Settings['autoPlayAudio']>(
    'wordbook.autoPlayAudio',
    1,
    (v): v is Settings['autoPlayAudio'] => v === 0 || v === 1,
  ),
  readingFontSize: spec<Settings['readingFontSize']>(
    'reading.fontSize',
    16,
    (v): v is Settings['readingFontSize'] =>
      typeof v === 'number' &&
      Number.isInteger(v) &&
      v >= READING_FONT_SIZE.min &&
      v <= READING_FONT_SIZE.max,
  ),
  readingFontFamily: spec<Settings['readingFontFamily']>(
    'reading.fontFamily',
    'serif',
    (v): v is Settings['readingFontFamily'] => v === 'serif' || v === 'sans',
  ),
  reminderEnabled: spec<Settings['reminderEnabled']>(
    'app.reminderEnabled',
    1,
    (v): v is Settings['reminderEnabled'] => v === 0 || v === 1,
  ),
  reminderTime: spec<Settings['reminderTime']>(
    'app.reminderTime',
    '08:30',
    (v): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
  ),
  flashEveryMinutes: spec<Settings['flashEveryMinutes']>(
    'app.flashEveryMinutes',
    120,
    (v): v is Settings['flashEveryMinutes'] => (FLASH_EVERY_MINUTES as readonly unknown[]).includes(v),
    // Before minutes there was an hourly choice (0–4 h): carry it over, so Off stays off.
    {
      key: 'app.flashIntervalHours',
      map: (v) => (typeof v === 'number' && [0, 1, 2, 3, 4].includes(v) ? v * 60 : undefined),
    },
  ),
  flashWordCount: spec<Settings['flashWordCount']>(
    'app.flashWordCount',
    1,
    (v): v is Settings['flashWordCount'] => (FLASH_WORD_COUNTS as readonly unknown[]).includes(v),
  ),
  flashStyle: spec<Settings['flashStyle']>(
    'app.flashStyle',
    'quiz',
    (v): v is Settings['flashStyle'] => v === 'quiz' || v === 'notification',
  ),
  captureShortcut: spec<Settings['captureShortcut']>(
    'app.captureShortcut',
    'Alt+Command+E',
    (v): v is string => typeof v === 'string' && v.length <= 60,
  ),
  learningMode: spec<Settings['learningMode']>(
    'app.learningMode',
    'standard',
    (v): v is Settings['learningMode'] => ['glance', 'quick', 'standard', 'focus', 'play'].includes(v as string),
  ),
  onboarded: spec<Settings['onboarded']>('app.onboarded', 0, (v): v is Settings['onboarded'] => v === 0 || v === 1),
  dailyGoal: spec<Settings['dailyGoal']>(
    'app.dailyGoal',
    30,
    (v): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 500,
  ),
  reminderIntensity: spec<Settings['reminderIntensity']>(
    'app.reminderIntensity',
    'regular',
    (v): v is Settings['reminderIntensity'] => v === 'gentle' || v === 'regular' || v === 'persistent',
  ),
  captureCollectionId: spec<Settings['captureCollectionId']>('app.captureCollectionId', 0, isNonNegInt),
  // Renamed from app.aiProvider when OpenRouter became Lượm (Free) and Claude became the Custom API.
  aiProvider: spec<Settings['aiProvider']>(
    'app.aiService',
    'luom',
    (v): v is Settings['aiProvider'] => v === 'luom' || v === 'chatgpt-web' || v === 'custom',
    { key: 'app.aiProvider', map: (v) => ({ openrouter: 'luom', anthropic: 'custom', 'chatgpt-web': 'chatgpt-web' })[String(v)] },
  ),
  luomModel: spec<Settings['luomModel']>('app.luomModel', 'auto', isLuomModel, {
    key: 'app.openrouterModel',
    map: luomModelForId,
  }),
  customBaseUrl: spec<Settings['customBaseUrl']>('app.customBaseUrl', '', isShortText, {
    key: 'app.aiProvider',
    map: (v) => (v === 'anthropic' ? 'https://api.anthropic.com/v1' : undefined),
  }),
  customModel: spec<Settings['customModel']>('app.customModel', '', isShortText, { key: 'app.aiModel', map: (v) => v }),
}

/** 全默认视图（由注册表派生，缺行时的回退整体）。 */
export const DEFAULT_SETTINGS: Settings = Object.fromEntries(
  Object.entries(SETTINGS_REGISTRY).map(([prop, s]) => [prop, s.default]),
) as unknown as Settings
