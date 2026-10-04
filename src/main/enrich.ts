// Optional AI enrichment: Claude writes a high-quality EN→VI entry (natural Vietnamese meanings, learner-friendly
// definitions, bilingual examples) for a term. Needs the user's Anthropic API key, stored encrypted with safeStorage
// (macOS Keychain-backed) — the key never reaches the renderer.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { app, ipcMain, safeStorage } from 'electron'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { EnViEntry } from '../shared/dictionary'
import { AI_MODELS, DEFAULT_AI_MODEL, type AiModel, type EnrichRequest } from '../shared/enrich'

const keyFile = (): string => join(app.getPath('userData'), 'anthropic-key.bin')

function readKey(): string | null {
  try {
    if (!existsSync(keyFile()) || !safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(readFileSync(keyFile())) || null
  } catch {
    return null
  }
}

function writeKey(key: string): void {
  const trimmed = key.trim()
  if (!trimmed) {
    rmSync(keyFile(), { force: true })
    return
  }
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is not available on this Mac.')
  writeFileSync(keyFile(), safeStorage.encryptString(trimmed))
}

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
})

const SYSTEM = `You write entries for a personal English→Vietnamese vocabulary notebook used by a Vietnamese adult \
learning English. Be accurate and natural: Vietnamese must read like a good Vietnamese dictionary or a native \
translator, not word-by-word machine translation. Prefer common, modern senses and everyday example sentences a \
learner would actually meet. Keep definitions short. Parts of speech are lowercase English words.`

function prompt(req: EnrichRequest): string {
  const lines = [`Word or phrase: ${req.term}`]
  if (req.context) lines.push(`It was seen in this context (prioritise the matching sense): ${req.context}`)
  return lines.join('\n')
}

/** Ask Claude for an entry. Throws with a user-readable message on failure. */
export async function enrich(req: EnrichRequest): Promise<EnViEntry> {
  const apiKey = readKey()
  if (!apiKey) throw new Error('Add your Anthropic API key in Settings → AI first.')
  const model: AiModel = AI_MODELS.some((m) => m.id === req.model) ? req.model! : DEFAULT_AI_MODEL
  const client = new Anthropic({ apiKey })
  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt(req) }],
      // Short structured lookup: low effort is plenty (Haiku 4.5 does not accept effort at all).
      output_config:
        model === 'claude-haiku-4-5'
          ? { format: betaZodOutputFormat(EntrySchema) }
          : { format: betaZodOutputFormat(EntrySchema), effort: 'low' },
      // Opus: if a request is declined by a safety classifier, the server retries on a fallback model.
      ...(model === 'claude-opus-5'
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
        : {}),
    })
    if (response.stop_reason === 'refusal') throw new Error('Claude declined to write an entry for this text.')
    const out = response.parsed_output
    if (!out) throw new Error('Claude returned an unexpected answer. Please try again.')
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
      source: 'ai',
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Your Anthropic API key was rejected. Check it in Settings → AI.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited by the Anthropic API — try again in a moment.')
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Could not reach the Anthropic API. Are you online?')
    if (e instanceof Anthropic.APIError) throw new Error(`Anthropic API error ${e.status ?? ''}: ${e.message}`)
    throw e
  }
}

export function registerEnrichIpc(): void {
  ipcMain.handle('enrich:has-key', () => readKey() !== null)
  ipcMain.handle('enrich:set-key', (_e, key: string) => writeKey(key))
  ipcMain.handle('enrich:run', (_e, req: EnrichRequest) => enrich(req))
}
