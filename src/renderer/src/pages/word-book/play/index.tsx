import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Castle, ChevronRight, Droplets, Ear, Sparkles, Waypoints, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import * as wordbook from '@/wordbook'
import { MIN_WORDS, readBest, uniquePool } from './common'
import { GAMES, Kbd } from './shell'

/** 3D activities (pages/word-book/activities, garden): each answer is a real review. */
const ACTIVITIES: { name: string; skill: string; description: string; path: string; icon: LucideIcon }[] = [
  {
    name: 'Word Bridge',
    skill: 'Spelling',
    description: 'Type the word letter by letter to build a bridge across the river.',
    path: '/wordbook/play/bridge',
    icon: Waypoints,
  },
  {
    name: 'Star Sentences',
    skill: 'Context',
    description: 'Complete a real example sentence written in the night sky.',
    path: '/wordbook/play/stars',
    icon: Sparkles,
  },
  {
    name: 'Echo Cave',
    skill: 'Listening',
    description: 'Hear a word, type what you heard, light up the crystals.',
    path: '/wordbook/play/cave',
    icon: Ear,
  },
  {
    name: 'Memory Palace',
    skill: 'Long-term recall',
    description: 'Your words live on the objects of a room. Walk it and recall each one.',
    path: '/wordbook/play/palace',
    icon: Castle,
  },
  {
    name: 'Garden rescue',
    skill: 'Review',
    description: 'Water your wilting plants by remembering their words.',
    path: '/wordbook/garden',
    icon: Droplets,
  },
]

/** Games hub: one row per game with the skill it trains and the best score so far. Keys 1-5 open a game. */
export default function GamesHub(): React.JSX.Element {
  const navigate = useNavigate()
  const [ready, setReady] = useState<number | null>(null)
  const bests = GAMES.map((g) => readBest(g.id))

  useEffect(() => {
    void wordbook.quizPool(60).then((pool) => setReady(uniquePool(pool).length))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const g = GAMES[Number(e.key) - 1]
      if (g) navigate(g.path)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const tooFew = ready !== null && ready < MIN_WORDS

  return (
    <>
      <TopBar segments={['My words', 'Games']} backTo="/wordbook" />
      <div className="mx-auto w-full max-w-3xl px-8 pb-12 pt-[5vh] lg:px-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Games</h1>
          <p className="text-base text-text-secondary">
            Short rounds with the words you are learning. Each finished game counts toward today's game quest.
          </p>
        </header>

        {tooFew && (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
            <span>
              You need at least {MIN_WORDS} words with a Vietnamese meaning in My words to play.
            </span>
            <Button variant="secondary" size="sm" onClick={() => navigate('/wordbook/books')}>
              Add from word lists
            </Button>
          </div>
        )}

        <h2 className="mt-8 text-lg font-semibold text-text-primary">3D activities</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Your due words come first, and every answer counts as a review, so these replace part of today’s study.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ACTIVITIES.map((a) => (
            <button
              key={a.path}
              type="button"
              onClick={() => navigate(a.path)}
              className="group flex items-start gap-3 rounded-xl border border-border bg-surface-1 p-4 text-left transition-colors hover:border-border-accent hover:bg-bg-accent/30"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg-accent text-text-accent">
                <a.icon className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-base font-semibold text-text-primary">{a.name}</span>
                  <span className="text-xs text-text-muted">{a.skill}</span>
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-text-secondary">{a.description}</span>
              </span>
            </button>
          ))}
        </div>

        <h2 className="mt-10 text-lg font-semibold text-text-primary">Quick games</h2>
        <div className="mt-2" role="list">
          <div className="grid grid-cols-[1fr_6rem_4rem_1rem] gap-4 px-3 pb-2 text-xs text-text-muted" aria-hidden>
            <span>Game</span>
            <span>Trains</span>
            <span className="text-right">Best</span>
            <span />
          </div>
          <div className="border-t-[0.5px] border-border-200 pt-2">
            {GAMES.map((g, i) => {
              const Icon = g.icon
              const best = bests[i]
              return (
                <button
                  key={g.id}
                  type="button"
                  role="listitem"
                  onClick={() => navigate(g.path)}
                  className="group grid w-full grid-cols-[1fr_6rem_4rem_1rem] items-center gap-4 rounded-lg px-3 py-3.5 text-left transition-colors hover:bg-surface-1 focus-visible:bg-surface-1 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-text-primary">{g.name}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-text-secondary">{g.description}</span>
                    </span>
                  </span>
                  <span className="text-sm text-text-secondary">{g.skill}</span>
                  <span className="text-right text-sm tabular-nums text-text-primary">
                    {best === null ? <span className="text-text-muted">-</span> : best}
                  </span>
                  <ChevronRight className="size-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                </button>
              )
            })}
          </div>
        </div>

        <p className="mt-6 flex items-center gap-1.5 px-3 text-xs text-text-muted">
          Press <Kbd>1</Kbd> to <Kbd>5</Kbd> to open a game.
        </p>
      </div>
    </>
  )
}
