// Write back: the AI writes a situation for the learner's words and judges the learner's reply (rules and cleaning in
// shared/practice.ts). Through the AI service chosen in Settings → AI (main/ai), the quick model first: the learner
// is waiting at the card.
import { ipcMain } from 'electron'
import { z } from 'zod'
import {
  feedbackPrompt,
  normalizeFeedback,
  normalizeSituation,
  situationPrompt,
  type Feedback,
  type FeedbackLanguage,
  type FeedbackRequest,
  type Situation,
  type SituationRequest,
} from '../shared/practice'
import { generateJson } from './ai'

const SituationSchema = z.object({
  title: z.string().describe('A short heading, e.g. "A text from Linh" or "Finish the sentence"'),
  speaker: z.string().describe('First name of whoever writes the message; "" for finish, fix and translate'),
  setup: z.string().describe('One sentence of background, or ""'),
  prompt: z.string().describe('The message, the sentence to finish or fix, or the Vietnamese sentence to translate'),
  task: z.string().describe('What the learner should do, naming the words, e.g. "Reply using “resilient”."'),
})

const SITUATION_SYSTEM = `You create short, realistic practice situations for a Vietnamese adult learning English. \
The learner answers in English using the given words in the given sense, so make a situation where those words fit \
naturally in the answer. Everyday life, work and study; warm and specific (names, places, small details). The \
message is at most 50 words, at the learner's likely level. Do not use the target words in the message itself, \
except in "fix" where the sentence misuses them. Speak to the learner as "you"; never give them a name. Plain text, \
no markup.`

const LANGUAGE: Record<FeedbackLanguage, string> = {
  en: 'simple English',
  vi: 'Vietnamese (tiếng Việt); quote English words and examples in English',
}

/** The fields the learner reads are written in their feedback language; corrections stay in English. */
const feedbackSchema = (language: FeedbackLanguage) =>
  z.object({
    words: z
      .array(
        z.object({
          term: z.string().describe('The target word'),
          verdict: z.enum(['natural', 'understandable', 'off', 'missing']),
          note: z.string().describe(`One short sentence on how the word was used, in ${LANGUAGE[language]}`),
        }),
      )
      .describe('One entry per target word'),
    summary: z.string().describe(`One warm sentence about the reply, praise first, in ${LANGUAGE[language]}`),
    better: z.string().describe("The learner's whole reply as a native speaker would say it, in English, keeping their idea and the target words"),
    tip: z.string().describe(`One useful collocation or pattern: an English example and a short explanation in ${LANGUAGE[language]}; or ""`),
    followUp: z
      .string()
      .describe('The other person’s next short message in English, without using any target word; or "" to end'),
  })

const FEEDBACK_SYSTEM = `You are a warm, precise English coach for a Vietnamese adult. Judge how the learner used \
each target word in their latest reply:
- natural: right meaning, and a native speaker would say it this way;
- understandable: right meaning, but clumsy (wrong form, collocation or register);
- off: wrong meaning, or so unnatural it confuses;
- missing: the word is not in the reply.
Be encouraging and specific: praise what works, then fix one thing at a time. "better" keeps the learner's own \
idea and words where they work; fix other grammar there too. Never invent errors in a reply that is already natural.
A follow-up message never contains the target words: the learner should produce them.`

const feedbackSystem = (language: FeedbackLanguage): string =>
  `${FEEDBACK_SYSTEM}\nWrite every note, the summary and the tip's explanation in ${LANGUAGE[language]}.`

export async function writeSituation(req: SituationRequest): Promise<Situation> {
  const raw = await generateJson(req.ai ?? { provider: 'luom' }, {
    system: SITUATION_SYSTEM,
    user: situationPrompt(req),
    schema: SituationSchema,
    what: 'a situation',
    fast: true,
  })
  return normalizeSituation(raw, req.kind, req.words.map((w) => w.term))
}

export async function checkReply(req: FeedbackRequest): Promise<Feedback> {
  const reply = [...req.turns].reverse().find((t) => t.role === 'you')?.text ?? ''
  const raw = await generateJson(req.ai ?? { provider: 'luom' }, {
    system: feedbackSystem(req.language),
    user: feedbackPrompt(req),
    schema: feedbackSchema(req.language),
    what: 'feedback',
    fast: true,
  })
  return normalizeFeedback(raw, req.situation, reply, req.turns.filter((t) => t.role === 'you').length - 1)
}

export function registerPracticeIpc(): void {
  ipcMain.handle('practice:situation', (_e, req: SituationRequest) => writeSituation(req))
  ipcMain.handle('practice:feedback', (_e, req: FeedbackRequest) => checkReply(req))
}
