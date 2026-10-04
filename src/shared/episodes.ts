// Daily Episodes contract + pure rules (renderer: src/renderer/src/episodes, main: src/main/episodes.ts).
// A season is a serialized story of SEASON_LENGTH episodes, one per calendar day from its start. The AI plans the
// season (bible + one-line outline per episode) once, then writes each day's episode with the learner's words,
// recent summaries for continuity, and a cliffhanger. An episode not read on its own day becomes a lost page.
import type { AiConfig } from './ai'
import { cleanStoryHtml, normalizeStory, plainText, type StoryLevel, type StoryParagraph } from './story'

export const SEASON_LENGTH = 14

export const GENRES = [
  { id: 'mystery', label: 'Mystery', blurb: 'Secrets, clues and a reveal at the end' },
  { id: 'romance', label: 'Romance', blurb: 'Two people, many misunderstandings' },
  { id: 'adventure', label: 'Adventure', blurb: 'A journey with something at stake' },
  { id: 'workplace', label: 'Office drama', blurb: 'Deadlines, rivals and a big launch' },
  { id: 'scifi', label: 'Sci-fi', blurb: 'A near future that is a little too close' },
  { id: 'slice', label: 'Slice of life', blurb: 'Small days in a city that feel big' },
] as const

export type Genre = (typeof GENRES)[number]['id']

export interface SeasonBible {
  title: string
  premise: string
  setting: string
  characters: { name: string; role: string }[]
  /** One line per episode (the season's plan). */
  outline: string[]
}

export interface Episode {
  title: string
  paragraphs: StoryParagraph[]
  /** Learner words used in the text. */
  usedWords: string[]
  /** 1–2 sentences of what happened (feeds the next episodes and the "Previously" recap). */
  summary: string
  /** One-line teaser for tomorrow ("Next time…"). Empty for the finale. */
  teaser: string
  /** One comprehension question about this episode (null when the model's question was unusable). */
  question: { text: string; options: string[]; answer: number } | null
}

export interface SeasonRequest {
  genre: Genre
  level: StoryLevel
  ai?: AiConfig
}

export interface EpisodeRequest {
  bible: SeasonBible
  number: number
  level: StoryLevel
  words: string[]
  previous: { number: number; summary: string }[]
  /** Days since the last episode that was written (1 = yesterday). */
  daysSinceLast: number
  ai?: AiConfig
}

// ── calendar days (YYYY-MM-DD, local calendar; computed in UTC so DST never shifts a day) ──

const toUtc = (day: string): number => {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(day: string, n: number): string {
  return new Date(toUtc(day) + n * 86_400_000).toISOString().slice(0, 10)
}

export const dayDiff = (from: string, to: string): number => Math.round((toUtc(to) - toUtc(from)) / 86_400_000)

// ── slots ──

export type SlotState = 'read' | 'today' | 'lost' | 'upcoming'

export interface Slot {
  number: number
  day: string
  state: SlotState
  /** An episode exists for this slot (it was written, read or not). */
  generated: boolean
}

export function episodeSlots(startDay: string, today: string, episodes: readonly { number: number; read: boolean }[]): Slot[] {
  const byNumber = new Map(episodes.map((e) => [e.number, e]))
  return Array.from({ length: SEASON_LENGTH }, (_, i) => {
    const number = i + 1
    const day = addDays(startDay, i)
    const ep = byNumber.get(number)
    const offset = dayDiff(today, day)
    const state: SlotState = ep?.read ? 'read' : offset < 0 ? 'lost' : offset === 0 ? 'today' : 'upcoming'
    return { number, day, state, generated: !!ep }
  })
}

/** Consecutive read episodes ending today (or yesterday while today's is still unread). */
export function storyStreak(slots: readonly Slot[]): number {
  // Count back from the first slot not yet due (today unread or upcoming); a read today is already 'read'.
  const end = slots.findIndex((s) => s.state === 'today' || s.state === 'upcoming')
  let streak = 0
  for (let j = (end === -1 ? slots.length : end) - 1; j >= 0 && slots[j].state === 'read'; j--) streak++
  return streak
}

// ── prompts ──

export function seasonPrompt(genre: Genre, level: StoryLevel): string {
  const g = GENRES.find((x) => x.id === genre)
  return [
    `Genre: ${g?.label ?? genre} (${genre})`,
    `Level: ${level}`,
    `Plan a season of ${SEASON_LENGTH} daily episodes.`,
  ].join('\n')
}

export function episodePrompt(req: Omit<EpisodeRequest, 'ai'>): string {
  const { bible, number } = req
  const finale = number >= SEASON_LENGTH
  const missed = Math.max(0, req.daysSinceLast - 1)
  const lines = [
    `Series: ${bible.title}`,
    `Premise: ${bible.premise}`,
    `Setting: ${bible.setting}`,
    `Characters: ${bible.characters.map((c) => `${c.name} (${c.role})`).join('; ')}`,
    `Season plan: ${bible.outline.map((o, i) => `${i + 1}. ${o}`).join(' | ')}`,
    '',
    `Write Episode ${number} of ${SEASON_LENGTH}. This episode's beat: ${bible.outline[number - 1] ?? 'continue the story'}`,
  ]
  if (req.previous.length)
    lines.push(`Previously: ${req.previous.map((p) => `Ep ${p.number}: ${p.summary}`).join(' ')}`)
  if (missed > 0)
    lines.push(
      `${missed} ${missed === 1 ? 'day' : 'days'} passed since the last episode the reader saw; open with a one-line hint of what happened meanwhile.`,
    )
  lines.push(`Level: ${req.level}`)
  lines.push(`Learner words to use: ${req.words.join(', ') || '(none today)'}`)
  lines.push(
    finale
      ? 'This is the season finale: resolve the main conflict in a satisfying way. Teaser: empty string.'
      : 'End on a cliffhanger that makes the reader want tomorrow’s episode; the teaser hints at it without spoiling.',
  )
  return lines.join('\n')
}

// ── cleaning model output ──

const plain = (s: unknown): string => (typeof s === 'string' ? plainText(cleanStoryHtml(s)) : '')

export function normalizeBible(raw: {
  title: string
  premise: string
  setting: string
  characters: { name: string; role: string }[]
  outline: string[]
}): SeasonBible {
  const outline = (raw.outline ?? []).map(plain).filter(Boolean).slice(0, SEASON_LENGTH)
  while (outline.length < SEASON_LENGTH)
    outline.push(outline.length === SEASON_LENGTH - 1 ? 'Season finale: the truth comes out' : 'The story moves on')
  return {
    title: plain(raw.title) || 'A new season',
    premise: plain(raw.premise),
    setting: plain(raw.setting),
    characters: (raw.characters ?? [])
      .map((c) => ({ name: plain(c?.name), role: plain(c?.role) }))
      .filter((c) => c.name)
      .slice(0, 6),
    outline,
  }
}

export function normalizeEpisode(
  raw: {
    title: string
    paragraphs: { en: string; vi: string }[]
    summary: string
    teaser: string
    question: { text: string; options: string[]; answer: number }
  },
  words: readonly string[],
  number: number,
): Episode {
  const story = normalizeStory(raw, words)
  const q = raw.question
  const options = Array.isArray(q?.options) ? q.options.map(plain).filter(Boolean) : []
  const question =
    q && plain(q.text) && options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < options.length
      ? { text: plain(q.text), options, answer: q.answer }
      : null
  return {
    ...story,
    summary: plain(raw.summary),
    teaser: number >= SEASON_LENGTH ? '' : plain(raw.teaser),
    question,
  }
}
