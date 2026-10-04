import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CupSoda, Droplets, Fish, Leaf, Sparkles, Waypoints, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import * as wordbook from '@/wordbook'
import { MIN_WORDS, readBest, uniquePool, type GameId } from './common'
import { GAMES } from './shell'

interface Entry {
  name: string
  skill: string
  description: string
  path: string
  icon: LucideIcon
  /** Answers are real reviews of your due words. */
  review?: boolean
  best?: { id: GameId; label: (n: number) => string }
}

/** Every game in one list: the playful 3D ones first, then the short timed ones. */
const ENTRIES: Entry[] = [
  {
    name: 'Word Bridge',
    skill: 'Spelling',
    description: 'Type the word letter by letter to build a bridge across the river.',
    path: '/wordbook/play/bridge',
    icon: Waypoints,
    review: true,
  },
  {
    name: 'Bubble Tea Shop',
    skill: 'Spelling',
    description: 'Animal customers order by meaning. Spell the word to fill their cup before they lose patience.',
    path: '/wordbook/play/tea',
    icon: CupSoda,
    review: true,
    best: { id: 'tea', label: (n) => `Best ${n} coins` },
  },
  {
    name: 'Word Fishing',
    skill: 'Recall',
    description: 'Catch the fish with the right word. It lives in your aquarium and grows as you learn it.',
    path: '/wordbook/play/fishing',
    icon: Fish,
    review: true,
  },
  {
    name: 'Garden rescue',
    skill: 'Recall',
    description: 'Water your wilting plants by remembering their words.',
    path: '/wordbook/garden',
    icon: Droplets,
    review: true,
  },
  {
    name: 'Firefly Night',
    skill: 'Listening',
    description: 'Hear a word and catch the firefly carrying its spelling. Your jar glows brighter with each one.',
    path: '/wordbook/play/firefly',
    icon: Sparkles,
    review: true,
  },
  {
    name: 'Frog Hop',
    skill: 'Speed',
    description: 'Hop across the lily pads with the right meanings. Fast answers are big leaps; wrong pads sink.',
    path: '/wordbook/play/frog',
    icon: Leaf,
    review: true,
    best: { id: 'frog', label: (n) => `Best combo ${n}` },
  },
  ...GAMES.map((g) => ({
    name: g.name,
    skill: g.skill,
    description: g.description,
    path: g.path,
    icon: g.icon,
    best: { id: g.id, label: (n: number) => `Best ${n}` },
  })),
]

/** Games list: every game as a card with the skill it trains, a Review tag and its best score or status. */
export default function GamesHub(): React.JSX.Element {
  const navigate = useNavigate()
  const [ready, setReady] = useState<number | null>(null)
  const [fish, setFish] = useState<number | null>(null)
  const [thirsty, setThirsty] = useState<number | null>(null)

  useEffect(() => {
    void wordbook.quizPool(60).then((pool) => setReady(uniquePool(pool).length))
    void wordbook.aquariumFish().then((f) => setFish(f.length))
    void wordbook.loadGarden().then((plants) => setThirsty(plants.filter((p) => p.stage === 'thirsty').length))
  }, [])

  const tooFew = ready !== null && ready < MIN_WORDS

  const status = (e: Entry): string | null => {
    if (e.path === '/wordbook/play/fishing' && fish) return `${fish} fish in your aquarium`
    if (e.path === '/wordbook/garden' && thirsty !== null)
      return thirsty ? `${thirsty} ${thirsty === 1 ? 'plant needs' : 'plants need'} water` : 'All plants watered'
    if (e.best) {
      const n = readBest(e.best.id)
      if (n !== null) return e.best.label(n)
    }
    return null
  }

  return (
    <>
      <TopBar segments={['My words', 'Games']} backTo="/wordbook" />
      <div className="mx-auto w-full max-w-4xl px-8 pb-12 pt-[5vh] lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Games</h1>
            <p className="max-w-[60ch] text-base text-text-secondary">
              Short rounds with the words you are learning. Games marked Review use your due words first and count as
              today’s reviews.
            </p>
          </div>
          <Button variant="secondary" className="gap-1.5" onClick={() => navigate('/wordbook/play/aquarium')}>
            <Fish className="size-4" />
            Aquarium
          </Button>
        </header>

        {tooFew && (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
            <span>You need at least {MIN_WORDS} words with a Vietnamese meaning in My words to play.</span>
            <Button variant="secondary" size="sm" onClick={() => navigate('/wordbook/books')}>
              Add from word lists
            </Button>
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {ENTRIES.map((e) => {
            const line = status(e)
            return (
              <button
                key={e.path}
                type="button"
                onClick={() => navigate(e.path)}
                className="group flex items-start gap-3 rounded-xl border border-border bg-surface-1 p-4 text-left transition-colors hover:border-border-accent hover:bg-bg-accent/30 active:scale-[0.99]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bg-accent text-text-accent">
                  <e.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base font-semibold text-text-primary">{e.name}</span>
                    <span className="text-xs text-text-muted">{e.skill}</span>
                    {e.review && (
                      <span className="rounded-full bg-bg-success px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-text-success">
                        Review
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-text-secondary">{e.description}</span>
                  {line && <span className="mt-1.5 block text-xs font-medium text-text-muted">{line}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
