import { useState } from 'react'
import { Briefcase, Coffee, Compass, Heart, Rocket, Search, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { GENRES, SEASON_LENGTH, type Genre } from '@/episodes'
import type { StoryLevel } from '../../../../../shared/story'

const ICON: Record<Genre, LucideIcon> = {
  mystery: Search,
  romance: Heart,
  adventure: Compass,
  workplace: Briefcase,
  scifi: Rocket,
  slice: Coffee,
}

const LEVELS: { id: StoryLevel; label: string; hint: string }[] = [
  { id: 'A2', label: 'A2', hint: 'Short, simple sentences' },
  { id: 'B1', label: 'B1', hint: 'Everyday English' },
  { id: 'B2', label: 'B2', hint: 'Richer language' },
]

/** First screen of Daily Episodes: pick a genre and a level, the AI plans the season. */
export function SeasonPicker({
  busy,
  onStart,
  again = false,
}: {
  busy: boolean
  onStart: (genre: Genre, level: StoryLevel) => void
  /** A previous season ended. */
  again?: boolean
}): React.JSX.Element {
  const [genre, setGenre] = useState<Genre>('mystery')
  const [level, setLevel] = useState<StoryLevel>('B1')

  return (
    <div className="mx-auto w-full max-w-3xl px-8 pb-16 pt-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-accent">Daily episodes</p>
      <h1 className="mt-2 text-[2.2rem] font-semibold leading-tight tracking-tight text-text-primary">
        {again ? 'Start a new season' : 'A story that continues every day'}
      </h1>
      <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-text-secondary">
        {SEASON_LENGTH} short episodes, one a day, written with the words you are learning. Each one ends on a
        cliffhanger. An episode only counts on its own day: miss it and that page of the story is lost.
      </p>

      <h2 className="mt-10 text-sm font-semibold text-text-primary">Genre</h2>
      <div role="radiogroup" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GENRES.map((g) => {
          const Icon = ICON[g.id]
          const on = g.id === genre
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setGenre(g.id)}
              className={cn(
                'can-focus flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
                on ? 'border-border-accent bg-bg-accent/50' : 'border-border bg-surface-1 hover:border-border-strong',
              )}
            >
              <Icon className={cn('size-5', on ? 'text-text-accent' : 'text-text-secondary')} />
              <span className="text-sm font-semibold text-text-primary">{g.label}</span>
              <span className="text-xs leading-snug text-text-muted">{g.blurb}</span>
            </button>
          )
        })}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-text-primary">Level</h2>
      <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={l.id === level}
            onClick={() => setLevel(l.id)}
            className={cn(
              'can-focus rounded-full border px-4 py-1.5 text-sm transition-colors',
              l.id === level
                ? 'border-transparent bg-fill-brand font-semibold text-on-brand'
                : 'border-border text-text-secondary hover:border-border-strong',
            )}
          >
            {l.label} <span className={cn('ml-1', l.id === level ? 'text-on-brand/80' : 'text-text-muted')}>{l.hint}</span>
          </button>
        ))}
      </div>

      <Button variant="brand" size="lg" className="mt-10 px-6" loading={busy} onClick={() => onStart(genre, level)}>
        {busy ? `Planning ${SEASON_LENGTH} episodes…` : 'Start the season'}
      </Button>
      {busy && <p className="mt-3 text-sm text-text-muted">The writers are planning the story. This can take a minute.</p>}
    </div>
  )
}
