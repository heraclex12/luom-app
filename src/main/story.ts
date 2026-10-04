// Story mode: ask Claude for a short story that uses the learner's words, with a Vietnamese translation per
// paragraph. Same pattern as enrich.ts (official SDK, structured output via zod); the key comes from enrich.ts.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { ipcMain } from 'electron'
import { z } from 'zod'
import { AI_MODELS, DEFAULT_AI_MODEL, type AiModel } from '../shared/enrich'
import { normalizeStory, storyPrompt, type Story, type StoryRequest } from '../shared/story'
import { readKey } from './enrich'

const StorySchema = z.object({
  title: z.string().describe('Short, catchy English title (plain text, no tags)'),
  paragraphs: z
    .array(
      z.object({
        en: z
          .string()
          .describe('English paragraph; wrap every occurrence of a learner word (in whatever form used) in <b></b>'),
        vi: z.string().describe('Natural Vietnamese translation of this paragraph (plain text, no tags)'),
      }),
    )
    .describe('3-5 paragraphs'),
})

const SYSTEM = `You write short stories for a Vietnamese adult learning English vocabulary. Given a list of the \
learner's words, a CEFR level and maybe a theme, write ONE short story:
- 120-220 words in total, 3-5 paragraphs, with a short title.
- Natural, vivid and coherent: a real little story with a beginning, a turn and an ending, not a list of sentences.
- Grammar and the other vocabulary must match the level (A2: simple sentences, everyday words; B1: some linking \
words and past tenses; B2: richer but still clear language).
- Use as many of the learner's words as fit naturally, each in the sense a learner most likely studied; you may \
inflect them (decide → decided). Skip a word rather than force it.
- In the English text wrap every occurrence of a learner word, in the form used, in <b></b>. No other markup.
- Each paragraph gets a Vietnamese translation that reads like a good native translation, not word by word.`

/** Ask Claude for a story. Throws with a user-readable message on failure. */
export async function generateStory(req: StoryRequest): Promise<Story> {
  const words = req.words.map((w) => w.trim()).filter(Boolean)
  if (words.length === 0) throw new Error('Pick at least one word for your story.')
  const apiKey = readKey()
  if (!apiKey) throw new Error('Add your Anthropic API key in Settings → AI first.')
  const model: AiModel = AI_MODELS.some((m) => m.id === req.model) ? req.model! : DEFAULT_AI_MODEL
  const client = new Anthropic({ apiKey })
  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: 'user', content: storyPrompt({ ...req, words }) }],
      // A short creative piece: low effort is plenty (Haiku 4.5 does not accept effort at all).
      output_config:
        model === 'claude-haiku-4-5'
          ? { format: betaZodOutputFormat(StorySchema) }
          : { format: betaZodOutputFormat(StorySchema), effort: 'low' },
      // Opus: if a request is declined by a safety classifier, the server retries on a fallback model.
      ...(model === 'claude-opus-5'
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
        : {}),
    })
    if (response.stop_reason === 'refusal') throw new Error('Claude declined to write a story with these words.')
    const out = response.parsed_output
    if (!out) throw new Error('Claude returned an unexpected answer. Please try again.')
    return normalizeStory(out, words)
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Your Anthropic API key was rejected. Check it in Settings → AI.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited by the Anthropic API. Try again in a moment.')
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Could not reach the Anthropic API. Are you online?')
    if (e instanceof Anthropic.APIError) throw new Error(`Anthropic API error ${e.status ?? ''}: ${e.message}`)
    throw e
  }
}

export function registerStoryIpc(): void {
  ipcMain.handle('story:generate', (_e, req: StoryRequest) => generateStory(req))
}
