// Pure parsing helpers for the AI providers (no I/O).

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

/** OpenRouter /models → free models (prompt and completion both priced "0"), unique, by name. */
export function parseFreeModels(data: unknown): ModelOption[] {
  const list = isObj(data) && Array.isArray(data.data) ? data.data : []
  return list
    .filter((m): m is Record<string, unknown> => isObj(m) && typeof m.id === 'string')
    .filter((m) => isObj(m.pricing) && m.pricing.prompt === '0' && m.pricing.completion === '0')
    .map((m) => ({ id: m.id as string, name: typeof m.name === 'string' ? m.name : (m.id as string) }))
    .filter((m, i, all) => all.findIndex((x) => x.id === m.id) === i)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Scripts that never belong in an English / Vietnamese answer: Cyrillic, Arabic, Devanagari, Thai, Hangul, kana, CJK. */
const FOREIGN_SCRIPT = /[Ѐ-ӿ؀-ۿऀ-ॿ฀-๿ᄀ-ᇿ぀-ヿ㄰-㆏㐀-鿿가-힯]/

/** True when a model slipped words from another language into the answer (weaker free models sometimes do). */
export const hasForeignScript = (text: string): boolean => FOREIGN_SCRIPT.test(text)
