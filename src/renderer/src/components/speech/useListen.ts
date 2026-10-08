import { useCallback, useEffect, useRef, useState } from 'react'
import * as practice from '@/practice'
import { startRecording, type Recording } from '@/lib/recorder'

export type ListenState =
  | { kind: 'idle' }
  | { kind: 'asking' }
  | { kind: 'listening'; level: number }
  | { kind: 'checking' }
  | { kind: 'error'; message: string; pane?: 'microphone' | 'speech' }

const ipcMessage = (e: unknown): string =>
  e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(e)

/**
 * Listen once: ask for the microphone, record until the learner stops talking (or taps stop), and return what the
 * Mac heard (on-device). Resolves null when cancelled or when there was an error (shown in `state`).
 */
export function useListen(opts: { maxMs?: number; silenceMs?: number } = {}): {
  state: ListenState
  listen: () => Promise<practice.Recognition | null>
  stop: () => void
  cancel: () => void
  reset: () => void
} {
  const [state, setState] = useState<ListenState>({ kind: 'idle' })
  const rec = useRef<Recording | null>(null)
  const finish = useRef<(() => void) | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      rec.current?.cancel()
    }
  }, [])

  const set = (s: ListenState): void => {
    if (alive.current) setState(s)
  }

  const listen = useCallback(async (): Promise<practice.Recognition | null> => {
    rec.current?.cancel()
    set({ kind: 'asking' })
    if ((await practice.micAccess()) !== 'granted') {
      set({ kind: 'error', message: 'Lượm needs your microphone to hear you.', pane: 'microphone' })
      return null
    }
    let stopped!: () => void
    const ended = new Promise<void>((r) => (stopped = r))
    finish.current = stopped
    try {
      rec.current = await startRecording({
        maxMs: opts.maxMs,
        silenceMs: opts.silenceMs,
        onLevel: (level) => set({ kind: 'listening', level }),
        onAutoStop: () => stopped(),
      })
    } catch {
      set({ kind: 'error', message: 'The microphone could not start.', pane: 'microphone' })
      return null
    }
    set({ kind: 'listening', level: 0 })
    await ended
    const recording = rec.current
    rec.current = null
    if (!recording) return null // cancelled
    set({ kind: 'checking' })
    try {
      const wav = await recording.stop()
      const result = wav ? await practice.recognize(wav) : { text: '', words: [], alternatives: [] }
      set({ kind: 'idle' })
      return result
    } catch (e) {
      const message = ipcMessage(e)
      set({ kind: 'error', message, pane: /speech recognition/i.test(message) ? 'speech' : undefined })
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.maxMs, opts.silenceMs])

  const stop = useCallback(() => finish.current?.(), [])
  const cancel = useCallback(() => {
    rec.current?.cancel()
    rec.current = null
    finish.current?.()
    set({ kind: 'idle' })
  }, [])
  const reset = useCallback(() => set({ kind: 'idle' }), [])

  return { state, listen, stop, cancel, reset }
}
