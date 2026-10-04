/**
 * Read-aloud session hook: all DOM glue between the pure session.ts core and the reading engine:
 * sentence enumeration and start point, highlight, auto page-follow and manual detach, chapter
 * advance, selection protection, device memory, voice-change throttling. Logic lives in session/timeline/playback.
 */
import { useEffect, useRef, useState } from 'react'
import { ttsBridge } from '@/platform'
import type { FoliateEngine, TtsSentence } from '@/reading'
import { occupySpeaker } from '@/lib/audio'
import { toast } from '@/lib/toast'
import { TTS_HIGHLIGHT_INK } from '../constants'
import { type AudioClipPlayer, createAudioClipPlayer } from './audioClipPlayer'
import { sameDisplayedPlayback } from './playback'
import { createTtsSession, type SessionSentence, type TtsSession, type TtsSnapshot } from './session'
import { type CalibrationMap, isSpeakable } from './timeline'
import {
  readTtsLocation,
  readTtsRate,
  readTtsVoice,
  storeTtsLocation,
  storeTtsRate,
  storeTtsVoice,
} from './ttsMemory'
import { findVoice } from './voices'

/**
 * Grace period after explicit jumps (chapter change / start from highlight / back to reading position):
 * relocates during loading and page animation don't count as detaching. Per-sentence follow does NOT
 * stamp it: otherwise with short sentences (esp. at high speed) manual page turns would always fall
 * inside the window and detach would never trigger.
 */
const SELF_NAV_GRACE_MS = 2000
/** Voice-change throttle: rapid clicks only re-synthesize with the last choice. */
const VOICE_DEBOUNCE_MS = 300

export interface TtsSessionHandle {
  active: boolean
  /** starting and playing both count as playing (optimistic start: shows pause icon while synthesizing). */
  playing: boolean
  elapsed: number
  duration: number
  bufferedFraction: number
  repeating: boolean
  rate: number
  /** Current voice id (for the full player's selection). */
  voiceId: string
  /** User manually paged away from the reading position (shows "Back to reading position"). */
  detached: boolean
  toggleTts(): void
  startFromSelection(): void
  startFromCfi(cfi: string): void
  togglePlay(): void
  prevSentence(): void
  nextSentence(): void
  seek(seconds: number): void
  setRate(rate: number): void
  setVoice(voiceId: string): void
  toggleRepeat(): void
  returnToTtsLocation(): void
  stop(): void
}

