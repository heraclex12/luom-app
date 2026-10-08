// Write back: use your words in context and get feedback on how natural it sounds. The AI writes a situation (a
// friend's text, an email, a sentence to finish or fix, a Vietnamese line to translate); the learner replies; the AI
// judges each word. Pure rules here; the AI calls are in main/practice.ts, storage and ratings in renderer/practice.
import { findUsedWords, plainText } from './story'
import type { AiConfig } from './ai'

export type FeedbackLanguage = 'en' | 'vi'

/** chat / scene go back and forth; the others are one round. */
export type SituationKind = 'chat' | 'email' | 'scene' | 'finish' | 'fix' | 'translate'

export const CONVERSATION_KINDS: ReadonlySet<SituationKind> = new Set(['chat', 'scene'])

/** Replies in one conversation, at most. */
export const MAX_TURNS = 3

export interface PracticeWord {
  dictId: number
  term: string
  /** Vietnamese meaning (the sense to practise). */
  meaning: string
  /** Learning state: 0 new, 1 learning, 2 review, 3 relearning, 4 mastered. */
  state: number
  /** First dictionary example, when there is one. */
  example?: { en: string; vi: string }
}

export interface Situation {
  kind: SituationKind
  /** Heading ("A text from Linh", "Finish the sentence"). */
  title: string
  /** Who writes the message (chat, email, scene); '' for exercises. */
  speaker: string
  /** One or two sentences of background; may be ''. */
  setup: string
  /** The message, the sentence to finish or fix, or the Vietnamese line to translate. */
  prompt: string
  /** What to do ("Reply using “resilient”."). */
  task: string
  /** The terms to use. */
  words: string[]
}

/** natural: a native speaker would say it so; understandable: right meaning, clumsy; off: wrong meaning or very
 *  unnatural; missing: not used. */
export type Verdict = 'natural' | 'understandable' | 'off' | 'missing'

export interface WordFeedback {
  term: string
  verdict: Verdict
  note: string
}

export interface Feedback {
  words: WordFeedback[]
  /** One encouraging sentence about the reply. */
  summary: string
  /** The reply as a native speaker would put it. */
  better: string
  /** One useful pattern or collocation; may be ''. */
  tip: string
  /** The other person's next message, or null when this was the last turn. */
  followUp: string | null
}

export interface Turn {
  /** them = the situation's speaker (or the exercise); you = the learner. */
  role: 'them' | 'you'
  text: string
}

export interface SituationRequest {
  kind: SituationKind
  words: { term: string; meaning: string }[]
  ai?: AiConfig
}

export interface FeedbackRequest {
  situation: Situation
  /** The conversation so far, ending with the learner's reply to check. */
  turns: Turn[]
  /** Words not yet used well in earlier turns (the follow-up should invite them). */
  remaining: string[]
  language: FeedbackLanguage
  ai?: AiConfig
}

const WEIGHTS: Record<'guided' | 'open', [SituationKind, number][]> = {
  // Some word is new or shaky: give it a frame to lean on.
  guided: [
    ['finish', 3],
    ['translate', 2],
    ['chat', 2],
  ],
  // All known: open situations.
  open: [
    ['chat', 3],
    ['email', 2],
    ['fix', 2],
    ['scene', 2],
    ['translate', 1],
  ],
}

/** The kind of situation for these words, at random but weighted by how well they are known. */
export function pickKind(words: readonly PracticeWord[], random: () => number = Math.random): SituationKind {
  const guided = words.some((w) => w.state === 0 || w.state === 1 || w.state === 3)
  const table = WEIGHTS[guided ? 'guided' : 'open']
  const total = table.reduce((n, [, w]) => n + w, 0)
  let x = random() * total
  for (const [kind, w] of table) {
    x -= w
    if (x < 0) return kind
  }
  return table[table.length - 1]![0]
}

const quoted = (terms: readonly string[]): string => {
  const q = terms.map((t) => `“${t}”`)
  return q.length <= 1 ? (q[0] ?? '') : `${q.slice(0, -1).join(', ')} and ${q[q.length - 1]}`
}

const TITLES: Record<SituationKind, string> = {
  chat: 'A message for you',
  email: 'An email for you',
  scene: 'Your turn in the story',
  finish: 'Finish the sentence',
  fix: 'Fix the sentence',
  translate: 'Say it in English',
}

function defaultTask(kind: SituationKind, terms: readonly string[]): string {
  const w = quoted(terms)
  switch (kind) {
    case 'finish':
      return `Finish it using ${w}.`
    case 'fix':
      return `Rewrite it so ${w} ${terms.length > 1 ? 'sound' : 'sounds'} natural.`
    case 'translate':
      return `Write this in English using ${w}.`
    default:
      return `Reply using ${w}.`
  }
}

/** A situation made without the AI: one word with a Vietnamese example to translate. */
export function localSituation(kind: SituationKind, words: readonly PracticeWord[]): Situation | null {
  const w = words[0]
  if (kind !== 'translate' || words.length !== 1 || !w?.example?.vi.trim()) return null
  return {
    kind,
    title: TITLES.translate,
    speaker: '',
    setup: '',
    prompt: w.example.vi.trim(),
    task: defaultTask(kind, [w.term]),
    words: [w.term],
  }
}

const clean = (v: unknown): string => (typeof v === 'string' ? plainText(v.replace(/\\n/g, ' ')) : '')

/** Like clean, but a message keeps its line breaks (some models write them as a literal \n). */
const cleanMessage = (v: unknown): string =>
  typeof v === 'string'
    ? v
        .replace(/\\n/g, '\n')
        .replace(/<[^>]*>/g, '')
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : ''

