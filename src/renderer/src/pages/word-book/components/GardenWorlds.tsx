import { Check, ChevronDown, Leaf, Lock, Moon, Snowflake, Sparkles, Sun, Flower2 } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import * as wordbook from '@/wordbook'

/**
 * Garden worlds on Home: the world the garden has grown into (a chip by the garden title that opens every world,
 * island, visitor and trophy, reached or still to come), the season / night picker from level 100, and the one-time
 * news card when something new arrives.
 */

function Step({ done, here, title, meta, body }: { done: boolean; here?: boolean; title: string; meta: string; body: string }): React.JSX.Element {
  return (
    <li className={cn('flex gap-3 rounded-[12px] px-2 py-2', here && 'bg-surface-1')}>
      <span
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
          done ? 'bg-fill-brand text-on-brand' : 'bg-bg-neutral text-text-muted',
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : <Lock className="size-2.5" strokeWidth={2.5} />}
      </span>
      <span className="min-w-0">
        <span className={cn('block text-sm font-semibold', done ? 'text-text-primary' : 'text-text-secondary')}>
          {title}
          <span className="ml-1.5 text-xs font-medium text-text-muted">{meta}</span>
          {here && <span className="font-hand ml-2 text-sm font-normal text-text-accent">you are here</span>}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-text-muted">{body}</span>
      </span>
    </li>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element => (
  <>
    <p className="px-4 pb-1 pt-3 text-xs font-semibold text-text-secondary">{title}</p>
    <ol className="px-2">{children}</ol>
  </>
)

/** "Cottage garden · Level 30" chip; opens worlds, islands, visitors and trophies with what each needs. */
export function GardenWorldChip({
  level,
  xp,
  bestStreak,
  trophies,
}: {
  level: number
  xp: number
  bestStreak: number
  trophies: readonly wordbook.Trophy[]
}): React.JSX.Element {
  const world = wordbook.gardenWorld(level)
  const next = wordbook.nextGardenTier(level)
  const tiers = wordbook.GARDEN_TIERS.map((t, i) => ({ t, i }))
  const medals = (m: wordbook.TrophyMedal): number => trophies.filter((t) => t.medal === m).length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="can-focus flex items-center gap-1.5 rounded-full bg-bg-accent/70 px-3 py-1 text-xs font-semibold text-text-accent transition-colors hover:bg-bg-accent"
        >
          {world.name}
          <span className="font-medium text-text-accent/80">· Level {level}</span>
          <ChevronDown className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0">
        <div className="max-h-[28rem] overflow-y-auto pb-2">
          <div className="px-4 pt-3.5">
            <p className="text-sm font-semibold text-text-primary">Your garden</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {next
                ? `It grows as you level up. ${(wordbook.levelStartXp(next.level) - xp).toLocaleString()} XP to ${next.name}.`
                : 'It has grown into every world and island. Well done!'}
            </p>
          </div>
          <Section title="Worlds">
            {tiers
              .filter(({ t }) => !t.island || t.island === 'castle')
              .map(({ t, i }) => (
                <Step key={t.name} done={i <= world.tier} here={i === world.tier} title={t.name} meta={`Level ${t.level}`} body={t.adds} />
              ))}
          </Section>
          <Section title="Islands">
            {tiers
              .filter(({ t }) => t.island && t.island !== 'castle')
              .map(({ t, i }) => (
                <Step key={t.name} done={i <= world.tier} here={i === world.tier} title={t.name} meta={`Level ${t.level}`} body={t.adds} />
              ))}
            <Step
              done={level >= wordbook.LOOKS_LEVEL}
              title="Seasons and night"
              meta={`Level ${wordbook.LOOKS_LEVEL}`}
              body="Spring blossom, autumn leaves, winter snow or a starry night with fireflies."
            />
          </Section>
          <Section title={`Visitors · best streak ${bestStreak} ${bestStreak === 1 ? 'day' : 'days'}`}>
            {wordbook.VISITORS.map((v) => (
              <Step key={v.kind} done={bestStreak >= v.streak} title={v.name} meta={`${v.streak} days in a row`} body={v.about} />
            ))}
          </Section>
          <p className="px-4 pb-1 pt-3 text-xs font-semibold text-text-secondary">Trophies</p>
          <p className="px-4 text-xs leading-snug text-text-muted">
            {trophies.length
              ? `${medals('gold')} gold, ${medals('silver')} silver, ${medals('bronze')} bronze. `
              : 'None yet. '}
            A word list gives bronze at 100 words learned, silver at half and gold at all of them; a collection of 10 or
            more words gives gold when every word is learned.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const LOOKS: { id: wordbook.GardenLook; label: string; icon: React.ReactNode }[] = [
  { id: 'auto', label: 'Auto', icon: <Sparkles className="size-4" /> },
  { id: 'spring', label: 'Spring', icon: <Flower2 className="size-4" /> },
  { id: 'summer', label: 'Summer', icon: <Sun className="size-4" /> },
  { id: 'autumn', label: 'Autumn', icon: <Leaf className="size-4" /> },
  { id: 'winter', label: 'Winter', icon: <Snowflake className="size-4" /> },
  { id: 'night', label: 'Night', icon: <Moon className="size-4" /> },
]

/** Season / night picker (level 100 on). Auto follows the month, and night from 7 pm. */
export function GardenLookPicker({
  value,
  onChange,
}: {
  value: wordbook.GardenLook
  onChange: (look: wordbook.GardenLook) => void
}): React.JSX.Element {
  const current = LOOKS.find((l) => l.id === value) ?? LOOKS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="can-focus flex items-center gap-1.5 rounded-full bg-fill-control px-3 py-1 text-xs font-semibold text-text-secondary transition-colors hover:bg-fill-control-hover hover:text-text-primary"
        >
          {current.icon}
          {current.label}
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {LOOKS.map((l) => (
          <DropdownMenuItem key={l.id} onSelect={() => onChange(l.id)}>
            {l.icon}
            {l.label}
            {l.id === 'auto' && <span className="ml-auto pl-3 text-xs text-text-muted">season, night</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Something new in the garden (a world, an island, a visitor, a trophy), shown once until dismissed. */
export function GardenNewsCard({ news, onDone }: { news: wordbook.GardenNews; onDone: () => void }): React.JSX.Element {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card bg-bg-accent/60 px-5 py-4" role="status">
      <div className="min-w-0 flex-1">
        <p className="font-hand text-lg leading-none text-text-accent">{news.note}</p>
        <p className="mt-1 font-serif text-lg font-bold text-text-primary">{news.title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{news.body}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onDone}>
        Got it
      </Button>
    </div>
  )
}
