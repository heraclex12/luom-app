/**
 * DOM implementation of AudioPort: one reused <audio> loads each sentence MP3 (blob URL),
 * playbackRate for speed, preservesPitch on. Time callbacks are rAF-driven (timeupdate is too
 * coarse for word highlighting); currentTime is media time, same domain as word-boundary ticks.
 *
 * No unit tests (no DOM in node). Deliberately logic-free: all state lives in session.ts.
 */
import { interruptClip } from '@/lib/audio'
import type { AudioPort } from './session'

export interface AudioClipPlayer extends AudioPort {
  /** Teardown: stop, cancel rAF, revoke blob URL, clear listeners. */
  dispose(): void
}

export function createAudioClipPlayer(): AudioClipPlayer {
  const el = new Audio()
  el.preservesPitch = true
  let url: string | null = null
  const timeCbs = new Set<(sec: number) => void>()
  const endedCbs = new Set<() => void>()
  let raf = 0

  const stopTicking = (): void => cancelAnimationFrame(raf)
  const tick = (): void => {
    timeCbs.forEach((cb) => cb(el.currentTime))
    raf = requestAnimationFrame(tick)
  }
  el.addEventListener('play', () => {
    stopTicking()
    raf = requestAnimationFrame(tick)
  })
  el.addEventListener('pause', stopTicking) // browsers fire pause before ended
  el.addEventListener('ended', () => {
    stopTicking()
    // Report the final frame: rAF may stop one frame early and miss the last word
    if (Number.isFinite(el.duration)) timeCbs.forEach((cb) => cb(el.duration))
    endedCbs.forEach((cb) => cb())
  })

  const revoke = (): void => {
    if (url) {
      URL.revokeObjectURL(url)
      url = null
    }
  }

  return {
    load(audio) {
      revoke()
      url = URL.createObjectURL(new Blob([audio], { type: 'audio/mpeg' }))
      el.src = url
      return new Promise<number>((resolve, reject) => {
        const cleanup = (): void => {
          el.removeEventListener('loadedmetadata', onMeta)
          el.removeEventListener('error', onErr)
        }
        const onMeta = (): void => {
          cleanup()
          resolve(el.duration) // may be NaN/Infinity; session guards against it
        }
        const onErr = (): void => {
          cleanup()
          reject(new Error('Audio decoding failed'))
        }
        el.addEventListener('loadedmetadata', onMeta)
        el.addEventListener('error', onErr)
      })
    },
    play() {
      interruptClip() // Stop any playing pronunciation clip before reading aloud (lib/audio single-voice rule)
      // Electron has no autoplay gate; if rejected anyway, don't throw
      void el.play().catch(() => {})
    },
    pause() {
      el.pause()
    },
    stop() {
      el.pause()
      try {
        el.currentTime = 0
      } catch {
        // setting currentTime with no source throws; ignore
      }
    },
    seek(seconds) {
      el.currentTime = seconds
    },
    setRate(rate) {
      el.playbackRate = rate
    },
    onTime(cb) {
      timeCbs.add(cb)
      return () => timeCbs.delete(cb)
    },
    onEnded(cb) {
      endedCbs.add(cb)
      return () => endedCbs.delete(cb)
    },
    dispose() {
      stopTicking()
      el.pause()
      el.removeAttribute('src')
      // load() after removing src actually releases the decoder and buffered MP3 (otherwise it
      // lingers until GC). A source-less load fires only `emptied`, not `error`.
      el.load()
      revoke()
      timeCbs.clear()
      endedCbs.clear()
    },
  }
}
