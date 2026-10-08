// Desktop widget contract (macOS WidgetKit extension in native/widget/). The renderer builds WidgetData, main writes
// it to <userData>/widget.json, and the sandboxed widget reads that file through a read-only sandbox exception
// (native/widget/LuomWidget.entitlements). Answers given on the widget (Got it / Again) come back as small files in
// <userData>/widget-inbox/, the one folder the widget may write; the app turns them into reviews. Tapping a word
// opens a luom:// link (routeForWidgetUrl).

export const WIDGET_FILE = 'widget.json'
export const WIDGET_INBOX = 'widget-inbox'

/** One answer from the widget: Got it = good, Again = again (the word comes back soon). */
export interface WidgetRating {
  dictId: number
  action: 'good' | 'again'
  /** When it was answered (ms). */
  at: number
}

/** An inbox file's content → the answer, or null when it isn't one. */
export function parseWidgetRating(text: string): WidgetRating | null {
  let v: unknown
  try {
    v = JSON.parse(text)
  } catch {
    return null
  }
  const r = v as Partial<WidgetRating> | null
  if (!r || !Number.isInteger(r.dictId) || (r.action !== 'good' && r.action !== 'again')) return null
  if (typeof r.at !== 'number' || !Number.isFinite(r.at)) return null
  return { dictId: r.dictId as number, action: r.action, at: r.at }
}
export const WIDGET_URL_SCHEME = 'luom'

export interface WidgetWord {
  dictId: number
  term: string
  /** IPA without slashes ('' when unknown). */
  phonetic: string
  /** Short Vietnamese meaning. */
  meaning: string
  /** One example sentence that uses the word, or null. */
  example: { en: string; vi: string } | null
  /** Seal stage: thirsty = due today, sprout = being learned. */
  stage: 'thirsty' | 'sprout'
  /** Carved 5×5 seal glyph of the first letter (rows of '#' / '.'), or null to print the letter. */
  glyph: string[] | null
}

export interface WidgetData {
  version: 1
  updatedAt: number
  /** Words due for review today (among the words the widget knows). */
  dueToday: number
  /** The widget shows the next word every this many minutes. */
  rotateMinutes: number
  words: WidgetWord[]
}

const MAX_WORDS = 24
const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')

/** Main writes what the renderer sends: keep only well-formed, bounded data (null = not widget data). */
export function sanitizeWidgetData(v: unknown): WidgetData | null {
  if (!v || typeof v !== 'object') return null
  const d = v as Partial<WidgetData>
  if (d.version !== 1 || !Array.isArray(d.words)) return null
  const words: WidgetWord[] = []
  for (const w of d.words as Partial<WidgetWord>[]) {
    if (words.length >= MAX_WORDS) break
    if (!w || typeof w !== 'object' || !Number.isInteger(w.dictId) || typeof w.term !== 'string' || !w.term) continue
    const ex = w.example
    const glyph =
      Array.isArray(w.glyph) && w.glyph.length === 5 && w.glyph.every((r) => typeof r === 'string' && /^[#.]{5}$/.test(r))
        ? [...w.glyph]
        : null
    words.push({
      dictId: w.dictId as number,
      term: clip(w.term, 80),
      phonetic: clip(w.phonetic, 60),
      meaning: clip(w.meaning, 200),
      example: ex && typeof ex === 'object' && typeof ex.en === 'string' ? { en: clip(ex.en, 240), vi: clip(ex.vi, 240) } : null,
      stage: w.stage === 'thirsty' ? 'thirsty' : 'sprout',
      glyph,
    })
  }
  const num = (x: unknown, def: number): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : def)
  return {
    version: 1,
    updatedAt: num(d.updatedAt, 0),
    dueToday: Math.round(num(d.dueToday, 0)),
    rotateMinutes: Math.min(Math.max(Math.round(num(d.rotateMinutes, 15)), 5), 240),
    words,
  }
}

/** luom://word/<dictId> → that word; luom://study → study; anything else → My words. */
export function routeForWidgetUrl(url: string): string {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return '/wordbook'
  }
  if (u.protocol !== `${WIDGET_URL_SCHEME}:`) return '/wordbook'
  const parts = [u.hostname, ...u.pathname.split('/')].filter(Boolean)
  if (parts[0] === 'study') return '/wordbook/study'
  if (parts[0] === 'word' && /^\d+$/.test(parts[1] ?? '')) return `/wordbook/words?seg=all&dictId=${parts[1]}`
  return '/wordbook'
}
