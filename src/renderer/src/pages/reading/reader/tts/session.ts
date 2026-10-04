/**
 * Read-aloud session core: DOM-free playback orchestration (sentence advance / gaps / repeat /
 * prefetch / duration backfill / rate & voice changes / failure policy). All effects go through
 * injected ports (SynthFn / AudioPort / wait), so it is fully unit-testable; useTtsSession does the DOM side.
 *
 * Time domain: AudioPort reports <audio> media time (independent of playbackRate); timeline
 * offsets/durations use the same domain.
 *
 * States: starting/playing/paused/ended + onBoundary/onError callbacks. No public `stopped`
 * state: moving between sentences just swaps the <audio> source. User pause vs. transitional
 * pause shows up as two resume paths (loaded → continue; not loaded → re-synthesize current
 * sentence).
 */
import { normalizeSynthText } from './align'
import {
  applyMeasuredDuration,
  buildTimeline,
  type CalibrationMap,
  estimateDuration,
  sentenceIndexAtTime,
  type TimelineSentence,
  totalDuration,
  updateCalibration,
} from './timeline'

export type TtsStatus = 'starting' | 'playing' | 'paused' | 'ended'

/** A session sentence (mapped from TtsSentence by the hook; DOM Ranges stay in the hook). */
export interface SessionSentence {
  text: string
  blockIndex: number
}

export interface TtsSnapshot {
  status: TtsStatus
  /** Current sentence index (within the session list). */
  sentenceIndex: number
  /** Elapsed seconds in the chapter (timeline domain). */
  elapsed: number
  /** Total chapter duration (seconds; refined as measurements come in). */
  duration: number
  /** Synthesized (contiguous ready span) fraction 0–1, for the buffer bar. */
  bufferedFraction: number
  repeating: boolean
  rate: number
}

/** Output port: loads one sentence of audio at a time; time callbacks report media time (s). DOM impl: audioClipPlayer.ts. */
export interface AudioPort {
  /**
   * Load a sentence's audio, resolving with the measured duration (may be NaN; caller guards).
   * **Must reject if it can't load (decode failure)**: the session then skips the sentence (see playCurrent).
   */
  load(audio: ArrayBuffer): Promise<number>
  play(): void
  pause(): void
  stop(): void
  seek(seconds: number): void
  setRate(rate: number): void
  onTime(cb: (seconds: number) => void): () => void
  onEnded(cb: () => void): () => void
}

/** Synthesis port: text is already normalizeSynthText'd, always synthesized at rate 1.0 (speed is applied on output).
 * Only the audio bytes are used (Edge word boundaries are ignored here). */
export type SynthFn = (text: string, voice: string) => Promise<{ audio: ArrayBuffer }>

export interface TtsSessionCallbacks {
  onSnapshot(snap: TtsSnapshot): void
  /** Current sentence changed (incl. start): hook draws highlight / auto-follows / saves resume anchor. */
  onSentenceChange(index: number): void
  /** Hit a chapter boundary (last sentence done / next at end / prev at start): hook crosses chapters or finishes. */
  onBoundary(dir: 'next' | 'prev'): void
  /** Unrecoverable error (repeated synthesis failures): hook notifies and tears down. */
  onError(message: string): void
}

export interface TtsSessionOptions {
  sentences: readonly SessionSentence[]
  startIndex: number
  rate: number
  /** Voice id, used for the whole chapter regardless of content language (changeable via setVoice). */
  voice: string
  /** Per-voice rate calibration shared across sessions (held by the hook). */
  calibration: CalibrationMap
  synth: SynthFn
  audio: AudioPort
  /** Sentence-gap wait; defaults to setTimeout, tests inject a manual version. */
  wait?: (ms: number) => Promise<void>
  callbacks: TtsSessionCallbacks
}

export interface TtsSession {
  /** Start. paused=true only positions, no synthesis or sound (keeps paused state across chapters). */
  start(paused?: boolean): void
  toggle(): void
  pause(): void
  resume(): void
  next(): void
  prev(): void
  /** An external short clip (word pronunciation) is about to play: pause if playing and mark interrupted; no-op otherwise. */
  interrupt(): void
  /** External clip ended: resume only if still in the interrupted pause. */
  resumeInterrupted(): void
  seekTo(seconds: number): void
  goToSentence(index: number): void
  setRate(rate: number): void
  setVoice(voiceId: string): void
  setRepeating(on: boolean): void
  snapshot(): TtsSnapshot
  dispose(): void
}

/** Prefetch depth: synthesize this many sentences ahead (enough for seamless transitions). */
const PREFETCH_AHEAD = 2
/** Retries per failed sentence synthesis. */
const SYNTH_RETRIES = 1
/** Consecutive skip cap: this many failed sentences in a row is unrecoverable (offline / blocked). */
const MAX_CONSECUTIVE_SKIPS = 3