/** The AI's situation, cleaned; the words to use are always the round's own. Throws when there is nothing to answer. */
export function normalizeSituation(raw: Record<string, unknown>, kind: SituationKind, terms: readonly string[]): Situation {
  const prompt = cleanMessage(raw.prompt)
  if (!prompt) throw new Error('The AI wrote an empty situation. Please try again.')
  return {
    kind,
    title: clean(raw.title) || TITLES[kind],
    speaker: CONVERSATION_KINDS.has(kind) || kind === 'email' ? clean(raw.speaker) : '',
    setup: clean(raw.setup),
    prompt,
    task: clean(raw.task) || defaultTask(kind, terms),
    words: [...terms],
  }
}

const VERDICTS: readonly Verdict[] = ['natural', 'understandable', 'off', 'missing']

/** The AI's feedback checked against the reply: a word not in it is missing (the AI can be wrong about that), words
 *  the AI invented are dropped, and only conversations get a follow-up, up to MAX_TURNS replies. */
export function normalizeFeedback(
  raw: Record<string, unknown>,
  situation: Situation,
  reply: string,
  turnIndex: number,
): Feedback {
  const given = Array.isArray(raw.words) ? (raw.words as Record<string, unknown>[]) : []
  const used = new Set(findUsedWords(situation.words, [reply]).map((t) => t.toLowerCase()))
  const words = situation.words.map((term): WordFeedback => {
    if (!used.has(term.toLowerCase())) return { term, verdict: 'missing', note: `You didn’t use “${term}” this time.` }
    const f = given.find((g) => typeof g?.term === 'string' && g.term.trim().toLowerCase() === term.toLowerCase())
    const v = f?.verdict as Verdict
    const verdict = VERDICTS.includes(v) && v !== 'missing' ? v : 'understandable'
    return { term, verdict, note: clean(f?.note) }
  })
  const followUp = cleanMessage(raw.followUp)
  return {
    words,
    summary: clean(raw.summary),
    better: clean(raw.better),
    tip: clean(raw.tip),
    followUp: CONVERSATION_KINDS.has(situation.kind) && turnIndex + 1 < MAX_TURNS && followUp ? followUp : null,
  }
}

/** The review a verdict counts as; a word not used does not count. */
export function ratingFor(verdict: Verdict): 'good' | 'hard' | 'again' | null {
  return verdict === 'natural' ? 'good' : verdict === 'understandable' ? 'hard' : verdict === 'off' ? 'again' : null
}

/** Per word, the verdict that counts for a whole conversation: the first real attempt (later turns are practice). */
export function sessionVerdicts(terms: readonly string[], turns: readonly (readonly WordFeedback[])[]): Record<string, Verdict> {
  const out: Record<string, Verdict> = {}
  for (const term of terms) {
    const first = turns.map((t) => t.find((f) => f.term === term)?.verdict).find((v) => v && v !== 'missing')
    out[term] = first ?? 'missing'
  }
  return out
}

/** Words not yet used well (natural or understandable) in any turn so far. */
export function remainingWords(terms: readonly string[], turns: readonly (readonly WordFeedback[])[]): string[] {
  return terms.filter((t) => !turns.some((fs) => fs.some((f) => f.term === t && (f.verdict === 'natural' || f.verdict === 'understandable'))))
}

// ── prompts (main/practice.ts sends them) ──

const KIND_BRIEF: Record<SituationKind, string> = {
  chat: 'chat: a short text message from a friend or colleague (speaker = their first name) that invites a reply in which the words fit naturally.',
  email: 'email: a short everyday or work email, 2-3 sentences (speaker = the sender’s first name), that the learner replies to.',
  scene: 'scene: a moment in a little story where a character (speaker = their name) speaks to the learner and waits for an answer.',
  finish: 'finish: the beginning of one sentence, ending with "…", that the learner completes with the words.',
  fix: 'fix: one sentence where each word is used wrongly or unnaturally (wrong sense, collocation or form), for the learner to rewrite.',
  translate: 'translate: one natural Vietnamese sentence (in prompt) whose English needs the words.',
}

export function situationPrompt(req: SituationRequest): string {
  const words = req.words.map((w) => `- ${w.term} (${w.meaning})`).join('\n')
  return `Kind: ${KIND_BRIEF[req.kind]}\nWords (with the Vietnamese sense to practise):\n${words}`
}

export function feedbackPrompt(req: FeedbackRequest): string {
  const s = req.situation
  const history = req.turns.map((t) => `${t.role === 'you' ? 'Learner' : s.speaker || 'Exercise'}: ${t.text}`).join('\n')
  const lang = req.language === 'vi' ? 'Vietnamese (keep English words and examples in English)' : 'simple English'
  const more = CONVERSATION_KINDS.has(s.kind) && req.remaining.length
    ? `If the conversation can naturally go on, followUp is ${s.speaker || 'the other person'}’s next short message, inviting a reply that could use: ${req.remaining.join(', ')}. Otherwise "".`
    : 'followUp: "".'
  return [
    `Situation (${s.kind}): ${s.title}`,
    s.setup ? `Background: ${s.setup}` : '',
    `Task: ${s.task}`,
    `Target words: ${s.words.join(', ')}`,
    '',
    s.kind === 'chat' || s.kind === 'scene' || s.kind === 'email' ? 'Conversation:' : 'Exercise and answer:',
    `${s.speaker || 'Exercise'}: ${s.prompt}`,
    history,
    '',
    `Write notes, summary and the tip's explanation in ${lang}. ${more}`,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}