export function useTtsSession(engine: FoliateEngine | null, bookHash: string): TtsSessionHandle {
  const [active, setActive] = useState(false)
  const [snap, setSnap] = useState<TtsSnapshot | null>(null)
  const [detached, setDetached] = useState(false)
  const [voiceId, setVoiceId] = useState(readTtsVoice)
  /** Rate reported when there's no session. Read device memory once (lazy init), not on every render. */
  const [idleRate, setIdleRate] = useState(readTtsRate)

  const coreRef = useRef<TtsSession | null>(null)
  const audioRef = useRef<AudioClipPlayer | null>(null)
  const sentencesRef = useRef<TtsSentence[]>([])
  const indexRef = useRef(0)
  /** Per-voice rate calibration: survives chapters and sessions (in-memory). */
  const calibrationRef = useRef<CalibrationMap>(new Map())
  const selectionActiveRef = useRef(false)
  const lastSelfNavRef = useRef(0)
  const detachedRef = useRef(false)
  detachedRef.current = detached
  const voiceIdRef = useRef(voiceId)
  voiceIdRef.current = voiceId
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Last snapshot actually committed to React (throttle baseline, see handleSnapshot). */
  const shownRef = useRef<TtsSnapshot | null>(null)

  // ── Session actions are plain functions exposed via a latest-ref so core callbacks see fresh
  // state/props (core callbacks don't change during a session) ──

  /** Drop the current session's core and audio port plus its throttle baseline (switching / teardown). */
  const disposeCore = (): void => {
    coreRef.current?.dispose()
    coreRef.current = null
    audioRef.current?.dispose()
    audioRef.current = null
    shownRef.current = null
  }

  const teardown = (): void => {
    if (voiceTimerRef.current) {
      clearTimeout(voiceTimerRef.current)
      voiceTimerRef.current = null
    }
    disposeCore()
    sentencesRef.current = []
    engine?.ttsClearHighlight()
    setActive(false)
    setSnap(null)
    setDetached(false)
  }

  /** Draw the sentence highlight. Pure overlay, doesn't touch the selection. */
  const highlightSentence = (i: number): void => {
    const s = sentencesRef.current[i]
    if (!engine || !s) return
    engine.ttsHighlight(s.range, TTS_HIGHLIGHT_INK)
  }

  /** Auto page-follow (skipped when detached / selection-protected). No grace stamp: see SELF_NAV_GRACE_MS. */
  const follow = (range: Range): void => {
    if (!engine || detachedRef.current || selectionActiveRef.current) return
    engine.ttsFollow(range)
  }

  const handleSentenceChange = (i: number): void => {
    indexRef.current = i
    const s = sentencesRef.current[i]
    if (!engine || !s) return
    // Read-aloud position ≠ reading progress: anchor stored separately (device memory), not saveProgress
    const cfi = engine.ttsRangeCfi(s.sectionIndex, s.range)
    if (cfi) storeTtsLocation(bookHash, cfi)
    highlightSentence(i)
    follow(s.range)
  }

  const handleSnapshot = (s: TtsSnapshot): void => {
    // Snapshots arrive per rAF (~60Hz), but most frames look identical; only commit visible changes.
    // Highlight is sentence-level and redrawn only in onSentenceChange.
    if (!sameDisplayedPlayback(shownRef.current, s)) {
      shownRef.current = s
      setSnap(s)
    }
  }

  /** Hit a chapter boundary: continue into the next chapter (keeping play/pause); end of book ends the session. */
  const handleBoundary = (dir: 'next' | 'prev'): void => {
    void (async () => {
      const core = coreRef.current
      if (!engine || !core) return
      const wasPlaying = core.snapshot().status !== 'paused'
      const target = engine.ttsSectionIndex() + (dir === 'next' ? 1 : -1)
      if (target < 0) return // before the first chapter: stay put
      if (target >= engine.ttsSectionCount()) {
        toast.info('Finished the last chapter')
        teardown() // session end: one of the only exits (can't infer end from play state)
        return
      }
      lastSelfNavRef.current = Date.now()
      const ok = await engine.ttsGoToSection(target)
      const sentences = ok ? enumerate() : []
      if (!ok || !sentences.length) {
        toast.warning("Couldn't open the next chapter. Read aloud stopped.")
        teardown()
        return
      }
      openSession(sentences, dir === 'next' ? 0 : sentences.length - 1, wasPlaying)
    })()
  }

  const latest = useRef({ teardown, handleSentenceChange, handleSnapshot, handleBoundary })
  latest.current = { teardown, handleSentenceChange, handleSnapshot, handleBoundary }

  /** Enumerate readable sentences of the main visible chapter (symbol-only ones filtered; shared with highlight/timeline). */
  const enumerate = (): TtsSentence[] => {
    if (!engine) return []
    return engine.ttsEnumerate().filter((s) => isSpeakable(s.text))
  }

  /** Create a session (show player first, synthesize async = optimistic start; core onError rolls back with a message). */
  const openSession = (sentences: TtsSentence[], startIndex: number, playing: boolean): void => {
    disposeCore()
    sentencesRef.current = sentences
    const audio = createAudioClipPlayer()
    audioRef.current = audio
    const items: SessionSentence[] = sentences.map((s) => ({
      text: s.text,
      blockIndex: s.blockIndex,
    }))
    coreRef.current = createTtsSession({
      sentences: items,
      startIndex,
      rate: readTtsRate(),
      // Voice is independent of content language: the whole chapter uses the selected voice
      voice: voiceIdRef.current,
      calibration: calibrationRef.current,
      synth: async (text, voice) => {
        const v = findVoice(voice)
        return ttsBridge.synthesize({ lang: v?.locale ?? 'en-US', text, voice, rate: 1 })
      },
      audio,
      callbacks: {
        onSnapshot: (s) => latest.current.handleSnapshot(s),
        onSentenceChange: (i) => latest.current.handleSentenceChange(i),
        onBoundary: (d) => latest.current.handleBoundary(d),
        onError: (msg) => {
          toast.warning(msg)
          latest.current.teardown()
        },
      },
    })
    setActive(true)
    setDetached(false)
    coreRef.current.start(!playing)
  }

  /**
   * Anchor → start sentence: the last sentence whose start ≤ the anchor start. Don't flip it: taking
   * "first ≥" jumps to the next sentence whenever the selected word isn't the first word.
   */
  const pickIndexAtRange = (sentences: TtsSentence[], anchor: Range): number => {
    let idx = 0
    for (let i = 0; i < sentences.length; i++) {
      if (anchor.compareBoundaryPoints(Range.START_TO_START, sentences[i]!.range) >= 0) idx = i
      else break
    }
    return idx
  }

  /** Toggle start branch: resume from the anchor if still on the visible page, else from the top of the page. */
  const startFromToggle = (): void => {
    if (!engine) return
    const sentences = enumerate()
    if (!sentences.length) {
      toast.info(engine.isFixedLayout ? 'Read aloud isn’t supported for this layout' : 'No readable text in this chapter')
      return
    }
    const savedCfi = readTtsLocation(bookHash)
    const resolved = savedCfi ? engine.ttsResolveCfiRange(savedCfi) : null
    // Anchor still on the visible page → resume from it; else the page's first sentence (or chapter start).
    const startIndex =
      resolved &&
      resolved.sectionIndex === engine.ttsSectionIndex() &&
      engine.ttsRangeVisible(resolved.range)
        ? pickIndexAtRange(sentences, resolved.range)
        : Math.max(0, sentences.findIndex((s) => engine.ttsRangeVisible(s.range)))
    openSession(sentences, startIndex, true)
  }

  const startFromSelection = (): void => {
    if (!engine) return
    const sel = engine.ttsSelectionRange()
    if (!sel) return
    const sentences = enumerate()
    if (!sentences.length) return
    const startIndex = pickIndexAtRange(sentences, sel.range)
    engine.clearSelection() // selection only sets the start point; clear after starting
    openSession(sentences, startIndex, true)
  }

  /** Start reading from a highlight (CFI) (edit-mode entry in the selection popup, no live selection). */
  const startFromCfi = (cfi: string): void => {
    if (!engine) return
    void (async () => {
      let resolved = engine.ttsResolveCfiRange(cfi)
      if (!resolved) {
        toast.warning("Couldn't locate this highlight")
        return
      }
      if (resolved.sectionIndex !== engine.ttsSectionIndex()) {
        lastSelfNavRef.current = Date.now()
        if (!(await engine.ttsGoToSection(resolved.sectionIndex))) return
        resolved = engine.ttsResolveCfiRange(cfi) // old range belongs to the previous document; re-resolve
        if (!resolved) return
      }
      const sentences = enumerate()
      if (!sentences.length) return
      openSession(sentences, pickIndexAtRange(sentences, resolved.range), true)
    })()
  }

  /** Back to reading position: scroll to the live range; if the chapter is unloaded, jump via the anchor CFI. */
  const returnToTtsLocation = (): void => {
    if (!engine) return
    lastSelfNavRef.current = Date.now()
    const s = sentencesRef.current[indexRef.current]
    if (s?.range.startContainer.ownerDocument?.defaultView) {
      engine.ttsFollow(s.range)
    } else {
      const cfi = readTtsLocation(bookHash)
      if (cfi) void engine.goTo(cfi)
    }
    setDetached(false)
  }

  const setVoice = (id: string): void => {
    if (!findVoice(id)) return
    setVoiceId(id) // immediate UI feedback
    storeTtsVoice(id)
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current)
    voiceTimerRef.current = setTimeout(() => {
      coreRef.current?.setVoice(id) // re-synthesize current sentence; throttled
    }, VOICE_DEBOUNCE_MS)
  }

  // ── Subscriptions: detach detection / selection protection / teardown on book or engine change ──

  // Manual page detach: after relocate, current sentence visible → keep/restore follow; not visible and outside grace → detach.
  useEffect(() => {
    if (!engine || !active) return
    return engine.onRelocate(() => {
      const s = sentencesRef.current[indexRef.current]
      if (!s) return
      if (engine.ttsRangeVisible(s.range)) {
        setDetached(false)
        return
      }
      if (Date.now() - lastSelfNavRef.current < SELF_NAV_GRACE_MS) return
      setDetached(true)
    })
  }, [engine, active])

  // Selection protection: with a selection, follow is skipped so the lookup popup's page isn't turned away;
  // highlight is unaffected (pure overlay, doesn't touch the native selection).
  useEffect(() => {
    if (!engine) return
    return engine.onSelect((sel) => {
      selectionActiveRef.current = sel !== null
    })
  }, [engine])

  // Single-voice rule: register as the speaker owner during the session; a pronunciation clip pauses reading
  // (UI shows paused) and it auto-resumes after; logic lives in session.interrupt/resumeInterrupted.
  useEffect(() => {
    if (!active) return
    return occupySpeaker({
      interrupt: () => coreRef.current?.interrupt(),
      resume: () => coreRef.current?.resumeInterrupted(),
    })
  }, [active])

  // Book change / engine rebuild / unmount: stop on close (no background playback).
  useEffect(() => {
    return () => latest.current.teardown()
  }, [engine, bookHash])

  return {
    active,
    playing: snap?.status === 'playing' || snap?.status === 'starting',
    elapsed: snap?.elapsed ?? 0,
    duration: snap?.duration ?? 0,
    bufferedFraction: snap?.bufferedFraction ?? 0,
    repeating: snap?.repeating ?? false,
    rate: snap?.rate ?? idleRate,
    voiceId,
    detached,
    toggleTts: () => {
      // The footer read-aloud button toggles: start when idle, stop when reading
      if (coreRef.current) latest.current.teardown()
      else startFromToggle()
    },
    startFromSelection,
    startFromCfi,
    togglePlay: () => coreRef.current?.toggle(),
    prevSentence: () => coreRef.current?.prev(),
    nextSentence: () => coreRef.current?.next(),
    seek: (seconds) => coreRef.current?.seekTo(seconds),
    setRate: (rate) => {
      storeTtsRate(rate)
      setIdleRate(rate)
      coreRef.current?.setRate(rate)
    },
    setVoice,
    toggleRepeat: () => {
      const core = coreRef.current
      if (core) core.setRepeating(!core.snapshot().repeating)
    },
    returnToTtsLocation,
    stop: () => latest.current.teardown(),
  }
}
