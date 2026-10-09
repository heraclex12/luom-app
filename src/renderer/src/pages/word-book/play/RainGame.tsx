import { useCallback, useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { PoolWord } from './common'
import { formatTime, GameFlow, Kbd, shake, Stat, useReducedMotion, useSpeak, type GameResult } from './shell'
import {
  initialRain,
  LIVES,
  pickSeed,
  rainDeck,
  rainSignature,
  rainXp,
  step,
  submit,
  type RainState,
} from './rain'

/**
 * Word Rain: meanings fall, type the English word to clear them. Rules (positions, spawns, lives) are
 * the pure step() in ./rain. A requestAnimationFrame loop keeps the live state in a ref and writes drop
 * transforms straight to the DOM; React only re-renders when the drop set, lives or score change.
 *
 * Reduced motion: drops fall at 60% speed (and spawn less often) with plain linear movement, no easing
 * or transitions, so the screen changes slowly and predictably.
 */
export default function RainPage(): React.JSX.Element {
  return <GameFlow id="rain" build={rainDeck} play={(deck, finish) => <Game deck={deck} onFinish={finish} />} />
}

const REDUCED_SPEED = 0.6
/** Longest frame step, so a stalled tab does not drop everything at once. */
const MAX_DT = 50
const LOW_Y = 0.75

function Game({ deck, onFinish }: { deck: PoolWord[]; onFinish: (r: GameResult) => void }): React.JSX.Element {
  const reduced = useReducedMotion()
  const speak = useSpeak()
  const stateRef = useRef<RainState>(initialRain)
  const [view, setView] = useState<RainState>(initialRain)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  pausedRef.current = paused
  const [typed, setTyped] = useState('')

  const areaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropEls = useRef(new Map<number, HTMLDivElement>())

  /** Write every drop's position to the DOM (no React). */
  const draw = useCallback(() => {
    const area = areaRef.current
    if (!area) return
    const W = area.clientWidth
    const H = area.clientHeight
    for (const d of stateRef.current.drops) {
      const el = dropEls.current.get(d.id)
      if (!el) continue
      const x = d.x * Math.max(0, W - el.offsetWidth - 24) + 12
      const y = d.y * (H - el.offsetHeight)
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      el.dataset.low = d.y > LOW_Y ? 'true' : 'false'
    }
  }, [])

  // The frame loop.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const spawn = (on: Parameters<typeof pickSeed>[1]) => pickSeed(deck, on)
    const frame = (now: number): void => {
      const dt = Math.min(MAX_DT, now - last)
      last = now
      const prev = stateRef.current
      if (!pausedRef.current && !prev.over) {
        const next = step(prev, dt, spawn, reduced ? REDUCED_SPEED : 1)
        stateRef.current = next
        if (rainSignature(next) !== rainSignature(prev)) setView(next)
        draw()
      }
      if (!stateRef.current.over) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [deck, reduced, draw])

  // Newly rendered drops need a position before the next frame.
  useEffect(() => draw(), [view, draw])

  useEffect(() => {
    if (!view.over) return
    const s = stateRef.current
    onFinish({
      score: s.score,
      xp: rainXp(s),
      stats: [
        { label: 'Cleared', value: String(s.cleared) },
        { label: 'Missed', value: String(s.missed) },
        { label: 'Time', value: formatTime(s.elapsedMs) },
      ],
    })
  }, [view.over, onFinish])

  // Esc pauses / resumes; going to the background pauses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setPaused((p) => !p)
    }
    const onHide = (): void => {
      if (document.hidden) setPaused(true)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])
  useEffect(() => {
    if (!paused) inputRef.current?.focus()
  }, [paused])

  const onSubmit = (): void => {
    if (paused) return
    const r = submit(stateRef.current, typed)
    if (r.hit) {
      const gone = stateRef.current.drops.find((d) => !r.state.drops.includes(d))
      stateRef.current = r.state
      setView(r.state)
      setTyped('')
      if (gone) speak(gone.term)
    } else if (typed.trim()) {
      shake(inputRef.current, reduced)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stat label="Score" value={view.score} />
        <Stat label="Cleared" value={view.cleared} />
        <Stat label="Lives" value={`${view.lives} / ${LIVES}`} className={cn(view.lives === 1 && '[&>span]:text-text-danger')} />
        <span className="ml-auto flex items-center gap-1.5 text-xs text-text-muted">
          <Kbd>Esc</Kbd> {paused ? 'resume' : 'pause'}
        </span>
      </div>

      <div
        ref={areaRef}
        className="relative h-[52vh] min-h-80 overflow-hidden rounded-card bg-surface-1"
      >
        {view.drops.map((d) => (
          <div
            key={d.id}
            ref={(el) => {
              if (el) dropEls.current.set(d.id, el)
              else dropEls.current.delete(d.id)
            }}
            className="absolute left-0 top-0 max-w-[45%] text-base font-medium leading-snug text-text-primary will-change-transform data-[low=true]:text-text-danger"
            style={{ transform: 'translate3d(-9999px, 0, 0)' }}
          >
            {d.meaning}
          </div>
        ))}
        {paused && (
          <div className="absolute inset-0 grid place-items-center bg-surface-1">
            <div className="space-y-2 text-center">
              <p className="text-xl font-semibold text-text-primary">Paused</p>
              <p className="text-sm text-text-secondary">Press Esc to keep playing.</p>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <Input
          ref={inputRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={paused}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          placeholder="Type the English word, then Enter"
          className="h-12 text-lg"
          aria-label="English word"
        />
      </form>
    </div>
  )
}
