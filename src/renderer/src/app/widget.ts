// Desktop widget data (pure): which of my words the macOS widget shows, and how. Sent to main by app/index.ts.
import * as wordbook from '@/wordbook'
import { sealGlyph } from '@/components/seal/glyphs'
import type { WidgetData, WidgetWord } from '../../../shared/widget'

/** The widget shows the next word every 15 minutes. */
export const WIDGET_ROTATE_MINUTES = 15

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' }

/** Dictionary text can carry markup (<b>word</b>) and entities; the widget shows plain text. */
function plainText(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, e: string) => ENTITIES[e] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface Candidate {
  dictId: number
  term: string
  due: number | null
  usPhonetic: string | null
  ukPhonetic: string | null
  entry: string
}

/**
 * Words for the widget: the ones due today first (seeing a word before its review helps it stick), then the ones
 * due soonest; words without a meaning are skipped. Each carries one example that uses the word, if there is one.
 */
export function buildWidgetData(candidates: readonly Candidate[], now: number, limit = 12): WidgetData {
  const endOfDay = wordbook.nextDayAt(now)
  const usable = candidates
    .map((c) => ({ c, meaning: wordbook.quizMeaning(wordbook.firstMeaning(c.entry)) }))
    .filter((x) => x.meaning)
    .sort((a, b) => (a.c.due ?? Infinity) - (b.c.due ?? Infinity))
  const words: WidgetWord[] = usable.slice(0, limit).map(({ c, meaning }) => {
    const term = c.term.toLowerCase()
    const example =
      wordbook.parseEntry(c.entry)?.examples?.find((x) => plainText(x.en).toLowerCase().includes(term)) ?? null
    return {
      dictId: c.dictId,
      term: c.term,
      phonetic: c.usPhonetic || c.ukPhonetic || '',
      meaning: plainText(meaning),
      example: example ? { en: plainText(example.en), vi: plainText(example.vi) } : null,
      stage: c.due != null && c.due < endOfDay ? 'thirsty' : 'sprout',
      glyph: sealGlyph(c.term) ? [...sealGlyph(c.term)!] : null,
    }
  })
  return {
    version: 1,
    updatedAt: now,
    dueToday: usable.filter((x) => x.c.due != null && x.c.due < endOfDay).length,
    rotateMinutes: WIDGET_ROTATE_MINUTES,
    words,
  }
}
