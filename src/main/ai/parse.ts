// Pure parsing helpers for the AI providers (no I/O).
import { LUOM_STATIC, type LuomTier } from './fallback'

export interface ModelOption {
  id: string
  name: string
}

/** First complete top-level JSON object in a model's free-text answer (ignores <think> blocks, fences, chatter). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  for (let start = cleaned.indexOf('{'); start !== -1; start = cleaned.indexOf('{', start + 1)) {
    let depth = 0
    let inString = false
    let escaped = false
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i]
      if (inString) {
        if (escaped) escaped = false
        else if (ch === '\\') escaped = true
        else if (ch === '"') inString = false
        continue
      }
      if (ch === '"') inString = true
      else if (ch === '{') depth++
      else if (ch === '}' && --depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1))
        } catch {
          break // try the next "{"
        }
      }
    }
  }
  return null
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Free catalogue (/models) → the newest free Nemotron model for each Lượm tier (lightning, nano, super, ultra). */
export function luomTierModels(data: unknown): Partial<Record<LuomTier, string>> {
  const list = isObj(data) && Array.isArray(data.data) ? data.data : []
  const best: Partial<Record<LuomTier, { id: string; created: number }>> = {}
  for (const m of list) {
    if (!isObj(m) || typeof m.id !== 'string' || !m.id.startsWith('nvidia/nemotron')) continue
    if (!isObj(m.pricing) || m.pricing.prompt !== '0' || m.pricing.completion !== '0') continue
    const tier = (Object.keys(LUOM_STATIC) as LuomTier[]).find((t) => new RegExp(`[-/.]${t}\\b`).test(m.id as string))
    const created = typeof m.created === 'number' ? m.created : 0
    if (tier && (!best[tier] || created > best[tier].created)) best[tier] = { id: m.id, created }
  }
  return Object.fromEntries(Object.entries(best).map(([t, m]) => [t, m.id]))
}

/** One event of a streamed chat answer: `progress` when the model sent anything (its thinking or answer text). */
export type SseEvent = { progress: boolean; content: string; error?: string } | { done: true }

/** Complete server-sent events in `buffer` (an OpenAI-style chat stream) and the unfinished rest. Comment lines
 *  (": OPENROUTER PROCESSING") are keep-alives, not progress. */
export function readSse(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = []
  let rest = buffer
  for (let i = rest.indexOf('\n'); i >= 0; i = rest.indexOf('\n')) {
    const line = rest.slice(0, i).trim()
    rest = rest.slice(i + 1)
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') {
      events.push({ done: true })
      continue
    }
    try {
      const json = JSON.parse(data) as { error?: { message?: string }; choices?: { delta?: { content?: string; reasoning?: string; reasoning_content?: string } }[] }
      if (json.error) {
        events.push({ progress: false, content: '', error: json.error.message ?? 'error' })
        continue
      }
      const delta = json.choices?.[0]?.delta ?? {}
      const content = typeof delta.content === 'string' ? delta.content : ''
      events.push({ progress: !!(content || delta.reasoning || delta.reasoning_content), content })
    } catch {
      // a malformed event: skip it
    }
  }
  return { events, rest }
}

/** A Custom API's /models answer (OpenAI {data: […]}, a bare array, or {models: […]}) → options sorted by id. */
export function parseModelList(data: unknown): ModelOption[] {
  const list = Array.isArray(data) ? data : isObj(data) ? (Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : []) : []
  const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
  return list
    .filter(isObj)
    .map((m) => {
      const id = text(m.id) ?? text(m.name)
      return id ? { id, name: text(m.display_name) ?? text(m.name) ?? id } : null
    })
    .filter((m): m is ModelOption => m !== null)
    .filter((m, i, all) => all.findIndex((x) => x.id === m.id) === i)
    .sort((a, b) => a.id.localeCompare(b.id))
}

/** Scripts that never belong in an English / Vietnamese answer: Cyrillic, Arabic, Devanagari, Thai, Hangul, kana, CJK. */
const FOREIGN_SCRIPT = /[Ѐ-ӿ؀-ۿऀ-ॿ฀-๿ᄀ-ᇿ぀-ヿ㄰-㆏㐀-鿿가-힯]/

/** True when a model slipped words from another language into the answer (weaker free models sometimes do). */
export const hasForeignScript = (text: string): boolean => FOREIGN_SCRIPT.test(text)
