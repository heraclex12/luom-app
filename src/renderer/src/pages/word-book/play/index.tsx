import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Gamepad2, RotateCcw, Timer, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import { notifyWordsChanged } from '@/app'
import { getSettings } from '@/settings'
import * as wordbook from '@/wordbook'
import { speechUrl, type Accent } from '../../../../../shared/speech'
import { buildRound, initialMatch, isFinished, matchReducer, MIN_WORDS, type Round, type Side } from './game'
import { scoreGame, type GameScore } from './score'

/**
 * Matching game: pair 6 English words with their Vietnamese meanings. Correct pairs turn green, fade
 * out and are pronounced; wrong pairs shake red and break the combo. Rules live in ./game, XP in ./score.
 * Keys: 1–6 pick an English word, A–F pick a meaning.
 */

const LEFT_KEYS = ['1', '2', '3', '4', '5', '6']
const RIGHT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function PlayPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [round, setRound] = useState<Round | null | undefined>(undefined)
  const [gameKey, setGameKey] = useState(0)

  const newRound = useCallback(async () => {
    const pool = await wordbook.quizPool(60)
    setRound(buildRound(pool))
    setGameKey((k) => k + 1)
  }, [])
  useEffect(() => {
    void newRound()
  }, [newRound])

  return (
    <>
      <TopBar segments={['My words', 'Match game']} backTo="/wordbook" />
      <div className="mx-auto w-full max-w-3xl px-8 pb-12 pt-[6vh] lg:px-10">
        {round === undefined ? (
          <Card className="flex items-center justify-center py-16 text-sm text-text-muted">Loading…</Card>
        ) : round === null ? (
          <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-card bg-bg-neutral text-text-secondary">
              <Gamepad2 className="size-7" />
            </span>
            <div className="space-y-1">
              <h3 className="text-xl font-medium text-text-primary">Not enough words yet</h3>
              <p className="text-sm text-text-secondary">
                Add at least {MIN_WORDS} words with a Vietnamese meaning to My words to play.
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/wordbook/books')}>
              Add from word lists
            </Button>
          </Card>
        ) : (
          <Game key={gameKey} round={round} onPlayAgain={() => void newRound()} onBack={() => navigate('/wordbook')} />
        )}
      </div>
    </>
  )
}

