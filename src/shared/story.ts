// Story mode contract: Claude writes a short story using the learner's words (main/story.ts).
// The pure helpers below clean / validate Claude's output (main) and the saved story (renderer).
import type { AiConfig } from './ai'

export type StoryLevel = 'A2' | 'B1' | 'B2'

export interface StoryRequest {
  /** Words to weave into the story. */
  words: string[]
  /** CEFR-ish difficulty. */
  level: StoryLevel
  /** Optional theme the learner picked ("travel", "office"…). */
  theme?: string
  /** Model chosen in Settings → AI (main falls back to the default). */
  /** Provider + model to use (Settings → AI). */
  ai?: AiConfig
}

export interface StoryParagraph {
  /** English paragraph; the learner's words wrapped in <b></b>. */
  en: string
  /** Natural Vietnamese translation of the paragraph. */
  vi: string
}

export interface Story {
  title: string
  paragraphs: StoryParagraph[]
  /** Words actually used (subset of the request). */
  usedWords: string[]
}

/**
 * Keep only <b>…</b> (also accepting <strong> and markdown **bold**), drop every other tag, balance the bold
 * tags, remove empty bold pairs and collapse whitespace.
 */
export function cleanStoryHtml(input: string): string {
  const tagged = input
    .replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>')
    .replace(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi, (_m, slash: string, tag: string) =>
      /^(b|strong)$/i.test(tag) ? `<${slash}b>` : '',
    )
  let open = false
  let out = ''
  for (const part of tagged.split(/(<b>|<\/b>)/)) {
    if (part === '<b>') {
      if (!open) out += part
      open = true
    } else if (part === '</b>') {
      if (open) out += part
      open = false
    } else out += part
  }
  if (open) out += '</b>'
  return out
    .replace(/<b>\s*<\/b>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Text without any tags (for speech and titles). */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The alternatives matching a word or phrase plus its common regular inflections (decide→decided, try→tried). */
function wordBody(word: string): string {
  const w = word.toLowerCase()
  const alts = [`${escapeRe(w)}(?:s|es|d|ed|ing|er|est|'s)?`]
  if (/e$/.test(w)) alts.push(`${escapeRe(w.slice(0, -1))}(?:ing|ed|er|est)`)
  if (/[^aeiou]y$/.test(w)) alts.push(`${escapeRe(w.slice(0, -1))}i(?:es|ed|er|est)`)
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) alts.push(`${escapeRe(w)}${w.slice(-1)}(?:ed|ing|er|est)`)
  return alts.map((a) => a.replace(/ /g, '\\s+')).join('|')
}

const wholeWord = (body: string, flags: string): RegExp =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, flags)

/** Regex matching a word or phrase plus its common regular inflections (decide→decided, try→tried, stop→stopped). */
function wordPattern(word: string): RegExp {
  return wholeWord(wordBody(word), 'iu')
}

/**
 * The learner's words wrapped in <b></b>, for stories the AI returned without that markup (the reader highlights
 * <b> and makes it tappable). Text the AI did mark is left as it is.
 */
export function markWords(en: string, words: readonly string[]): string {
  const list = words.map((w) => w.trim()).filter(Boolean)
  if (list.length === 0 || /<b>/i.test(en)) return en
  // Longest first, so a phrase wins over a word inside it.
  const body = [...list].sort((a, b) => b.length - a.length).map(wordBody).join('|')
  return en.replace(wholeWord(body, 'giu'), (m) => `<b>${m}</b>`)
}

/** Requested words that occur in the paragraphs (case-insensitive, inflections allowed), in request order. */
export function findUsedWords(words: readonly string[], paragraphs: readonly string[]): string[] {
  const text = paragraphs.map(plainText).join('\n')
  const seen = new Set<string>()
  const used: string[] = []
  for (const raw of words) {
    const word = raw.trim()
    const key = word.toLowerCase()
    if (!word || seen.has(key)) continue
    seen.add(key)
    if (wordPattern(word).test(text)) used.push(word)
  }
  return used
}

/** Clean Claude's raw story; throws when nothing usable is left. */
export function normalizeStory(
  raw: { title: string; paragraphs: { en: string; vi: string }[] },
  words: readonly string[],
): Story {
  const paragraphs = raw.paragraphs
    .map((p) => ({ en: cleanStoryHtml(p.en ?? ''), vi: plainText(cleanStoryHtml(p.vi ?? '')) }))
    .filter((p) => plainText(p.en) !== '')
  if (paragraphs.length === 0) throw new Error('Claude returned an empty story. Please try again.')
  return {
    title: plainText(cleanStoryHtml(raw.title ?? '')) || 'A short story',
    paragraphs,
    usedWords: findUsedWords(
      words,
      paragraphs.map((p) => p.en),
    ),
  }
}

/** Merge candidate word lists in priority order (trimmed, de-duplicated case-insensitively), capped at `max`. */
export function pickStoryWords(lists: readonly (readonly (string | null | undefined)[])[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const raw of list) {
      const w = raw?.trim()
      if (!w || seen.has(w.toLowerCase())) continue
      seen.add(w.toLowerCase())
      out.push(w)
      if (out.length >= max) return out
    }
  }
  return out
}

/** Read a story saved as JSON (localStorage); null when missing or malformed. */
export function parseSavedStory(raw: string | null): Story | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<Story>
    if (
      typeof v?.title !== 'string' ||
      !Array.isArray(v.paragraphs) ||
      v.paragraphs.length === 0 ||
      !v.paragraphs.every((p) => typeof p?.en === 'string' && typeof p?.vi === 'string') ||
      !Array.isArray(v.usedWords) ||
      !v.usedWords.every((w) => typeof w === 'string')
    )
      return null
    return { title: v.title, paragraphs: v.paragraphs, usedWords: v.usedWords }
  } catch {
    return null
  }
}

/** Most words sent to Claude in one story. */
export const STORY_MAX_WORDS = 12

/** User message for the story request. */
export function storyPrompt(req: Pick<StoryRequest, 'words' | 'level' | 'theme'>): string {
  const words = req.words
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, STORY_MAX_WORDS)
  const lines = [`Level: ${req.level}`, `Words: ${words.join(', ')}`]
  if (req.theme?.trim()) lines.push(`Theme: ${req.theme.trim()}`)
  return lines.join('\n')
}

/** The requested word a highlighted form belongs to (decided → decide); the trimmed form itself when none matches. */
export function requestedWordFor(form: string, words: readonly string[]): string {
  const f = form.trim()
  return findUsedWords(words, [f])[0] ?? f
}
