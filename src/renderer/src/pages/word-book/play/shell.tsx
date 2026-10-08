// Shared game chrome: page frame, start / end / empty screens, the start → play → end flow (records
// the finished game exactly once), pronunciation accent and reduced-motion preference.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudRain, Ear, Link2, Shuffle, Zap, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import { notifyWordsChanged } from '@/app'
import { getSettings } from '@/settings'
import * as wordbook from '@/wordbook'
import { speechUrl, type Accent } from '../../../../../shared/speech'
import { MIN_WORDS, readBest, submitBest, type GameId, type PoolWord } from './common'

export interface GameMeta {
  id: GameId
  name: string
  path: string
  icon: LucideIcon
  skill: string
  description: string
  /** Keyboard line on the start screen. */
  keys: string
}

export const GAMES: GameMeta[] = [
  {
    id: 'match',
    name: 'Match',
    path: '/wordbook/play/match',
    icon: Link2,
    skill: 'Recall',
    description: 'Pair words with their meanings.',
    keys: 'Keys 1 to 6 pick a word, A to F pick a meaning.',
  },
  {
    id: 'unscramble',
    name: 'Unscramble',
    path: '/wordbook/play/unscramble',
    icon: Shuffle,
    skill: 'Spelling',
    description: 'Rebuild the word from shuffled letters.',
    keys: 'Type the letters, Backspace to undo, Tab for a hint, Esc to skip.',
  },
  {
    id: 'lightning',
    name: 'Lightning',
    path: '/wordbook/play/lightning',
    icon: Zap,
    skill: 'Speed',
    description: 'Right meaning or not? Sixty seconds.',
    keys: 'Right arrow or J if it matches, Left arrow or F if it does not.',
  },
  {
    id: 'rain',
    name: 'Word Rain',
    path: '/wordbook/play/rain',
    icon: CloudRain,
    skill: 'Typing',
    description: 'Type the word before its meaning lands.',
    keys: 'Type a word and press Enter. Esc pauses.',
  },
  {
    id: 'sound',
    name: 'Sound Check',
    path: '/wordbook/play/sound',
    icon: Ear,
    skill: 'Listening',
    description: 'Hear a word, pick its spelling.',
    keys: 'Keys 1 to 4 pick, R or Space replays, Enter goes on.',
  },
]

export const gameMeta = (id: GameId): GameMeta => GAMES.find((g) => g.id === id)!

/** Page frame with the breadcrumb back to the hub. */
export function GamePage({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <>
      <TopBar segments={['Play', title]} backTo="/wordbook/play" />
      <div className="mx-auto w-full max-w-3xl px-8 pb-12 pt-[5vh] lg:px-10">{children}</div>
    </>
  )
}

export function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded border-[0.5px] border-border-200 bg-surface-1 px-1 font-sans text-[11px] font-medium text-text-secondary">
      {children}
    </kbd>
  )
}

export function NotEnoughWords(): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="max-w-md space-y-4 pt-6">
      <h2 className="text-xl font-semibold text-text-primary">Not enough words yet</h2>
      <p className="text-sm leading-relaxed text-text-secondary">
        Games use words from My words that have a Vietnamese meaning. Add at least {MIN_WORDS} to play.
      </p>
      <Button variant="secondary" onClick={() => navigate('/wordbook/books')} autoFocus>
        Add from word lists
      </Button>
    </div>
  )
}

export function Loading(): React.JSX.Element {
  return <p className="pt-6 text-sm text-text-muted">Loading words...</p>
}

export function StartScreen({ meta, onStart }: { meta: GameMeta; onStart: () => void }): React.JSX.Element {
  const best = readBest(meta.id)
  return (
    <div className="max-w-lg space-y-6 pt-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">{meta.name}</h1>
        <p className="text-base leading-relaxed text-text-secondary">{meta.description}</p>
        <p className="text-sm text-text-muted">{meta.keys}</p>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="brand" size="lg" onClick={onStart} autoFocus>
          Start
        </Button>
        {best !== null && (
          <span className="text-sm text-text-secondary">
            Best <span className="font-medium tabular-nums text-text-primary">{best}</span>
          </span>
        )}
      </div>
    </div>
  )
}

export interface GameResult {
  score: number
  xp: number
  /** Extra numbers for the end screen, e.g. accuracy, time, best streak. */
  stats: { label: string; value: string }[]
}

