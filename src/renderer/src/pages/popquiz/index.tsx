import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PenLine, Volume2, X } from 'lucide-react'
import { appBridge } from '@/platform'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import * as practice from '@/practice'
import * as dict from '@/dict'
import { getSettings } from '@/settings'
import { Button } from '@/components/ui'
import { WriteBack } from '@/components/practice/WriteBack'
import { speechUrl } from '../../../../shared/speech'

/**
 * Pop quiz card (its own small window, bottom-right; see main/popQuiz.ts). A short round of your words, one after
 * another, three meanings each: pick the right one. A little sprout reacts (blooms / droops). Each answer is a real
 * review; ignoring the card closes it after a while with no penalty.
 *
 * After the round it can turn into Write back (Settings → Reminders → After a pop quiz): use the same words in a
 * sentence of your own and get feedback. With ChatGPT or a Custom API the situation is prepared once you answer the
 * first word, so it is ready when the round ends; on Lượm (Free), whose answers per day are limited, it is written
 * only when you choose to write. A quiz you ignore costs nothing.
 */

const IDLE_CLOSE_MS = 45_000
const AFTER_RIGHT_MS = 1_800

type Mood = 'idle' | 'happy' | 'sad'
/** quiz = the round; offer = round over, Write back offered; practice = Write back. */
type Mode = 'quiz' | 'offer' | 'practice'
type Prepared = { words: practice.PracticeWord[]; situation: Promise<practice.Situation> }
type QuizWord = { dictId: number; term: string; meaning: string }

