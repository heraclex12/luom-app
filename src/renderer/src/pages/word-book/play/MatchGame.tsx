import { useEffect, useReducer, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { buildRound, initialMatch, isFinished, matchReducer, type Round, type Side } from './game'
import { scoreGame } from './score'
import { formatTime, GameFlow, Kbd, shake, Stat, useReducedMotion, useSpeak, type GameResult } from './shell'

/**
 * Matching game: pair 6 English words with their Vietnamese meanings. Correct pairs turn green, fade
 * out and are pronounced; wrong pairs shake red and break the combo. Rules live in ./game, XP in ./score.
 * Keys: 1-6 pick an English word, A-F pick a meaning.
 */

const LEFT_KEYS = ['1', '2', '3', '4', '5', '6']
const RIGHT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function MatchPage(): React.JSX.Element {
  return (
    <GameFlow id="match" build={(pool) => buildRound(pool)} play={(round, finish) => <Game round={round} onFinish={finish} />} />
  )
}

function Game({ round, onFinish }: { round: Round; onFinish: (r: GameResult) => void }): React.JSX.Element {
  const [state, dispatch] = useReducer(matchReducer, initialMatch)
  const byId = new Map(round.pairs.map((p) => [p.id, p]))
  const finished = isFinished(state, round.pairs.length)
  const reduced = useReducedMotion()
  const speak = useSpeak()

  // Timer: starts when the round appears, stops when the last pair is matched.
  const startRef = useRef(performance.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (finished) return
    const t = setInterval(() => setElapsed(performance.now() - startRef.current), 250)
    return () => clearInterval(t)
  }, [finished])

  useEffect(() => {
    const p = round.pairs.find((x) => x.id === state.lastMatch)
    if (p) speak(p.term)
  }, [state.lastMatch, round, speak])

  // Wrong pair: shake both tiles, then clear the red state.
  const tiles = useRef(new Map<string, HTMLButtonElement>())
  useEffect(() => {
    if (!state.wrong) return
    for (const k of [`left:${state.wrong.left}`, `right:${state.wrong.right}`]) shake(tiles.current.get(k) ?? null, reduced)
    const t = setTimeout(() => dispatch({ type: 'clearWrong' }), 450)
    return () => clearTimeout(t)
  }, [state.wrong, reduced])

  // Finish after the last tile has had a moment to fade.
  useEffect(() => {
    if (!finished) return
    const elapsedMs = performance.now() - startRef.current
    const s = scoreGame({ pairs: round.pairs.length, mistakes: state.mistakes, maxCombo: state.maxCombo, elapsedMs })
    const t = setTimeout(
      () =>
        onFinish({
          score: s.total,
          xp: s.total,
          stats: [
            { label: 'Time', value: formatTime(elapsedMs) },
            { label: 'Accuracy', value: `${s.accuracy}%` },
            { label: 'Best combo', value: String(state.maxCombo) },
          ],
        }),
      reduced ? 0 : 600,
    )
    return () => clearTimeout(t)
  }, [finished, round.pairs.length, state.mistakes, state.maxCombo, onFinish, reduced])

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
            ? 'pointer-events-none bg-bg-success text-text-success opacity-0 transition-opacity delay-300 duration-300 motion-reduce:transition-none'
            : wrong
              ? 'bg-bg-danger text-text-danger'
              : selected
                ? 'bg-surface-2 text-text-primary outline-2 -outline-offset-2 outline-fill-brand'
                : 'bg-surface-1 text-text-primary transition-colors hover:bg-surface-2'
        )}
      >
        <Kbd>{key}</Kbd>
        <span className={cn('min-w-0 flex-1', side === 'left' ? 'text-base font-medium' : 'text-sm leading-snug')}>
          {side === 'left' ? p.term : p.meaning}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stat label="Time" value={formatTime(elapsed)} />
        <Stat label="Combo" value={state.combo} />
        <Stat label="Mistakes" value={state.mistakes} />
        <Stat className="ml-auto" label="Pairs" value={`${state.matched.length} / ${round.pairs.length}`} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="space-y-3">{round.left.map((id, i) => tile('left', id, i))}</div>
        <div className="space-y-3">{round.right.map((id, i) => tile('right', id, i))}</div>
      </div>
    </div>
  )
}
