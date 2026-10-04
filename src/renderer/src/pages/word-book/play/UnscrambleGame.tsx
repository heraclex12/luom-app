import { useEffect, useMemo, useReducer, useRef } from 'react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatTime, GameFlow, Kbd, shake, Stat, useReducedMotion, useSpeak, type GameResult } from './shell'
import {
  buildPuzzles,
  HINT_COST,
  initialUnscramble,
  unscrambleDone,
  unscrambleReducer,
  unscrambleXp,
  type Puzzle,
} from './unscramble'

/** Unscramble: rebuild the word from shuffled tiles. Rules in ./unscramble. */
export default function UnscramblePage(): React.JSX.Element {
  return (
    <GameFlow
      id="unscramble"
      build={(pool) => buildPuzzles(pool)}
      play={(puzzles, finish) => <Game puzzles={puzzles} onFinish={finish} />}
    />
  )
}

function Game({ puzzles, onFinish }: { puzzles: Puzzle[]; onFinish: (r: GameResult) => void }): React.JSX.Element {
  const reducer = useMemo(() => unscrambleReducer(puzzles), [puzzles])
  const [s, dispatch] = useReducer(reducer, initialUnscramble)
  const done = unscrambleDone(s, puzzles)
  const p = puzzles[s.index]
  const reduced = useReducedMotion()
  const speak = useSpeak()
  const startRef = useRef(performance.now())
  const slotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (s.last?.outcome === 'solved') speak(s.last.term)
  }, [s.last, speak])

  useEffect(() => {
    if (s.wrongN > 0) shake(slotsRef.current, reduced)
  }, [s.wrongN, reduced])

  useEffect(() => {
    if (!done) return
    const solved = s.outcomes.filter((o) => o === 'solved').length
    onFinish({
      score: s.score,
      xp: unscrambleXp(s),
      stats: [
        { label: 'Solved', value: `${solved} / ${puzzles.length}` },
        { label: 'Hints used', value: String(s.hintsTotal) },
        { label: 'Time', value: formatTime(performance.now() - startRef.current) },
      ],
    })
  }, [done, s, puzzles.length, onFinish])

  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[a-z]$/i.test(e.key)) dispatch({ type: 'letter', ch: e.key })
      else if (e.key === 'Backspace') dispatch({ type: 'backspace' })
      else if (e.key === 'Tab') {
        e.preventDefault()
        dispatch({ type: 'hint' })
      } else if (e.key === 'Escape') dispatch({ type: 'skip' })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done])

  if (!p) return <div />
  const tileById = new Map(p.tiles.map((t) => [t.id, t]))

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stat label="Word" value={`${s.index + 1} of ${puzzles.length}`} />
        <Stat label="Score" value={s.score} />
        <span className="ml-auto text-sm text-text-secondary" aria-live="polite">
          {s.last &&
            (s.last.outcome === 'solved' ? (
              <span className="text-text-success">Correct, {s.last.term}</span>
            ) : (
              <>
                Skipped. It was <span className="font-medium text-text-primary">{s.last.term}</span>
              </>
            ))}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-text-muted">Meaning</p>
        <p className="text-2xl leading-snug text-text-primary">{p.meaning}</p>
      </div>

      <div ref={slotsRef} className="flex flex-wrap gap-2" aria-label="Your answer">
        {[...p.term].map((_, i) => {
          const id = s.picked[i]
          const ch = id === undefined ? '' : tileById.get(id)!.ch
          return (
            <span
              key={i}
              className={cn(
                'grid h-14 w-11 place-items-end justify-center border-b-2 pb-1 text-3xl font-semibold',
                i < s.locked ? 'border-border-200 text-text-secondary' : 'border-text-muted text-text-primary',
                i === s.picked.length && 'border-fill-brand'
              )}
            >
              {ch}
            </span>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {p.tiles.map((t) => {
          const used = s.picked.includes(t.id)
          return (
            <button
              key={`${s.index}:${t.id}`}
              type="button"
              tabIndex={-1}
              disabled={used}
              onClick={() => dispatch({ type: 'pick', tileId: t.id })}
              className={cn(
                'btn-squish grid size-12 place-items-center rounded-lg text-2xl font-medium shadow-card-ring transition-opacity motion-reduce:transition-none',
                used ? 'opacity-25' : 'bg-surface-1 text-text-primary hover:bg-surface-2'
              )}
            >
              {t.ch}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 border-t-[0.5px] border-border-200 pt-5">
        <Button variant="ghost" onClick={() => dispatch({ type: 'hint' })} tabIndex={-1}>
          Hint <Kbd>Tab</Kbd>
        </Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'skip' })} tabIndex={-1}>
          Skip <Kbd>Esc</Kbd>
        </Button>
        <span className="ml-auto text-xs text-text-muted">A hint costs {HINT_COST} points</span>
      </div>
    </div>
  )
}