export function EndScreen({
  meta,
  result,
  best,
  onPlayAgain,
}: {
  meta: GameMeta
  result: GameResult
  best: { best: number; isNew: boolean }
  onPlayAgain: () => void
}): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="max-w-lg space-y-8 pt-6">
      <div className="space-y-1">
        <p className="text-sm text-text-secondary">{meta.name} finished</p>
        <div className="flex items-baseline gap-3">
          <span className="text-6xl font-semibold tabular-nums tracking-tight text-text-primary">{result.score}</span>
          <span className="text-base text-text-secondary">points</span>
        </div>
        <p className="text-sm text-text-secondary">
          {best.isNew ? (
            <span className="font-medium text-text-success">New best score</span>
          ) : (
            <>
              Best <span className="tabular-nums text-text-primary">{best.best}</span>
            </>
          )}
        </p>
      </div>

      <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y-[0.5px] border-border-200 py-5">
        {result.stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-text-muted">{s.label}</dt>
            <dd className="mt-0.5 text-xl font-medium tabular-nums text-text-primary">{s.value}</dd>
          </div>
        ))}
        <div>
          <dt className="text-xs text-text-muted">XP earned</dt>
          <dd className="mt-0.5 text-xl font-medium tabular-nums text-text-primary">+{result.xp}</dd>
        </div>
      </dl>

      <div className="flex gap-3">
        <Button variant="brand" size="lg" onClick={onPlayAgain} autoFocus>
          Play again
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/wordbook/play')}>
          Back to games
        </Button>
      </div>
    </div>
  )
}

/**
 * The start → play → end flow around one game. `build` turns the quiz pool into a round (null = not
 * enough words). `finish` records the game once per run (quest + XP), saves the best and shows the end.
 */
export function useGameFlow<T>(id: GameId, build: (pool: PoolWord[]) => T | null) {
  const [round, setRound] = useState<T | null | undefined>(undefined)
  const [phase, setPhase] = useState<'start' | 'play' | 'end'>('start')
  const [runKey, setRunKey] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const [best, setBest] = useState<{ best: number; isNew: boolean }>({ best: 0, isNew: false })
  const recordedRun = useRef(-1)
  const buildRef = useRef(build)
  buildRef.current = build

  const load = useCallback(async () => {
    const pool = await wordbook.quizPool(60)
    const r = buildRef.current(pool)
    setRound(r)
    return r
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const start = useCallback(() => {
    setResult(null)
    setRunKey((k) => k + 1)
    setPhase('play')
  }, [])

  const playAgain = useCallback(async () => {
    const r = await load()
    if (r) start()
    else setPhase('start')
  }, [load, start])

  const finish = useCallback(
    (r: GameResult) => {
      if (recordedRun.current === runKey) return
      recordedRun.current = runKey
      setBest(submitBest(id, r.score))
      setResult(r)
      setPhase('end')
      void wordbook.recordGame(r.xp).then(() => notifyWordsChanged())
    },
    [id, runKey],
  )

  return { round, phase, runKey, result, best, start, playAgain, finish }
}

/** Renders the right screen for the flow; `play` draws the game itself. */
export function GameFlow<T>({
  id,
  build,
  play,
}: {
  id: GameId
  build: (pool: PoolWord[]) => T | null
  play: (round: T, finish: (r: GameResult) => void) => React.ReactNode
}): React.JSX.Element {
  const meta = gameMeta(id)
  const flow = useGameFlow(id, build)
  let body: React.ReactNode
  if (flow.round === undefined) body = <Loading />
  else if (flow.round === null) body = <NotEnoughWords />
  else if (flow.phase === 'start') body = <StartScreen meta={meta} onStart={flow.start} />
  else if (flow.phase === 'end' && flow.result)
    body = <EndScreen meta={meta} result={flow.result} best={flow.best} onPlayAgain={() => void flow.playAgain()} />
  else body = <div key={flow.runKey}>{play(flow.round, flow.finish)}</div>
  return <GamePage title={meta.name}>{body}</GamePage>
}

/** Pronounce a word in the user's accent. */
export function useSpeak(): (text: string) => void {
  const accent = useRef<Accent>('us')
  useEffect(() => {
    void getSettings().then((s) => (accent.current = s.accent))
  }, [])
  return useCallback((text: string) => void playAudioUrl(speechUrl(text, accent.current)), [])
}

export function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = (): void => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Shake an element sideways (skipped under reduced motion). */
export function shake(el: HTMLElement | null, reduced: boolean): void {
  if (!el || reduced) return
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 320 },
  )
}

/** A plain stat for the in-game header line. */
export function Stat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-sm text-text-secondary', className)}>
      {label} <span className="font-medium tabular-nums text-text-primary">{value}</span>
    </span>
  )
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
