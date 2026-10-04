// Story mode: ask the AI provider for a short story that uses the learner's words, with a Vietnamese translation per
// paragraph. Provider chosen in Settings → AI (see main/ai).
import { ipcMain } from 'electron'
import { z } from 'zod'
import { normalizeStory, storyPrompt, type Story, type StoryRequest } from '../shared/story'
import { generateJson } from './ai'

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

/** Ask the configured AI provider for a story. Throws with a user-readable message on failure. */
export async function generateStory(req: StoryRequest): Promise<Story> {
  const words = req.words.map((w) => w.trim()).filter(Boolean)
  if (words.length === 0) throw new Error('Pick at least one word for your story.')
  const out = await generateJson(req.ai ?? { provider: 'anthropic' }, {
    system: SYSTEM,
    user: storyPrompt({ ...req, words }),
    schema: StorySchema,
    what: 'a story',
  })
  return normalizeStory(out, words)
}

export function registerStoryIpc(): void {
  ipcMain.handle('story:generate', (_e, req: StoryRequest) => generateStory(req))
}
