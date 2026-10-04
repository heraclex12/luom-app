// Sentence translation for the reader (English → Vietnamese). Renderer calls to Google/Microsoft are blocked by
// CORS / Origin checks, so main forwards them. Failures throw so the popup can show an error.
import { ipcMain } from 'electron'
import type { TranslateProvider, TranslateRequest } from '../shared/translate'
import { httpFetch, translateToVietnamese } from './dictionary'

/** Request timeout. */
const TIMEOUT_MS = 10_000

const translateWithGoogle = (text: string): Promise<string> => translateToVietnamese(text)

// ─────────────────────────── Microsoft (Edge free endpoint, single POST) ───────────────────────────

/** Microsoft Edge's keyless translate endpoint (body = array of strings; response [{translations:[{text}]}]). */
async function translateWithAzure(text: string): Promise<string> {
  const url = new URL('https://edge.microsoft.com/translate/translatetext')
  url.searchParams.set('from', 'en')
  url.searchParams.set('to', 'vi')

  const res = await httpFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([text]),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Azure translate failed with status ${res.status}`)

  const data = (await res.json()) as Array<{ translations?: Array<{ text?: unknown }> }>
  const translated = data?.[0]?.translations?.[0]?.text
  if (typeof translated !== 'string') throw new Error('Azure translate returned an unexpected shape')
  return translated
}

const TRANSLATORS: Record<TranslateProvider, (text: string) => Promise<string>> = {
  google: translateWithGoogle,
  azure: translateWithAzure,
}

/** Register once at app ready. */
export function registerTranslateIpc(): void {
  ipcMain.handle('translate:sentence', async (_event, req: TranslateRequest): Promise<string> => {
    const text = req.text.replaceAll('\n', ' ').trim()
    if (!text) return ''
    return TRANSLATORS[req.provider](text)
  })
}
