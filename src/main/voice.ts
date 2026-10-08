// Voice: microphone permission, and what was said in a recording made by the renderer (16 kHz mono WAV), heard by the
// native helper with Apple's on-device speech recognition (native/speech-helper.swift; nothing leaves the Mac).
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app, ipcMain, shell, systemPreferences } from 'electron'
import type { Recognition } from '../shared/voice'
import { resourcePath } from './paths'

const execFileAsync = promisify(execFile)
const MAX_BYTES = 5 * 1024 * 1024 // ~2.5 minutes of 16 kHz mono

/** Microphone access, asking once when macOS has not been asked yet. */
export async function micAccess(): Promise<'granted' | 'denied'> {
  const status = systemPreferences.getMediaAccessStatus('microphone')
  if (status === 'granted') return 'granted'
  if (status === 'not-determined') return (await systemPreferences.askForMediaAccess('microphone')) ? 'granted' : 'denied'
  return 'denied'
}

const ERRORS: Record<string, string> = {
  denied: 'Lượm is not allowed to use speech recognition. Turn it on in System Settings → Privacy & Security → Speech Recognition.',
  restricted: 'Speech recognition is turned off on this Mac.',
  unavailable: 'English speech recognition is not ready on this Mac yet. Turn on Dictation once in System Settings → Keyboard, then try again.',
  timeout: 'Listening took too long. Please try again.',
}

export async function recognize(wav: Uint8Array): Promise<Recognition> {
  const bin = resourcePath('bin', 'speech-helper')
  if (!existsSync(bin)) throw new Error('Speech recognition is not included in this copy of Lượm.')
  if (!(wav instanceof Uint8Array) || wav.byteLength < 44 || wav.byteLength > MAX_BYTES) throw new Error('That recording could not be used.')
  const file = join(app.getPath('temp'), `luom-voice-${process.pid}-${Date.now()}.wav`)
  try {
    await writeFile(file, wav)
    const { stdout } = await execFileAsync(bin, [file, 'en-US'], { timeout: 30_000 })
    const out = JSON.parse(stdout.trim().split('\n').pop() ?? '{}') as Partial<Recognition> & { error?: string }
    if (out.error) throw new Error(ERRORS[out.error] ?? `Speech recognition failed: ${out.error}`)
    return {
      text: typeof out.text === 'string' ? out.text : '',
      words: Array.isArray(out.words) ? out.words.filter((w) => typeof w?.text === 'string').map((w) => ({ text: w.text, confidence: Number(w.confidence) || 0 })) : [],
      alternatives: Array.isArray(out.alternatives) ? out.alternatives.filter((a): a is string => typeof a === 'string') : [],
    }
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error('Speech recognition gave an unexpected answer. Please try again.')
    if ((e as { killed?: boolean }).killed) throw new Error(ERRORS.timeout)
    throw e
  } finally {
    void rm(file, { force: true })
  }
}

export function registerVoiceIpc(): void {
  ipcMain.handle('voice:mic', () => micAccess())
  ipcMain.handle('voice:recognize', (_e, wav: Uint8Array) => recognize(wav))
  ipcMain.handle('voice:open-privacy', (_e, pane: 'microphone' | 'speech') =>
    shell.openExternal(
      `x-apple.systempreferences:com.apple.preference.security?${pane === 'microphone' ? 'Privacy_Microphone' : 'Privacy_SpeechRecognition'}`,
    ),
  )
}
