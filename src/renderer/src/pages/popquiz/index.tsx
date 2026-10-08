import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Volume2, X } from 'lucide-react'
import { appBridge } from '@/platform'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../shared/speech'

/**
 * Pop quiz card (its own small window, bottom-right; see main/popQuiz.ts). A short round of your words, one after
 * another, three meanings each: pick the right one. A little sprout reacts (blooms / droops). Each answer is a real
 * review; ignoring the card closes it after a while with no penalty.
 */

const IDLE_CLOSE_MS = 45_000
const AFTER_RIGHT_MS = 1_800

type Mood = 'idle' | 'happy' | 'sad'
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
    const options = list.current
    if (!el || !options) return
    // The frame is capped at the window height; add what the options list hides to get the natural height.
    const observer = new ResizeObserver(
      () => void appBridge.fitPopQuiz(el.offsetHeight + options.scrollHeight - options.clientHeight),
    )
    // The list itself shrinks when the header grows; its content is new for every word.
    observer.observe(el)
    observer.observe(options)
    if (options.firstElementChild) observer.observe(options.firstElementChild)
    return () => observer.disconnect()
  }, [word?.dictId])

  // New opening: forget the previous round (and its pending step) before the new words load.
  useEffect(() => {
    let alive = true
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setPicked(null)
    setIndex(0)
    setRemembered(0)
    setWords([])
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

  // Ignored: go away quietly.
  useEffect(() => {
    if (picked !== null) return
    const t = setTimeout(() => void appBridge.closePopQuiz(), IDLE_CLOSE_MS)
    return () => clearTimeout(t)
  }, [picked, index, opening])

  /** On to the next word of the round, or close after the last one. */
  const next = (): void => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (isLast) {
      void appBridge.closePopQuiz()
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
    void wordbook.quickRate(word.dictId, right ? 'good' : 'again').then(() => appBridge.wordsChanged())
    if (right) advanceTimer.current = setTimeout(next, AFTER_RIGHT_MS)
  }

  const mood: Mood = picked === null ? 'idle' : choices[picked]?.correct ? 'happy' : 'sad'
  /** After the last word of a round: how it went. */
  const tally = words.length > 1 && isLast && picked !== null ? `${remembered} of ${words.length} remembered this round.` : ''

  return (
    <div ref={frame} className="envi-pop-in flex max-h-screen w-screen flex-col p-2">
      <style>{POP_FX}</style>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[8px] border border-border bg-surface-popover text-text-primary shadow-popover">
        <div className="flex shrink-0 items-start gap-3 px-4 pt-4 [-webkit-app-region:drag]">
          <Sprout key={index} mood={mood} />
          <div key={word?.dictId ?? 0} className="envi-word-in min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-serif text-2xl font-bold text-text-primary">{word?.term ?? ''}</p>
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
            <p className={cn('text-xs', mood === 'happy' ? 'font-semibold text-text-success' : mood === 'sad' ? 'font-semibold text-text-danger' : 'text-text-muted')}>
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
                    'rounded-[5px] border px-3 py-2 text-left text-sm transition-colors',
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
