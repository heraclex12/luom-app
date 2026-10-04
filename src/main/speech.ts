// speak:// protocol: pronunciation audio for words and example sentences.
// speak://tts/?voice=en-US-AvaNeural&text=hello → MP3 synthesised by Edge neural TTS, cached on disk so each phrase is
// fetched once and then works offline. If Edge is unreachable, falls back to the built-in macOS voices (`say`).
import { app, protocol } from 'electron'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { parseSpeechUrl, SPEECH_SCHEME, SPEECH_VOICES } from '../shared/speech'
import { synthesize } from './edgeTts'

const execFileAsync = promisify(execFile)

/** Privileges for the scheme (registered together with the book scheme before app ready). */
export const SPEECH_SCHEME_PRIVILEGES = {
  scheme: SPEECH_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
} as const

/** macOS fallback voices (always installed). */
const SAY_VOICES: Record<string, string> = {
  [SPEECH_VOICES.us]: 'Samantha',
  [SPEECH_VOICES.uk]: 'Daniel',
}

const cacheDir = (): string => join(app.getPath('userData'), 'speech-cache')

function cacheKey(voice: string, text: string): string {
  return createHash('sha1').update(`${voice}\n${text}`).digest('hex')
}

// De-duplicate concurrent requests for the same clip (double clicks, two cards).
const inflight = new Map<string, Promise<{ bytes: Buffer; type: string }>>()

async function synthesizeToCache(voice: string, text: string): Promise<{ bytes: Buffer; type: string }> {
  const key = cacheKey(voice, text)
  const mp3 = join(cacheDir(), `${key}.mp3`)
  const m4a = join(cacheDir(), `${key}.m4a`)
  try {
    return { bytes: await readFile(mp3), type: 'audio/mpeg' }
  } catch {
    /* not cached */
  }
  await mkdir(cacheDir(), { recursive: true })
  try {
    const { audio } = await synthesize({ lang: voice.slice(0, 5), text, voice, rate: 1 })
    const bytes = Buffer.from(audio)
    await writeFile(mp3, bytes)
    return { bytes, type: 'audio/mpeg' }
  } catch (edgeError) {
    // Offline fallback: macOS system voice (not cached, so the neural voice is used once back online).
    try {
      await execFileAsync('say', ['-v', SAY_VOICES[voice] ?? 'Samantha', '-o', m4a, '--file-format=m4af', text])
      const bytes = await readFile(m4a)
      void rm(m4a, { force: true })
      return { bytes, type: 'audio/mp4' }
    } catch {
      throw edgeError
    }
  }
}

async function handleSpeechRequest(request: Request): Promise<Response> {
  const parsed = parseSpeechUrl(request.url)
  if (!parsed) return new Response(null, { status: 404 })
  const key = cacheKey(parsed.voice, parsed.text)
  let job = inflight.get(key)
  if (!job) {
    job = synthesizeToCache(parsed.voice, parsed.text).finally(() => inflight.delete(key))
    inflight.set(key, job)
  }
  try {
    const { bytes, type } = await job
    return new Response(new Uint8Array(bytes), {
      headers: { 'content-type': type, 'content-length': String(bytes.byteLength), 'cache-control': 'max-age=31536000' },
    })
  } catch (e) {
    console.warn('[speech] synthesis failed', e)
    return new Response(null, { status: 502 })
  }
}

/** Register the protocol handler (after app ready). */
export function registerSpeechProtocol(): void {
  protocol.handle(SPEECH_SCHEME, handleSpeechRequest)
}