function Game({
  round,
  onPlayAgain,
  onBack,
}: {
  round: Round
  onPlayAgain: () => void
  onBack: () => void
}): React.JSX.Element {
  const [state, dispatch] = useReducer(matchReducer, initialMatch)
  const byId = new Map(round.pairs.map((p) => [p.id, p]))
  const finished = isFinished(state, round.pairs.length)

  // Timer: starts when the round appears, stops when the last pair is matched.
  const startRef = useRef(performance.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (finished) {
      setElapsed(performance.now() - startRef.current)
      return
    }
    const t = setInterval(() => setElapsed(performance.now() - startRef.current), 250)
    return () => clearInterval(t)
  }, [finished])

  // Pronounce each matched word.
  const accentRef = useRef<Accent>('us')
  useEffect(() => {
    void getSettings().then((s) => (accentRef.current = s.accent))
  }, [])
  useEffect(() => {
    const p = round.pairs.find((x) => x.id === state.lastMatch)
    if (p) void playAudioUrl(speechUrl(p.term, accentRef.current))
  }, [state.lastMatch, round])

  // Wrong pair: shake both tiles, then clear the red state.
  const tiles = useRef(new Map<string, HTMLButtonElement>())
  useEffect(() => {
    if (!state.wrong) return
    const shake = [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' },
    ]
    for (const k of [`left:${state.wrong.left}`, `right:${state.wrong.right}`]) {
      tiles.current.get(k)?.animate(shake, { duration: 380, easing: 'ease-in-out' })
    }
    const t = setTimeout(() => dispatch({ type: 'clearWrong' }), 450)
    return () => clearTimeout(t)
  }, [state.wrong])

  // Finish: score once, record the game (quest + bonus XP), refresh progress elsewhere.
  const [score, setScore] = useState<GameScore | null>(null)
  const recorded = useRef(false)
  useEffect(() => {
    if (!finished || recorded.current) return
    recorded.current = true
    const s = scoreGame({
      pairs: round.pairs.length,
      mistakes: state.mistakes,
      maxCombo: state.maxCombo,
      elapsedMs: performance.now() - startRef.current,
    })
    setScore(s)
    void wordbook.recordGame(s.total).then(() => notifyWordsChanged())
  }, [finished, round.pairs.length, state.mistakes, state.maxCombo])

  // Keyboard: 1–6 left column, A–F right column.
  useEffect(() => {
    if (finished) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toUpperCase()
      const li = LEFT_KEYS.indexOf(k)
      const ri = RIGHT_KEYS.indexOf(k)
      if (li >= 0 && li < round.left.length) dispatch({ type: 'pick', side: 'left', id: round.left[li]! })
      else if (ri >= 0 && ri < round.right.length) dispatch({ type: 'pick', side: 'right', id: round.right[ri]! })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, round])

  if (finished && score) {
    return <EndScreen score={score} elapsedMs={elapsed} onPlayAgain={onPlayAgain} onBack={onBack} />
  }

  const tile = (side: Side, id: number, index: number): React.JSX.Element => {
    const p = byId.get(id)!
    const matched = state.matched.includes(id)
    const selected = (side === 'left' ? state.selLeft : state.selRight) === id
    const wrong = state.wrong !== null && (side === 'left' ? state.wrong.left : state.wrong.right) === id
    const key = side === 'left' ? LEFT_KEYS[index] : RIGHT_KEYS[index]
    return (
      <button
        key={id}
        ref={(el) => {
          const k = `${side}:${id}`
          if (el) tiles.current.set(k, el)
          else tiles.current.delete(k)
        }}
        type="button"
        disabled={matched}
        onClick={() => dispatch({ type: 'pick', side, id })}
        className={cn(
          'btn-squish flex min-h-14 w-full items-center gap-3 rounded-card px-4 py-3 text-left shadow-card-ring',
          matched
            ? 'pointer-events-none bg-bg-success-chip text-text-success opacity-0 transition-opacity delay-300 duration-300'
            : wrong
              ? 'bg-bg-danger-chip text-text-danger'
              : selected
                ? 'bg-bg-neutral text-text-primary outline-2 -outline-offset-2 outline-fill-primary'
                : 'bg-surface-1 text-text-primary transition-colors hover:bg-bg-200'
        )}
      >
        <kbd className="grid size-5 shrink-0 place-items-center rounded bg-bg-neutral text-[10px] font-medium text-text-muted">
          {key}
        </kbd>
        <span className={cn('min-w-0 flex-1', side === 'left' ? 'text-base font-medium' : 'text-sm leading-snug')}>
          {side === 'left' ? p.term : p.meaning}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Stat icon={Timer} label="Time" value={formatTime(elapsed)} />
        <Stat
          icon={Flame}
          label="Combo"
          value={`×${state.combo}`}
          highlight={state.combo >= 2}
        />
        <Stat icon={X} label="Mistakes" value={String(state.mistakes)} />
        <span className="ml-auto text-sm text-text-secondary">
          {state.matched.length} / {round.pairs.length} pairs
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="space-y-3">{round.left.map((id, i) => tile('left', id, i))}</div>
        <div className="space-y-3">{round.right.map((id, i) => tile('right', id, i))}</div>
      </div>

      <p className="text-center text-xs text-text-muted">
        Pick a word and its meaning · keys 1–{round.left.length} and A–{RIGHT_KEYS[round.right.length - 1]}
      </p>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  highlight?: boolean
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm shadow-card-ring transition-colors',
        highlight ? 'bg-fill-brand text-on-brand' : 'bg-surface-1 text-text-secondary'
      )}
      title={label}
    >
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
      <span className={cn('font-medium tabular-nums', !highlight && 'text-text-primary')}>{value}</span>
    </span>
  )
}

function EndScreen({
  score,
  elapsedMs,
  onPlayAgain,
  onBack,
}: {
  score: GameScore
  elapsedMs: number
  onPlayAgain: () => void
  onBack: () => void
}): React.JSX.Element {
  const bonuses = [
    { label: 'Pairs', xp: score.base },
    { label: 'Combo bonus', xp: score.comboBonus },
    { label: 'Speed bonus', xp: score.speedBonus },
    { label: 'Perfect round', xp: score.perfectBonus },
  ].filter((b) => b.xp > 0)
  return (
    <Card className="mx-auto flex max-w-md flex-col items-center gap-6 px-8 py-10 text-center">
      <div className="space-y-1">
        <div className="text-4xl" aria-hidden>
          {score.perfectBonus > 0 ? '🏆' : '🎉'}
        </div>
        <h2 className="text-2xl font-medium text-text-primary">Round complete</h2>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        <EndStat label="Time" value={formatTime(elapsedMs)} />
        <EndStat label="Accuracy" value={`${score.accuracy}%`} />
        <EndStat label="XP earned" value={`+${score.total}`} brand />
      </div>

      <ul className="w-full space-y-1 text-sm">
        {bonuses.map((b) => (
          <li key={b.label} className="flex justify-between text-text-secondary">
            <span>{b.label}</span>
            <span className="tabular-nums text-text-primary">+{b.xp}</span>
          </li>
        ))}
      </ul>

      <div className="flex w-full gap-3">
        <Button variant="secondary" size="lg" className="flex-1 justify-center" onClick={onBack}>
          Back
        </Button>
        <Button variant="brand" size="lg" className="flex-1 justify-center gap-2" onClick={onPlayAgain} autoFocus>
          <RotateCcw />
          Play again
        </Button>
      </div>
    </Card>
  )
}

function EndStat({ label, value, brand = false }: { label: string; value: string; brand?: boolean }): React.JSX.Element {
  return (
    <div className="rounded-card bg-bg-neutral px-2 py-3">
      <div className={cn('text-xl font-medium tabular-nums', brand ? 'text-brand-000' : 'text-text-primary')}>{value}</div>
      <div className="mt-0.5 text-xs text-text-secondary">{label}</div>
    </div>
  )
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