export default function PopQuiz(): React.JSX.Element {
  const [params] = useSearchParams()
  const ids = useMemo(
    () =>
      (params.get('ids') ?? params.get('dictId') ?? '')
        .split(',')
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    [params],
  )
  /** Changes on every opening (main adds a nonce), even for the same words. */
  const opening = params.toString()
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [words, setWords] = useState<QuizWord[]>([])
  const [index, setIndex] = useState(0)
  const [pool, setPool] = useState<{ dictId: number; meaning: string }[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [remembered, setRemembered] = useState(0)
  const [mode, setMode] = useState<Mode>('quiz')
  const [after, setAfter] = useState<'ask' | 'always' | 'never'>('never')
  /** Prepare Write back while the round runs (not on Lượm (Free): its daily answers are limited). */
  const [prepareEarly, setPrepareEarly] = useState(false)
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const preparing = useRef<Promise<Prepared> | null>(null)
  const word = words[index] ?? null
  const isLast = index >= words.length - 1

  // Transparent window: the rounded card floats on the desktop.
  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
  }, [])

  // The window follows the card's natural height, so long meanings never push an option out of view.
  useEffect(() => {
    const el = frame.current
    if (!el) return
    // The frame is capped at the window height; add what the scrolling part hides to get the natural height.
    const scroller = (): HTMLElement | null => (mode === 'practice' ? el.querySelector<HTMLElement>('[data-scroll]') : list.current)
    const measure = (): void => {
      const s = scroller()
      void appBridge.fitPopQuiz(el.offsetHeight + (s ? s.scrollHeight - s.clientHeight : 0))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    const options = list.current
    if (mode !== 'practice' && options) {
      // The list itself shrinks when the header grows; its content is new for every word.
      observer.observe(options)
      if (options.firstElementChild) observer.observe(options.firstElementChild)
    }
    // Write back grows as the conversation does.
    const mutations = new MutationObserver(measure)
    if (mode === 'practice') mutations.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [word?.dictId, mode])

  // New opening: forget the previous round (and its pending step) before the new words load.
  useEffect(() => {
    let alive = true
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setPicked(null)
    setIndex(0)
    setRemembered(0)
    setWords([])
    setMode('quiz')
    setPrepared(null)
    preparing.current = null
    void Promise.all([getSettings(), dict.aiReady()]).then(([settings, ready]) => {
      if (!alive) return
      setAfter(ready ? settings.afterPopQuiz : 'never')
      setPrepareEarly(settings.aiProvider !== 'luom')
    })
    void Promise.all([wordbook.meaningsOf(ids), wordbook.quizPool(40).catch(() => [])]).then(([own, extra]) => {
      if (!alive) return // a newer opening replaced this one
      const byId = new Map(own.map((w) => [w.dictId, w]))
      const round = ids.map((id) => byId.get(id)).filter((w): w is QuizWord => w != null)
      setWords(round)
      setPool(extra)
      if (round.length === 0) void appBridge.closePopQuiz()
    })
    return () => {
      alive = false
    }
  }, [ids, opening])

  const choices = useMemo(
    () => (word ? wordbook.buildChoices({ dictId: word.dictId, meaning: word.meaning }, pool, 3) : []),
    [word, pool],
  )

  // Ignored: go away quietly (never in the middle of writing).
  useEffect(() => {
    if (mode === 'practice' || (mode === 'quiz' && picked !== null)) return
    const t = setTimeout(() => void appBridge.closePopQuiz(), IDLE_CLOSE_MS)
    return () => clearTimeout(t)
  }, [picked, index, opening, mode])

  /** Write the situation for this round's words in the background (once). */
  const prepare = (): Promise<Prepared> => {
    preparing.current ??= practice.practiceWordsFor(words.map((w) => w.dictId)).then((ws) => {
      const situation = practice.situationFor(ws)
      situation.catch(() => {}) // shown by Write back if it is opened
      return { words: ws, situation }
    })
    return preparing.current
  }

  const startPractice = (): void => {
    void prepare()
      .then((p) => {
        setPrepared(p)
        setMode('practice')
        void appBridge.practicePopQuiz()
      })
      .catch(() => void appBridge.closePopQuiz())
  }

  /** On to the next word of the round; after the last one, Write back (offered, or straight away) or close. */
  const next = (): void => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (isLast) {
      if (after === 'always') startPractice()
      else if (after === 'ask') setMode('offer')
      else void appBridge.closePopQuiz()
      return
    }
    setPicked(null)
    setIndex((i) => i + 1)
  }

  const answer = (k: number): void => {
    if (picked !== null || !word) return
    setPicked(k)
    const right = choices[k]?.correct === true
    if (right) setRemembered((n) => n + 1)
    // Engaged with the round: get the Write back situation ready for its end.
    if (after !== 'never' && prepareEarly) void prepare().catch(() => {})
    void wordbook.quickRate(word.dictId, right ? 'good' : 'again').then(() => appBridge.wordsChanged())
    if (right) advanceTimer.current = setTimeout(next, AFTER_RIGHT_MS)
  }

  const mood: Mood = picked === null ? 'idle' : choices[picked]?.correct ? 'happy' : 'sad'
  /** After the last word of a round: how it went. */
  const tally = words.length > 1 && isLast && picked !== null ? `${remembered} of ${words.length} remembered this round.` : ''

  if (mode === 'practice' && prepared)
    return (
      <div ref={frame} className="flex max-h-screen w-screen flex-col p-2">
        <style>{POP_FX}</style>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-border bg-surface-popover text-text-primary shadow-popover">
          <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3 [-webkit-app-region:drag]">
            <PenLine className="size-4 text-text-accent" />
            <p className="flex-1 text-sm font-semibold">Write back</p>
            <button
              type="button"
              aria-label="Close"
              className="rounded-md p-1 text-text-muted hover:text-text-primary [-webkit-app-region:no-drag]"
              onClick={() => void appBridge.closePopQuiz()}
            >
              <X className="size-4" />
            </button>
          </div>
          <WriteBack
            compact
            words={prepared.words}
            initialSituation={prepared.situation}
            onClose={() => void appBridge.closePopQuiz()}
            onDone={() => {
              void appBridge.wordsChanged()
              void appBridge.closePopQuiz()
            }}
          />
        </div>
      </div>
    )

  return (
    <div ref={frame} className="envi-pop-in flex max-h-screen w-screen flex-col p-2">
      <style>{POP_FX}</style>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-border bg-surface-popover text-text-primary shadow-popover">
        <div className="flex shrink-0 items-start gap-3 px-4 pt-4 [-webkit-app-region:drag]">
          <Sprout key={index} mood={mood} />
          <div key={word?.dictId ?? 0} className="envi-word-in min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={cn('line-clamp-2 break-words font-serif font-bold leading-tight text-text-primary', (word?.term.length ?? 0) > 14 ? 'text-lg' : 'text-2xl')}>{word?.term ?? ''}</p>
              {word && (
                <button
                  type="button"
                  aria-label="Play pronunciation"
                  className="shrink-0 rounded-md p-1 text-text-muted hover:text-text-primary [-webkit-app-region:no-drag]"
                  onClick={() => void playAudioUrl(speechUrl(word.term, 'us'))}
                >
                  <Volume2 className="size-4" />
                </button>
              )}
            </div>
            <p className={cn(mood === 'happy' ? 'text-xs font-semibold text-text-success' : mood === 'sad' ? 'text-xs font-semibold text-text-danger' : 'font-hand text-base leading-tight text-text-accent')}>
              {mood === 'happy'
                ? tally || 'You remembered it.'
                : mood === 'sad'
                  ? tally || 'Almost. Here is the right one.'
                  : 'Pop quiz: what does it mean?'}
            </p>
          </div>
          {words.length > 1 && (
            <span className="mt-1.5 shrink-0 text-xs font-medium tabular-nums text-text-muted" aria-label={`Word ${index + 1} of ${words.length}`}>
              {index + 1}/{words.length}
            </span>
          )}
          <button
            type="button"
            aria-label="Close"
            className="rounded-md p-1 text-text-muted hover:text-text-primary [-webkit-app-region:no-drag]"
            onClick={() => void appBridge.closePopQuiz()}
          >
            <X className="size-4" />
          </button>
        </div>
        <div ref={list} className="mt-3 min-h-0 overflow-y-auto px-4 pb-4">
          {mode === 'offer' ? (
            <div className="envi-word-in space-y-3">
              <p className="text-sm text-text-secondary">
                Now use {words.length > 1 ? 'these words' : 'it'} in a sentence of your own? You’ll get feedback on how
                natural it sounds.
              </p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => void appBridge.closePopQuiz()}>
                  Not now
                </Button>
                <Button size="sm" className="gap-1.5" onClick={startPractice}>
                  <PenLine className="size-3.5" />
                  Write a sentence
                </Button>
              </div>
            </div>
          ) : (
            <div key={word?.dictId ?? 0} className="envi-word-in flex flex-col gap-1.5">
              {choices.map((c, k) => {
                const state = picked === null ? 'idle' : c.correct ? 'right' : k === picked ? 'wrong' : 'dim'
                return (
                  <button
                    key={c.text}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => answer(k)}
                    className={cn(
                      'rounded-[12px] border px-3 py-2 text-left text-sm transition-colors',
                      state === 'idle' && 'border-border bg-surface-2 hover:border-border-strong',
                      state === 'right' && 'border-border-success bg-bg-success text-text-success',
                      state === 'wrong' && 'envi-shake border-border-danger bg-bg-danger text-text-danger',
                      state === 'dim' && 'border-border bg-surface-2 opacity-50',
                    )}
                  >
                    {c.text}
                  </button>
                )
              })}
              {mood === 'sad' && (
                <button type="button" className="mt-1 self-end text-xs font-semibold text-text-accent" onClick={next}>
                  {isLast ? 'Got it, it will come back soon' : 'Got it, next word'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Tiny sprout mascot: sways while waiting, blooms when right, droops when wrong. */
function Sprout({ mood }: { mood: Mood }): React.JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-12 shrink-0', `envi-sprout-${mood}`)} aria-hidden>
      <ellipse cx="24" cy="43" rx="13" ry="3.5" fill="#d8b98a" />
      <g className="envi-sprout-plant" style={{ transformOrigin: '24px 42px' }}>
        <path d="M24 42 C24 34 24 28 24 22" stroke="#3d8c6d" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M24 30 C17 30 13 25 13 20 C19 20 24 24 24 30 Z" fill={mood === 'sad' ? '#b4b874' : '#4cb187'} />
        <path d="M24 26 C31 26 35 21 35 16 C29 16 24 20 24 26 Z" fill={mood === 'sad' ? '#b4b874' : '#4cb187'} />
        <g className="envi-bloom" style={{ transformOrigin: '24px 18px' }}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="24" cy="12.5" rx="3.2" ry="5" fill="#ff9eaa" transform={`rotate(${a} 24 18)`} />
          ))}
          <circle cx="24" cy="18" r="3" fill="#ffd34d" />
        </g>
      </g>
    </svg>
  )
}

