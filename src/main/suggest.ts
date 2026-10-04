// Search-as-you-type suggestions via the free Datamuse API (English words only, no key).
// Suggestions are an enhancement: any failure silently returns an empty list.
import { ipcMain } from 'electron'
import type { SuggestEntry } from '../shared/suggest'
import { httpFetch } from './dictionary'

const SUGGEST_URL = 'https://api.datamuse.com/sug?max=8&s='

/** Give up fast so typing never waits on the network. */
const TIMEOUT_MS = 3000

/** Register once at app ready. */
export function registerSuggestIpc(): void {
  ipcMain.handle('suggest:query', async (_event, q: string): Promise<SuggestEntry[]> => {
    try {
      const res = await httpFetch(SUGGEST_URL + encodeURIComponent(q), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) return []
      const json = (await res.json()) as unknown
      if (!Array.isArray(json)) return []
      return json
        .filter((e): e is { word: string } => typeof e?.word === 'string')
        .map((e) => ({ entry: e.word, explain: '' }))
    } catch {
      return []
    }
  })
}
