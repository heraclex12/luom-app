import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import type { PoolWord } from './common'
import { formatTime, GameFlow, Kbd, Stat, useReducedMotion, type GameResult } from './shell'
import {
  answer,
  dealCard,
  LIGHTNING_MS,
  lightningDeck,
  lightningXp,
  multiplierFor,
  startLightning,
  tick,
  type LightningState,
} from './lightning'

/** Lightning: 60 s of "does this meaning fit?" Rules in ./lightning. */
export default function LightningPage(): React.JSX.Element {
  return (
    <GameFlow id="lightning" build={lightningDeck} play={(deck, finish) => <Game deck={deck} onFinish={finish} />} />
  )
}

/** Clock resolution: React re-renders at most 10 times a second. */
const TICK_MS = 100

function Game({ deck, onFinish }: { deck: PoolWord[]; onFinish: (r: GameResult) => void }): React.JSX.Element {
  const reduced = useReducedMotion()
  const ref = useRef<LightningState>(startLightning(dealCard(deck)))
  const [s, setS] = useState(ref.current)
  const update = useCallback((fn: (x: LightningState) => LightningState) => {
    ref.current = fn(ref.current)
    setS(ref.current)
  }, [])

  useEffect(() => {
    let last = performance.now()
    const t = setInterval(() => {
      const now = performance.now()
      update((x) => tick(x, now - last))
      last = now
    }, TICK_MS)
    return () => clearInterval(t)
  }, [update])

  const respond = useCallback(
    (saysTrue: boolean) => update((x) => answer(x, saysTrue, dealCard(deck, Math.random, x.card.dictId))),
    [deck, update],
  )

  useEffect(() => {
    if (s.done) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const k = e.key.toLowerCase()
      if (k === 'arrowleft' || k === 'f') respond(false)
      else if (k === 'arrowright' || k === 'j') respond(true)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.done, respond])

  useEffect(() => {
    if (!s.done) return
    onFinish({
      score: s.score,
      xp: lightningXp(s),
      stats: [
        { label: 'Correct', value: `${s.correct} / ${s.total}` },
        { label: 'Accuracy', value: s.total ? `${Math.round((s.correct / s.total) * 100)}%` : '0%' },
        { label: 'Best streak', value: String(s.bestStreak) },
      ],
    })
  }, [s, onFinish])

  const mult = multiplierFor(s.streak)
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div
          className="h-0.5 origin-left bg-fill-brand"
          style={{
            transform: `scaleX(${s.timeLeftMs / LIGHTNING_MS})`,
            transition: reduced ? undefined : `transform ${TICK_MS}ms linear`,
          }}
          aria-hidden
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Stat label="Time" value={formatTime(s.timeLeftMs + 999)} />
          <Stat label="Score" value={s.score} />
          <Stat label="Streak" value={s.streak} />
          {mult > 1 && <span className="text-sm font-medium tabular-nums text-text-primary">{mult}x points</span>}
          <span key={s.feedback?.n} className="ml-auto text-sm" aria-live="polite">
            {s.feedback &&
              (s.feedback.correct ? (
                <span className="text-text-success">Right</span>
              ) : (
                <span className="text-text-danger">Wrong</span>
              ))}
          </span>
        </div>
      </div>

      <div className="space-y-4 py-6 text-center">
        <p className="text-5xl font-semibold tracking-tight text-text-primary">{s.card.term}</p>
        <p className="text-2xl leading-snug text-text-secondary">{s.card.meaning}</p>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        <AnswerButton onClick={() => respond(false)} label="Does not match" keys={['F']} icon={<ArrowLeft />} />
        <AnswerButton onClick={() => respond(true)} label="Matches" keys={['J']} icon={<ArrowRight />} iconAfter />
      </div>
    </div>
  )
}

function AnswerButton({
  onClick,
  label,
  keys,
  icon,
  iconAfter = false,
}: {
  onClick: () => void
  label: string
  keys: string[]
  icon: React.ReactNode
  iconAfter?: boolean
}): React.JSX.Element {
  return (
    <Button variant="secondary" size="lg" className="h-14 gap-2" onClick={onClick} tabIndex={-1}>
      {!iconAfter && icon}
      <span>{label}</span>
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
      {iconAfter && icon}
    </Button>
  )
}
