import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { ArrowRight, BookOpenText, Clapperboard, CupSoda, Droplets, Fish, Leaf, Sparkles, Waypoints, type LucideIcon } from 'lucide-react'
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

/** Each skill prints in its own pigment, so the games list reads by what a round trains at a glance. */
const SKILL_PIGMENT: Record<string, string> = {
  Spelling: 'bg-son text-on-brand',
  Recall: 'bg-dong text-on-success',
  Listening: 'bg-cham text-on-accent',
  Speed: 'bg-hoe text-on-warning',
  Typing: 'bg-rail-bg text-rail-fg',
}

/** Games list: review rounds (3D activities that rate your due words), quick drills, and stories. */
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
      <TopBar segments={['Play']} backTo="/wordbook" />
      <div className="mx-auto w-full max-w-4xl px-8 pb-12 pt-[5vh] lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-bold tracking-[-0.015em] text-text-primary">Play</h1>
            <p className="max-w-[60ch] text-base text-text-secondary">Short rounds and stories with the words you are learning.</p>
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

        <section className="mt-10" aria-labelledby="review-rounds">
          <h2 id="review-rounds" className="font-serif text-xl font-bold text-text-primary">
            Review rounds
          </h2>
          <p className="mt-1 text-sm text-text-secondary">Your due words come first, and every answer counts as today’s review.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ENTRIES.filter((e) => e.review).map((e) => (
              <GameTile key={e.path} entry={e} status={status(e)} large onOpen={() => navigate(e.path)} />
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="quick-drills">
          <h2 id="quick-drills" className="font-serif text-xl font-bold text-text-primary">
            Quick drills
          </h2>
          <p className="mt-1 text-sm text-text-secondary">Short, fast games for fun and a best score. They don’t change your review schedule.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ENTRIES.filter((e) => !e.review).map((e) => (
              <GameTile key={e.path} entry={e} status={status(e)} onOpen={() => navigate(e.path)} />
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="stories">
          <h2 id="stories" className="font-serif text-xl font-bold text-text-primary">
            Stories
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <StoryLink
              icon={<Clapperboard />}
              title="Daily episodes"
              body="A serial story, one episode a day, with your words"
              onOpen={() => navigate('/wordbook/episodes')}
            />
            <StoryLink
              icon={<BookOpenText />}
              title="Short story"
              body="One short story written with your words, any time"
              onOpen={() => navigate('/wordbook/story')}
            />
          </div>
        </section>
      </div>
    </>
  )
}

/** A game: its skill printed as a pigment block, name in the display face, what it trains, and its best or status. */
function GameTile({
  entry: e,
  status,
  large = false,
  onOpen,
}: {
  entry: Entry
  status: string | null
  large?: boolean
  onOpen: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'can-focus group flex items-stretch rounded-card border border-border bg-surface-1 text-left transition-colors hover:border-border-strong hover:bg-surface-2 active:scale-[0.99]',
        large ? 'gap-4 p-3' : 'items-start gap-3 p-2.5',
      )}
    >
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-[5px]',
          SKILL_PIGMENT[e.skill] ?? 'bg-bg-neutral text-text-secondary',
          large ? 'w-16 self-stretch' : 'size-10',
        )}
      >
        <e.icon className={large ? 'size-7' : 'size-5'} strokeWidth={2} />
      </span>
      <span className={cn('min-w-0 flex-1', large && 'py-1.5')}>
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn('font-serif font-bold text-text-primary', large ? 'text-lg' : 'text-[15px]')}>{e.name}</span>
          <span className="text-xs text-text-muted">{e.skill}</span>
        </span>
        <span className={cn('block leading-snug text-text-secondary', large ? 'mt-0.5 text-sm' : 'mt-0.5 text-xs')}>
          {e.description}
        </span>
        {status && <span className="mt-1.5 block text-xs font-medium text-text-accent">{status}</span>}
      </span>
    </button>
  )
}

function StoryLink({
  icon,
  title,
  body,
  onOpen,
}: {
  icon: React.ReactNode
  title: string
  body: string
  onOpen: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="can-focus group flex items-center gap-3 rounded-card border border-border bg-surface-1 p-3 text-left transition-colors hover:border-border-strong hover:bg-surface-2 [&_svg]:size-5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[5px] bg-bg-accent text-text-accent">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[15px] font-bold text-text-primary">{title}</span>
        <span className="block truncate text-xs text-text-secondary">{body}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
