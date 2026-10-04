// Daily Episodes: plan a season (bible + outline) and write one episode a day with the learner's words, through the
// AI provider chosen in Settings → AI (main/ai). Pure rules and cleaning live in shared/episodes.ts.
import { ipcMain } from 'electron'
import { z } from 'zod'
import {
  episodePrompt,
  normalizeBible,
  normalizeEpisode,
  SEASON_LENGTH,
  seasonPrompt,
  type Episode,
  type EpisodeRequest,
  type SeasonBible,
  type SeasonRequest,
} from '../shared/episodes'
import { generateJson } from './ai'

const BibleSchema = z.object({
  title: z.string().describe('Catchy series title in English, max 6 words'),
  premise: z.string().describe('2 sentences: the hook of the whole season'),
  setting: z.string().describe('Where and when, one sentence'),
  characters: z
    .array(z.object({ name: z.string(), role: z.string().describe('a few words') }))
    .describe('3-5 main characters; Vietnamese or international names'),
  outline: z.array(z.string().describe('one sentence')).describe(`exactly ${SEASON_LENGTH} beats, one per episode`),
})

const SEASON_SYSTEM = `You are the head writer of a short daily English-learning series for Vietnamese adults. Plan \
one season of ${SEASON_LENGTH} short daily episodes in the requested genre and CEFR level. Give it a strong hook, \
3-5 memorable characters and a clear arc: rising stakes, a twist around episode ${Math.round(SEASON_LENGTH * 0.6)}, \
and a satisfying finale in episode ${SEASON_LENGTH}. Most beats should end in a way that makes people want the next \
day. Keep it warm and suitable for adults at work; no graphic violence.`

const EpisodeSchema = z.object({
  title: z.string().describe('Episode title, plain text, max 7 words'),
  paragraphs: z
    .array(
      z.object({
        en: z.string().describe('English paragraph; wrap every learner word (in the form used) in <b></b>'),
        vi: z.string().describe('Natural Vietnamese translation of this paragraph, plain text'),
      }),
    )
    .describe('4-6 paragraphs'),
  summary: z.string().describe('1-2 sentences: what happened in this episode, for continuity'),
  teaser: z.string().describe('One intriguing line hinting at tomorrow, no spoilers ("" for the finale)'),
  question: z
    .object({
      text: z.string().describe('A comprehension question about this episode'),
      options: z.array(z.string()).describe('3 short answer options'),
      answer: z.number().int().describe('0-based index of the correct option'),
    })
    .describe('One multiple-choice question that checks the reader understood the episode'),
})

const EPISODE_SYSTEM = `You write one daily episode of a serialized story for a Vietnamese adult learning English. \
Follow the season plan and keep characters, facts and tone consistent with the previous episodes.
- 180-280 words, 4-6 paragraphs, vivid and easy to follow; dialogue is welcome.
- Grammar and other vocabulary match the CEFR level.
- Use as many of the learner's words as fit naturally, in the sense a learner most likely studied; you may inflect \
them. Wrap every occurrence of a learner word, in the form used, in <b></b>. No other markup.
- Each paragraph gets a Vietnamese translation that reads like a good native translation.`

export async function generateSeason(req: SeasonRequest): Promise<SeasonBible> {
  const raw = await generateJson(req.ai ?? { provider: 'chatgpt-web' }, {
    system: SEASON_SYSTEM,
    user: seasonPrompt(req.genre, req.level),
    schema: BibleSchema,
    what: 'the season plan',
  })
  return normalizeBible(raw)
}

export async function generateEpisode(req: EpisodeRequest): Promise<Episode> {
  const words = req.words.map((w) => w.trim()).filter(Boolean)
  const raw = await generateJson(req.ai ?? { provider: 'chatgpt-web' }, {
    system: EPISODE_SYSTEM,
    user: episodePrompt({ ...req, words }),
    schema: EpisodeSchema,
    what: 'the episode',
  })
  return normalizeEpisode(raw, words, req.number)
}

export function registerEpisodesIpc(): void {
  ipcMain.handle('episodes:season', (_e, req: SeasonRequest) => generateSeason(req))
  ipcMain.handle('episodes:episode', (_e, req: EpisodeRequest) => generateEpisode(req))
}
