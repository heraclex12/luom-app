// Microphone recorder for Say it / shadowing / spoken replies: records until stopped, or by itself once you stop
// talking (or at the time limit), and hands back a 16 kHz mono WAV (./wav.ts). Loudness is reported for the meter.
import { downsample, encodeWav, isSpeech, SPEECH_LEVEL } from './wav'

export interface Recording {
  /** Finish and return the WAV, or null when nothing was said. */
  stop: () => Promise<Uint8Array | null>
  /** Stop without a result. */
  cancel: () => void
}

export interface RecordOptions {
  /** 0..1 loudness, a few times a second. */
  onLevel?: (level: number) => void
  /** Called once when the recorder stops by itself (silence after speech, or the time limit). */
  onAutoStop?: () => void
  /** Silence after speech that ends the recording. */
  silenceMs?: number
  maxMs?: number
}

const RATE = 16_000

export async function startRecording(opts: RecordOptions = {}): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
  const ctx = new AudioContext()
  const source = ctx.createMediaStreamSource(stream)
  // ScriptProcessor is deprecated but needs no separate worklet file, and a few seconds of audio is all we keep.
  const node = ctx.createScriptProcessor(4096, 1, 1)
  const chunks: Float32Array[] = []
  const levels: number[] = []
  const started = performance.now()
  let lastLoud = 0
  let done = false
  const silenceMs = opts.silenceMs ?? 1200
  const maxMs = opts.maxMs ?? 8000

  node.onaudioprocess = (e) => {
    if (done) return
    const data = e.inputBuffer.getChannelData(0)
    chunks.push(new Float32Array(data))
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!
    const level = Math.sqrt(sum / data.length)
    levels.push(level)
    opts.onLevel?.(Math.min(1, level * 8))
    const now = performance.now()
    if (level >= SPEECH_LEVEL) lastLoud = now
    if ((lastLoud && now - lastLoud > silenceMs) || now - started > maxMs) {
      done = true
      opts.onAutoStop?.()
    }
  }
  source.connect(node)
  node.connect(ctx.destination)

  const close = (): void => {
    done = true
    node.disconnect()
    source.disconnect()
    stream.getTracks().forEach((t) => t.stop())
    void ctx.close()
  }

  return {
    stop: async () => {
      const rate = ctx.sampleRate
      close()
      if (!isSpeech(levels)) return null
      const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
      let o = 0
      for (const c of chunks) {
        all.set(c, o)
        o += c.length
      }
      return encodeWav(downsample(all, rate, RATE), RATE)
    },
    cancel: close,
  }
}
