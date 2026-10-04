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

/** Text of a Responses API stream (SSE): output_text deltas, else the completed output; failures reported. */
export function collectResponsesText(sse: string): { text: string; error: string | null } {
  let text = ''
  let completedText = ''
  let error: string | null = null
  for (const line of sse.split('\n')) {
    if (!line.startsWith('data:')) continue
    let event: unknown
    try {
      event = JSON.parse(line.slice(5).trim())
    } catch {
      continue
    }
    if (!isObj(event)) continue
    if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') text += event.delta
    else if (event.type === 'response.completed' && isObj(event.response)) {
      const output = Array.isArray(event.response.output) ? event.response.output : []
      for (const item of output) {
        if (!isObj(item) || !Array.isArray(item.content)) continue
        for (const c of item.content) if (isObj(c) && typeof c.text === 'string') completedText += c.text
      }
    } else if ((event.type === 'response.failed' || event.type === 'error') && error === null) {
      const err = isObj(event.response) && isObj(event.response.error) ? event.response.error : event
      error = isObj(err) && typeof err.message === 'string' ? err.message : 'The model failed to answer.'
    }
  }
  return { text: text || completedText, error }
}

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

/** codex-chatgpt-web bridge /v1/models → automatic ChatGPT web models (Zero Risk needs manual pasting: skipped). */
export function parseBridgeModels(data: unknown): ModelOption[] {
  const list = isObj(data) && Array.isArray(data.data) ? data.data : isObj(data) && Array.isArray(data.models) ? data.models : []
  return list
    .filter((m): m is Record<string, unknown> => isObj(m))
    .map((m) => ({ id: String(m.id ?? m.slug ?? ''), name: String(m.display_name ?? m.name ?? m.id ?? m.slug ?? '') }))
    .filter((m) => m.id.startsWith('chatgpt-web/') && !m.id.includes('zero-risk'))
}
