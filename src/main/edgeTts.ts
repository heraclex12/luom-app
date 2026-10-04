// Edge "Read Aloud" speech synthesis engine (main side, no electron deps so it's unit-testable;
// IPC registration is in tts.ts).
//
// Reimplemented from the protocol used by readest's Node wss path (readest itself is AGPL, so this is
// a rewrite, not a copy), without the https proxy fallback, tauri/cloudflare branches or caching.
//
// Failures (connect error / timeout / no audio) throw and surface as an invoke rejection in the renderer.
import { createHash, randomBytes } from 'node:crypto'
import { WebSocket } from 'ws'
import type { TtsSynthesizeRequest, TtsSynthesizeResult, TtsWordBoundary } from '../shared/tts'

const EDGE_SPEECH_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1'
const EDGE_API_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const CHROMIUM_FULL_VERSION = '143.0.3650.75'
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split('.')[0]

/** Timeout for one round trip (a sentence); give up after 15s. */
const TIMEOUT_MS = 15_000

const WIN_EPOCH_OFFSET = 11_644_473_600 // 1601→1970 offset in seconds (divisible by 300, so 5-min buckets align with unix time)
const S_TO_NS = 1_000_000_000

/**
 * Sec-MS-GEC signature: Windows file time (1601 epoch) floored to 5 minutes, concatenated with the
 * TrustedClientToken, SHA-256, uppercase hex. Stable within a 5-minute bucket.
 * See https://github.com/rany2/edge-tts/issues/290#issuecomment-2464956570
 */
export function generateSecMsGec(): string {
  let ticks = Math.floor(Date.now() / 1000)
  ticks += WIN_EPOCH_OFFSET
  ticks -= ticks % 300
  ticks *= S_TO_NS / 100
  const strToHash = `${ticks.toFixed(0)}${EDGE_API_TOKEN}`
  return createHash('sha256').update(strToHash).digest('hex').toUpperCase()
}

/** Escape XML: unescaped & < > in the text would break the SSML. */
function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Wrap plain text in the SSML envelope Edge expects. */
export function genSSML(lang: string, text: string, voice: string, rate: number): string {
  return `
    <speak version="1.0" xml:lang="${lang}">
      <voice name="${voice}">
        <prosody rate="${rate}" >
            ${escapeXml(text)}
        </prosody>
      </voice>
    </speak>
  `
}

interface AudioMetadataEntry {
  Type?: string
  Data?: { Offset?: number; Duration?: number; text?: { Text?: string } }
}

/** Parse WordBoundary entries from an audio.metadata frame. */
export function parseAudioMetadataBody(body: string): TtsWordBoundary[] {
  try {
    const parsed = JSON.parse(body) as { Metadata?: AudioMetadataEntry[] }
    const boundaries: TtsWordBoundary[] = []
    for (const entry of parsed.Metadata ?? []) {
      if (entry.Type !== 'WordBoundary') continue
      const offset = entry.Data?.Offset
      const text = entry.Data?.text?.Text
      if (typeof offset !== 'number' || typeof text !== 'string' || !text) continue
      boundaries.push({ offset, duration: entry.Data?.Duration ?? 0, text })
    }
    return boundaries
  } catch {
    return []
  }
}

// Edge text frames look like "Key: Value\r\n...\r\n\r\nbody"; split headers and body.
function parseTextFrame(message: string): { headers: Record<string, string>; body: string } {
  const lines = message.split('\n')
  const headers: Record<string, string> = {}
  let i = 0
  for (; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!line) break
    const sep = line.indexOf(':')
    if (sep === -1) continue
    headers[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
  }
  let body = ''
  for (i = i + 1; i < lines.length; i++) body += lines[i] + '\n'
  return { headers, body }
}

// Build an Edge frame: CRLF-separated headers, blank line, then body.
function genSendContent(headerObj: Record<string, string>, content: string): string {
  let header = ''
  for (const key of Object.keys(headerObj)) header += `${key}: ${headerObj[key]}\r\n`
  return `${header}\r\n${content}`
}

/** One wss round trip; returns the full MP3 and word boundaries. */
export function synthesize(req: TtsSynthesizeRequest): Promise<TtsSynthesizeResult> {
  const { lang, text, voice, rate } = req
  const connectId = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    ConnectionId: connectId,
    TrustedClientToken: EDGE_API_TOKEN,
    'Sec-MS-GEC': generateSecMsGec(),
    'Sec-MS-GEC-Version': `1-${CHROMIUM_FULL_VERSION}`,
  })
  const url = `${EDGE_SPEECH_URL}?${params.toString()}`
  const date = new Date().toString()
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' +
      ` (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36` +
      ` Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    Cookie: `muid=${randomBytes(16).toString('hex').toUpperCase()};`,
  }
  const config = genSendContent(
    {
      'Content-Type': 'application/json; charset=utf-8',
      Path: 'speech.config',
      'X-Timestamp': date,
    },
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: true },
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
          },
        },
      },
    }),
  )
  const content = genSendContent(
    {
      'Content-Type': 'application/ssml+xml',
      Path: 'ssml',
      'X-RequestId': connectId,
      'X-Timestamp': date,
    },
    genSSML(lang, text, voice, rate),
  )

  return new Promise<TtsSynthesizeResult>((resolve, reject) => {
    const ws = new WebSocket(url, { headers })
    ws.binaryType = 'arraybuffer'
    const chunks: Uint8Array[] = []
    const boundaries: TtsWordBoundary[] = []
    let settled = false

    const cleanup = (): void => {
      clearTimeout(timer)
      try {
        ws.close()
      } catch {
        /* already closed or never opened */
      }
    }
    const fail = (err: Error): void => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }
    const succeed = (): void => {
      if (settled) return
      const total = chunks.reduce((n, c) => n + c.byteLength, 0)
      if (!total) {
        fail(new Error('Edge TTS returned no audio'))
        return
      }
      settled = true
      cleanup()
      const merged = new Uint8Array(total)
      let at = 0
      for (const c of chunks) {
        merged.set(c, at)
        at += c.byteLength
      }
      resolve({ audio: merged.buffer, boundaries })
    }
    const timer = setTimeout(() => fail(new Error('Edge TTS timed out')), TIMEOUT_MS)

    ws.addEventListener('open', () => {
      ws.send(config)
      ws.send(content)
    })
    ws.addEventListener('message', (event) => {
      const data = event.data
      if (typeof data === 'string') {
        const { headers: h, body } = parseTextFrame(data)
        if (h['Path'] === 'audio.metadata') boundaries.push(...parseAudioMetadataBody(body.trim()))
        else if (h['Path'] === 'turn.end') succeed()
      } else if (data instanceof ArrayBuffer) {
        // Binary frame: first 2 bytes (big-endian) are the header length; audio follows at 2+headerLength.
        const view = new DataView(data)
        const headerLength = view.getInt16(0)
        if (data.byteLength > headerLength + 2) chunks.push(new Uint8Array(data, 2 + headerLength))
      }
    })
    ws.addEventListener('error', () => fail(new Error('Edge TTS connection failed')))
    ws.addEventListener('close', () => {
      // Normal path resolves on turn.end; closing before that is a failure.
      if (!settled) fail(new Error('Edge TTS connection closed unexpectedly'))
    })
  })
}