export function createTtsSession(opts: TtsSessionOptions): TtsSession {
  const { sentences, synth, audio, calibration, callbacks } = opts
  const wait = opts.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  let voice = opts.voice

  let status: TtsStatus = 'starting'
  let index = Math.min(Math.max(opts.startIndex, 0), Math.max(sentences.length - 1, 0))
  let rate = opts.rate
  let repeating = false
  let disposed = false
  /** Navigation token: bumped on skip / voice change / dispose to invalidate in-flight work. */
  let epoch = 0
  /** Whether the current sentence's audio is loaded (resume: real resume vs. re-synthesize). */
  let loaded = false
  let inSentenceSec = 0
  /** Consecutive failed sentences; reset on any success. */
  let consecutiveSkips = 0
  let timeline: readonly TimelineSentence[] = buildTimeline(sentences, (it) =>
    estimateDuration(it.text, voice, calibration),
  )
  const clips = new Map<string, ArrayBuffer>()
  const inflight = new Map<string, Promise<ArrayBuffer | null>>()

  /** Cache key includes the voice, so changing voice invalidates old entries. */
  const keyOf = (i: number): string => `${voice}::${i}`

  const elapsed = (): number => {
    const s = timeline[index]
    return s ? s.offset + Math.min(inSentenceSec, s.duration) : 0
  }

  const snapshot = (): TtsSnapshot => ({
    status,
    sentenceIndex: index,
    elapsed: elapsed(),
    duration: totalDuration(timeline),
    bufferedFraction: bufferedFraction(),
    repeating,
    rate,
  })
  const emit = (): void => callbacks.onSnapshot(snapshot())

  /** The two "intends to play" states: navigation / voice change / resume treat them the same. */
  const isActive = (): boolean => status === 'playing' || status === 'starting'

  /** Invalidate in-flight work and stop current sound (shared by skip / voice change; dispose has its own order). */
  const abort = (): void => {
    epoch++
    audio.stop()
  }

  /** Clear the current sentence's output state (shared by sentence / voice change). */
  const clearSentenceState = (): void => {
    inSentenceSec = 0
    loaded = false
  }

  /** Switch the current sentence: reset progress and notify the hook (highlight / anchor / follow). */
  const setIndex = (i: number): void => {
    index = i
    clearSentenceState()
    callbacks.onSentenceChange(i)
  }

  /**
   * Get a sentence's synthesis: cache hit returns immediately; in-flight requests are deduped;
   * after SYNTH_RETRIES failed retries returns null, which playCurrent handles (skip + consecutive cap).
   */
  const ensureClip = (i: number): Promise<ArrayBuffer | null> => {
    const s = sentences[i]
    if (!s) return Promise.resolve(null)
    const key = keyOf(i)
    const hit = clips.get(key)
    if (hit) return Promise.resolve(hit)
    const pending = inflight.get(key)
    if (pending) return pending
    const p = (async (): Promise<ArrayBuffer | null> => {
      for (let attempt = 0; attempt <= SYNTH_RETRIES; attempt++) {
        try {
          const { audio: bytes } = await synth(normalizeSynthText(s.text), voice)
          clips.set(key, bytes)
          return bytes
        } catch {
          // retry; null if it still fails
        }
      }
      return null
    })()
    inflight.set(key, p)
    void p.finally(() => inflight.delete(key))
    return p
  }

  /** Prefetch a few sentences ahead so transitions don't wait on a round trip. */
  const prefetch = (): void => {
    const myEpoch = epoch
    for (let k = 1; k <= PREFETCH_AHEAD; k++) {
      const i = index + k
      if (i >= sentences.length) break
      void ensureClip(i).then(() => {
        if (!disposed && epoch === myEpoch) emit() // buffer advanced, refresh readouts
      })
    }
  }

  /** End of the contiguous ready span as a fraction of the chapter (stops at the first unready sentence). */
  const bufferedFraction = (): number => {
    const total = totalDuration(timeline)
    if (total <= 0 || !clips.has(keyOf(index))) return 0
    let j = index
    while (j + 1 < sentences.length && clips.has(keyOf(j + 1))) j++
    const s = timeline[j]!
    return Math.min(1, (s.offset + s.duration) / total)
  }

  /** Whether in-flight work is stale (epoch changed / disposed): check after every await. */
  const stale = (myEpoch: number): boolean => disposed || epoch !== myEpoch

  /** Synthesize → load → play the current sentence. Check epoch/disposed after every await. */
  const playCurrent = async (): Promise<void> => {
    const myEpoch = epoch
    const s = sentences[index]
    if (!s) return
    const clip = await ensureClip(index)
    if (stale(myEpoch)) return
    if (!clip) {
      skipFailed()
      return
    }
    // Failing to load (decode error) is treated like synthesis failure. null is the failure sentinel;
    // load may legitimately resolve NaN (unknown duration), handled by the backfill guard below.
    const measured = await audio.load(clip).catch(() => null)
    if (stale(myEpoch)) return
    if (measured === null) {
      skipFailed()
      return
    }
    // Reset here rather than on synth success: otherwise "synth OK but load always fails" never hits the cap.
    consecutiveSkips = 0
    loaded = true
    // Backfill the measured duration; applyMeasuredDuration/updateCalibration
    // guard against invalid values (NaN/≤0).
    timeline = applyMeasuredDuration(timeline, index, measured)
    updateCalibration(calibration, voice, s.text, measured)
    if (status === 'paused') {
      emit() // paused while loading: ready to resume, stay silent
      return
    }
    audio.setRate(rate)
    audio.seek(0)
    audio.play()
    status = 'playing'
    emit()
    prefetch()
  }

  /** A sentence failed: hit the cap → unrecoverable; last sentence → boundary; else skip ahead (session continues). */
  const skipFailed = (): void => {
    consecutiveSkips++
    if (consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
      status = 'ended'
      emit()
      callbacks.onError('Several sentences failed to synthesize. Read aloud stopped.')
      return
    }
    if (index >= sentences.length - 1) {
      callbacks.onBoundary('next')
      return
    }
    setIndex(index + 1)
    void playCurrent()
  }

  /** Sentence finished: wait the gap (scaled by rate), then advance; last sentence → boundary. */
  const advanceAfterGap = async (): Promise<void> => {
    const myEpoch = epoch
    const gapMs = ((timeline[index]?.gap ?? 0) / rate) * 1000
    if (gapMs > 0) await wait(gapMs)
    if (stale(myEpoch) || status !== 'playing') return
    if (index >= sentences.length - 1) {
      audio.stop()
      callbacks.onBoundary('next')
      return
    }
    setIndex(index + 1)
    void playCurrent()
  }

  const offEnded = audio.onEnded(() => {
    if (disposed || status !== 'playing' || !loaded) return
    if (repeating) {
      // Repeat: rewind to sentence start (skip the trailing gap)
      audio.seek(0)
      audio.play()
      return
    }
    void advanceAfterGap()
  })

  const offTime = audio.onTime((sec) => {
    if (disposed || !loaded) return
    inSentenceSec = sec
    emit()
  })

  /** Paused due to a pronunciation clip (unlike a user pause, auto-resumes when it ends). Cleared by manual pause/resume. */
  let interrupted = false

  const pause = (): void => {
    if (!isActive()) return
    interrupted = false // manual pause clears interruption: don't auto-resume for the user
    audio.pause()
    status = 'paused'
    emit()
  }

  const resume = (): void => {
    if (status !== 'paused') return
    interrupted = false // resumed (incl. user taking over mid-clip), interruption no longer relevant
    status = 'playing'
    if (loaded) {
      // user pause: real resume
      audio.setRate(rate)
      audio.play()
    } else {
      // transitional pause (skipped / changed voice while paused): re-synthesize current sentence
      epoch++
      void playCurrent() // sync part emits no snapshot, so emit below
    }
    emit()
  }

  /** After a jump / voice change: if playing, continue from the current sentence; if paused, only move highlight and anchor. */
  const restartOrEmit = (): void => {
    if (isActive()) void playCurrent()
    else emit()
  }

  const goToSentence = (i: number): void => {
    if (!sentences.length) return
    const clamped = Math.min(Math.max(i, 0), sentences.length - 1)
    abort()
    setIndex(clamped)
    restartOrEmit()
  }

  /** Step sentences: don't clamp at chapter ends; the hook handles crossing chapters. */
  const step = (delta: 1 | -1): void => {
    const target = index + delta
    if (target < 0 || target >= sentences.length) {
      abort()
      callbacks.onBoundary(delta > 0 ? 'next' : 'prev')
    } else goToSentence(target)
  }

  return {
    start(paused = false) {
      epoch++
      setIndex(index)
      if (paused) {
        status = 'paused'
        emit()
      } else {
        status = 'starting'
        emit() // optimistic: emit `starting` first (player shows), switch to playing once synthesized
        void playCurrent()
      }
    },
    toggle() {
      if (status === 'paused') resume()
      else pause() // pause self-guards in the ended state
    },
    pause,
    resume,
    next() {
      step(1)
    },
    prev() {
      step(-1)
    },
    interrupt() {
      if (!isActive()) return
      pause()
      interrupted = true // must come after pause: pause clears the flag
    },
    resumeInterrupted() {
      if (interrupted) resume() // resume guards paused state and clears the flag
    },
    seekTo(seconds) {
      const t = Math.min(Math.max(seconds, 0), totalDuration(timeline))
      goToSentence(sentenceIndexAtTime(timeline, t)) // snap to sentence
    },
    goToSentence,
    setRate(r) {
      rate = r
      audio.setRate(r) // takes effect immediately, no re-synthesis (media time domain, see header)
      emit()
    },
    setVoice(voiceId) {
      if (voice === voiceId) return
      voice = voiceId // cache key includes voice, old entries invalidate automatically
      // Voice applies to the whole chapter, so the current sentence stops and re-synthesizes with the new voice (throttled in the hook)
      abort()
      clearSentenceState()
      restartOrEmit()
    },
    setRepeating(on) {
      repeating = on
      emit()
    },
    snapshot,
    dispose() {
      disposed = true
      epoch++
      offTime()
      offEnded()
      audio.stop()
      // The whole chapter's audio (~360KB/min) lives in these maps; clear them when switching sessions.
      clips.clear()
      inflight.clear()
    },
  }
}
