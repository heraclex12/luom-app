import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Volume2, X } from 'lucide-react'
import { appBridge } from '@/platform'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../shared/speech'

/**
 * Pop quiz card (its own small window, bottom-right; see main/popQuiz.ts). One of your words, three meanings:
 * pick the right one. A little sprout reacts (blooms / droops). The answer is a real review; ignoring the card
 * closes it after a while with no penalty.
 */

const IDLE_CLOSE_MS = 45_000
const AFTER_RIGHT_MS = 1_800

type Mood = 'idle' | 'happy' | 'sad'

export default function PopQuiz(): React.JSX.Element {
  const [params] = useSearchParams()
  const dictId = Number(params.get('dictId'))
  const [word, setWord] = useState<{ term: string; meaning: string } | null>(null)
  const [pool, setPool] = useState<{ dictId: number; meaning: string }[]>([])
  const [picked, setPicked] = useState<number | null>(null)

  // Transparent window: the rounded card floats on the desktop.
  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
  }, [])

  useEffect(() => {
    setPicked(null)
    void Promise.all([wordbook.meaningsOf([dictId]), wordbook.quizPool(40).catch(() => [])]).then(([own, extra]) => {
      setWord(own[0] ?? null)
      setPool(extra)
      if (!own[0]) void appBridge.closePopQuiz()
    })
  }, [dictId])

  const choices = useMemo(
    () => (word ? wordbook.buildChoices({ dictId, meaning: word.meaning }, pool, 3) : []),
    [word, pool, dictId],
  )

  // Ignored: go away quietly.
  useEffect(() => {
    if (picked !== null) return
    const t = setTimeout(() => void appBridge.closePopQuiz(), IDLE_CLOSE_MS)
    return () => clearTimeout(t)
  }, [picked, dictId])

  const answer = (k: number): void => {
    if (picked !== null) return
    setPicked(k)
    const right = choices[k]?.correct === true
    void wordbook.quickRate(dictId, right ? 'good' : 'again').then(() => appBridge.wordsChanged())
    if (right) setTimeout(() => void appBridge.closePopQuiz(), AFTER_RIGHT_MS)
  }

  const mood: Mood = picked === null ? 'idle' : choices[picked]?.correct ? 'happy' : 'sad'

  return (
    <div className="envi-pop-in h-screen w-screen p-2">
      <style>{POP_FX}</style>
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-200 bg-surface-popover shadow-popover">
        <div className="flex items-start gap-3 px-4 pt-4 [-webkit-app-region:drag]">
          <Sprout mood={mood} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-accent">
              {mood === 'happy' ? 'You remembered' : mood === 'sad' ? 'Almost' : 'Pop quiz'}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <p className="truncate font-serif text-2xl font-semibold text-text-primary">{word?.term ?? ''}</p>
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
            <p className="text-xs text-text-muted">What does it mean?</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="rounded-md p-1 text-text-muted hover:text-text-primary [-webkit-app-region:no-drag]"
            onClick={() => void appBridge.closePopQuiz()}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-1 flex-col gap-1.5 px-4 pb-4">
          {choices.map((c, k) => {
            const state = picked === null ? 'idle' : c.correct ? 'right' : k === picked ? 'wrong' : 'dim'
            return (
              <button
                key={c.text}
                type="button"
                disabled={picked !== null}
                onClick={() => answer(k)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
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
            <button
              type="button"
              className="mt-auto self-end text-xs font-semibold text-text-accent"
              onClick={() => void appBridge.closePopQuiz()}
            >
              Got it, it will come back soon
            </button>
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
.envi-pop-in { animation: envi-pop-in 380ms cubic-bezier(.2,.8,.3,1.1) both }
@keyframes envi-sway { 0%, 100% { transform: rotate(-5deg) } 50% { transform: rotate(5deg) } }
.envi-sprout-idle .envi-sprout-plant { animation: envi-sway 2.4s ease-in-out infinite }
.envi-bloom { transform: scale(0); transition: transform 500ms cubic-bezier(.2,.8,.3,1.4) }
.envi-sprout-happy .envi-bloom { transform: scale(1) }
.envi-sprout-happy .envi-sprout-plant { animation: envi-sway 1s ease-in-out 2 }
.envi-sprout-sad .envi-sprout-plant { transform: rotate(14deg); transition: transform 400ms ease }
@keyframes envi-shake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 50% { transform: translateX(4px) } 75% { transform: translateX(-2px) } }
.envi-shake { animation: envi-shake 340ms ease-in-out }
@media (prefers-reduced-motion: reduce) { .envi-pop-in, .envi-sprout-plant, .envi-shake { animation: none !important } }
`
