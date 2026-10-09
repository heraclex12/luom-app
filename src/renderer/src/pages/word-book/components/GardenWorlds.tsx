import { Check, ChevronDown, Lock } from 'lucide-react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { cn } from '@/lib/cn'
import * as wordbook from '@/wordbook'

/**
 * Garden worlds on Home: the world the garden has grown into (a chip by the garden title that opens the list of all
 * worlds, reached and still to come), and the one-time "Your garden grew" note when a new world arrives.
 */

/** "Cottage garden · Level 6" chip; opens every world with its level and what it brings. */
export function GardenWorldChip({ level, xp }: { level: number; xp: number }): React.JSX.Element {
  const world = wordbook.gardenWorld(level)
  const next = wordbook.nextGardenTier(level)
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
      <PopoverContent align="start" className="w-80 p-0">
        <div className="px-4 pb-2 pt-3.5">
          <p className="text-sm font-semibold text-text-primary">Garden worlds</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {next
              ? `Your garden grows as you level up. ${(wordbook.levelStartXp(next.level) - xp).toLocaleString()} XP to ${next.name}.`
              : 'Your garden has grown into every world. Well done!'}
          </p>
        </div>
        <ol className="max-h-[22rem] overflow-y-auto px-2 pb-2">
          {wordbook.GARDEN_TIERS.map((t, i) => {
            const reached = i <= world.tier
            const here = i === world.tier
            return (
              <li key={t.name} className={cn('flex gap-3 rounded-[12px] px-2 py-2', here && 'bg-surface-1')}>
                <span
                  className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                    reached ? 'bg-fill-brand text-on-brand' : 'bg-bg-neutral text-text-muted',
                  )}
                >
                  {reached ? <Check className="size-3" strokeWidth={3} /> : <Lock className="size-2.5" strokeWidth={2.5} />}
                </span>
                <span className="min-w-0">
                  <span className={cn('block text-sm font-semibold', reached ? 'text-text-primary' : 'text-text-secondary')}>
                    {t.name}
                    <span className="ml-1.5 text-xs font-medium text-text-muted">Level {t.level}</span>
                    {here && <span className="font-hand ml-2 text-sm font-normal text-text-accent">you are here</span>}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-text-muted">{t.adds}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </PopoverContent>
    </Popover>
  )
}

/** Shown once when the garden has grown into a new world (until dismissed). */
export function GardenGrew({ level, onDone }: { level: number; onDone: () => void }): React.JSX.Element {
  const world = wordbook.gardenWorld(level)
  const tier = wordbook.GARDEN_TIERS[world.tier]
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card bg-bg-accent/60 px-5 py-4" role="status">
      <div className="min-w-0 flex-1">
        <p className="font-hand text-lg leading-none text-text-accent">Level {level}!</p>
        <p className="mt-1 font-serif text-lg font-bold text-text-primary">Your garden grew into a {world.name.toLowerCase()}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{tier.adds} Have a look around: drag to turn it.</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onDone}>
        Got it
      </Button>
    </div>
  )
}
