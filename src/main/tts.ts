// IPC registration for Edge TTS synthesis (engine lives in edgeTts.ts).
import { ipcMain } from 'electron'
import type { TtsSynthesizeRequest, TtsSynthesizeResult } from '../shared/tts'
import { synthesize } from './edgeTts'

/** Register once on app whenReady. */
export function registerTtsIpc(): void {
  ipcMain.handle(
    'tts:synthesize',
    async (_event, req: TtsSynthesizeRequest): Promise<TtsSynthesizeResult> => {
      const text = req.text.replace(/\s+/g, ' ').trim()
      if (!text) return { audio: new ArrayBuffer(0), boundaries: [] }
      return synthesize({ ...req, text })
    },
  )
}