const POP_FX = `
@keyframes envi-pop-in { from { opacity: 0; transform: translateY(24px) scale(.96) } to { opacity: 1; transform: none } }
.envi-pop-in { animation: envi-pop-in 380ms cubic-bezier(.16,1,.3,1) both }
@keyframes envi-sway { 0%, 100% { transform: rotate(-5deg) } 50% { transform: rotate(5deg) } }
.envi-sprout-idle .envi-sprout-plant { animation: envi-sway 2.4s ease-in-out infinite }
.envi-bloom { transform: scale(0); transition: transform 500ms cubic-bezier(.16,1,.3,1) }
.envi-sprout-happy .envi-bloom { transform: scale(1) }
.envi-sprout-happy .envi-sprout-plant { animation: envi-sway 1s ease-in-out 2 }
.envi-sprout-sad .envi-sprout-plant { transform: rotate(14deg); transition: transform 400ms ease }
@keyframes envi-shake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 50% { transform: translateX(4px) } 75% { transform: translateX(-2px) } }
.envi-shake { animation: envi-shake 340ms ease-in-out }
@keyframes envi-word-in { from { opacity: 0; transform: translateX(10px) } to { opacity: 1; transform: none } }
.envi-word-in { animation: envi-word-in 240ms cubic-bezier(.16,1,.3,1) both }
@media (prefers-reduced-motion: reduce) { .envi-pop-in, .envi-sprout-plant, .envi-shake, .envi-word-in { animation: none !important } }
`
