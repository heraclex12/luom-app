// Optional AI enrichment: an AI model writes a high-quality EN→VI entry (natural Vietnamese meanings, learner-friendly
// definitions, bilingual examples, forms, family). Provider (Lượm (Free) / ChatGPT bridge / Custom API) chosen in Settings.
import { ipcMain } from 'electron'
import { z } from 'zod'
import { generateJson } from './ai'
import { WORD_FORM_LABELS, type EnViEntry } from '../shared/dictionary'
import type { EnrichRequest } from '../shared/enrich'

const EntrySchema = z.object({
  ipaUK: z.string().describe('British IPA without slashes, e.g. əˈbʌndəns'),
  ipaUS: z.string().describe('American IPA without slashes'),
  translation: z.string().describe('The single best short Vietnamese translation'),
  meanings: z
    .array(z.object({ pos: z.string(), terms: z.array(z.string()) }))
    .describe('Vietnamese glosses grouped by English part of speech (noun, verb, adjective…), most common first'),
  definitions: z
    .array(
      z.object({
        pos: z.string(),
        en: z.string().describe('Clear learner-dictionary English definition'),
        vi: z.string().describe('Natural Vietnamese translation of the definition'),
        exampleEn: z.string().describe('Example sentence using the word; wrap the word in <b></b>'),
        exampleVi: z.string().describe('Natural Vietnamese translation of the example'),
      }),
    )
    .describe('2-5 most useful senses'),
  examples: z
    .array(z.object({ en: z.string(), vi: z.string() }))
    .describe('4 natural, everyday example sentences; wrap the word in <b></b> in en'),
  synonyms: z.array(z.object({ pos: z.string(), words: z.array(z.string()) })),
  antonyms: z
    .array(z.object({ pos: z.string(), words: z.array(z.string()) }))
    .describe('Common antonyms grouped by part of speech (empty when none)'),
  forms: z
    .array(z.object({ label: z.enum(WORD_FORM_LABELS), value: z.string() }))
    .describe(
      'Inflections of the word for its main parts of speech: verbs → Past (V2), Past participle (V3), -ing form, ' +
        '3rd person; countable nouns → Plural; gradable adjectives → Comparative, Superlative (skip "more X" forms). ' +
        'Empty for phrases or words without inflections.',
    ),
  family: z
    .array(
      z.object({
        pos: z.string().describe('Lowercase part of speech of this related word'),
        word: z.string(),
        vi: z.string().describe('Short natural Vietnamese translation'),
      }),
    )
    .describe(
      'Word family: common related words of other parts of speech built from the same root ' +
        '(decide → decision noun, decisive adjective, decisively adverb). Up to 6, most useful first; empty for phrases.',
    ),
})

const SYSTEM = `You write entries for a personal English→Vietnamese vocabulary notebook used by a Vietnamese adult \
learning English. Be accurate and natural: Vietnamese must read like a good Vietnamese dictionary or a native \
translator, not word-by-word machine translation. Prefer common, modern senses and everyday example sentences a \
learner would actually meet. Keep definitions short. Parts of speech are lowercase English words. Include the \
word's inflections (irregular ones matter most), its word family and its antonyms when they exist.`

function prompt(req: EnrichRequest): string {
  const lines = [`Word or phrase: ${req.term}`]
  if (req.context) lines.push(`It was seen in this context (prioritise the matching sense): ${req.context}`)
  return lines.join('\n')
}

/** Ask the configured AI provider for an entry. Throws with a user-readable message on failure. */
export async function enrich(req: EnrichRequest): Promise<EnViEntry> {
  const out = await generateJson(req.ai, { system: SYSTEM, user: prompt(req), schema: EntrySchema, what: 'an entry' })
  return {
    word: req.term,
    ipaUK: out.ipaUK,
    ipaUS: out.ipaUS,
    translation: out.translation,
    meanings: out.meanings.filter((m) => m.terms.length > 0),
    definitions: out.definitions.map((d) => ({
      pos: d.pos,
      en: d.en,
      vi: d.vi,
      ...(d.exampleEn ? { example: { en: d.exampleEn, vi: d.exampleVi } } : {}),
    })),
    examples: out.examples,
    synonyms: out.synonyms.filter((s) => s.words.length > 0),
    antonyms: out.antonyms.filter((s) => s.words.length > 0),
    forms: out.forms.filter((f) => f.value.trim()),
    family: out.family.filter((f) => f.word.trim() && f.word.toLowerCase() !== req.term.toLowerCase()),
    source: 'ai',
  }
}

export function registerEnrichIpc(): void {
  ipcMain.handle('enrich:run', (_e, req: EnrichRequest) => enrich(req))
}
