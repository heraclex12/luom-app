import { useEffect, useState } from 'react'
import { BookOpenText, Check, Flame, Lock, PenLine } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { SEASON_LENGTH, type SeasonView, type Slot, type StoredEpisode } from '@/episodes'

/**
 * Season overview: the series, today's episode (being written / ready / done with tomorrow's teaser) and the
 * season as a strip of pages: read, lost (missed on its day, for good), today and still locked.
 */
export function SeasonHome({
  view,
  writing,
  writeError,
  onWrite,
  onOpen,
  onNewSeason,
}: {
  view: SeasonView
  writing: boolean
  writeError: string | null
  onWrite: () => void
  onOpen: (e: StoredEpisode) => void
  onNewSeason: () => void
}): React.JSX.Element {
  const { season, slots, streak, todayNumber, episodes } = view
  const bible = season.bible
  const lost = slots.filter((s) => s.state === 'lost').length
  const read = slots.filter((s) => s.state === 'read').length
  const today = todayNumber != null ? episodes.get(todayNumber) : undefined
  const previous = todayNumber != null ? [...episodes.values()].filter((e) => e.number < todayNumber).pop() : undefined

  return (
    <div className="mx-auto w-full max-w-5xl px-10 pb-16 pt-12">
      <style>{EPISODE_FX}</style>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-[62ch]">
          <h1 className="text-balance font-serif text-[2.4rem] font-bold leading-[1.1] tracking-[-0.015em] text-text-primary">
            {bible.title}
          </h1>
          <p className="mt-2 text-sm text-text-muted">Daily episodes · Level {season.level}</p>
          <p className="mt-3 text-base leading-relaxed text-text-secondary">{bible.premise}</p>
          {bible.characters.length > 0 && (
            <p className="mt-2 text-sm text-text-muted">
              {bible.characters.map((c) => (
                <span key={c.name} className="mr-3 inline-block">
                  <span className="font-medium text-text-secondary">{c.name}</span>, {c.role}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm text-text-secondary">
          <span className="flex items-center gap-2">
            <Flame className={cn('size-4', streak > 0 ? 'text-fill-brand' : 'text-text-muted')} strokeWidth={2} />
            <span className="font-semibold tabular-nums text-text-primary">{streak}</span> episode streak
          </span>
          <span>
            <span className="font-semibold tabular-nums text-text-primary">{read}</span> of {SEASON_LENGTH} read
          </span>
        </div>
      </header>

      {/* Today */}
      <section className="mt-10 rounded-card bg-surface-1 p-7">
        {todayNumber == null ? (
          <SeasonOver read={read} lost={lost} onNewSeason={onNewSeason} />
        ) : writing ? (
          <Writing number={todayNumber} />
        ) : !today ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-text-muted">Episode {todayNumber}</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">Today’s episode is not written yet.</p>
              {writeError && <p className="mt-2 max-w-[60ch] text-sm text-text-danger">{writeError}</p>}
            </div>
            <Button variant="brand" size="lg" className="gap-2" onClick={onWrite}>
              {writeError ? 'Try again' : 'Write today’s episode'}
            </Button>
          </div>
        ) : today.readAt == null ? (
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0 max-w-[62ch]">
              {previous && (
                <p className="mb-4 text-sm leading-relaxed text-text-muted">
                  <span className="font-semibold text-text-secondary">Previously: </span>
                  {previous.episode.summary}
                </p>
              )}
              <p className="text-sm text-text-muted">Episode {today.number} · ready</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">{today.episode.title}</p>
              <p className="mt-2 text-sm text-text-secondary">
                {today.episode.usedWords.length} of your words inside. Read it today or it becomes a lost page.
              </p>
            </div>
            <Button variant="brand" size="lg" className="gap-2" onClick={() => onOpen(today)}>
              <BookOpenText />
              Read episode {today.number}
            </Button>
          </div>
        ) : (
          <CaughtUp today={today} onReread={() => onOpen(today)} />
        )}
      </section>

      {/* The season as pages */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl font-bold text-text-primary">This season</h2>
          {lost > 0 && (
            <p className="text-sm text-text-muted">
              {lost === 1 ? '1 lost page' : `${lost} lost pages`}. Episodes only count on their own day.
            </p>
          )}
        </div>
        <ol className="mt-4 grid grid-cols-7 gap-3">
          {slots.map((s, i) => (
            <PageTile key={s.number} slot={s} index={i} episode={episodes.get(s.number)} onOpen={onOpen} />
          ))}
        </ol>
      </section>
    </div>
  )
}

function PageTile({
  slot,
  index,
  episode,
  onOpen,
}: {
  slot: Slot
  index: number
  episode: StoredEpisode | undefined
  onOpen: (e: StoredEpisode) => void
}): React.JSX.Element {
  const date = new Date(`${slot.day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const canOpen = !!episode && slot.state !== 'upcoming'
  const title =
    slot.state === 'read'
      ? episode?.episode.title
      : slot.state === 'lost'
        ? episode
          ? `Lost page: “${episode.episode.title}” (written, never read on its day)`
          : 'Lost page: you missed this day'
        : slot.state === 'today'
          ? 'Today'
          : `Unlocks ${date}`
  return (
    <li style={{ animationDelay: `${index * 35}ms` }} className="envi-page-in">
      <button
        type="button"
        disabled={!canOpen}
        title={title}
        onClick={() => episode && onOpen(episode)}
        className={cn(
          'group relative flex aspect-[3/4] w-full flex-col justify-between rounded-lg p-2.5 text-left transition-transform',
          canOpen && 'hover:-translate-y-0.5',
          slot.state === 'read' && 'bg-fill-brand text-on-brand shadow-[0_6px_16px_rgb(14_122_103/0.25)]',
          slot.state === 'today' && 'envi-today border-2 border-fill-brand bg-surface-2 text-text-primary',
          slot.state === 'upcoming' && 'border border-dashed border-border-strong text-text-muted',
          slot.state === 'lost' && 'envi-torn bg-bg-neutral text-text-muted',
        )}
      >
        <span className="text-lg font-semibold tabular-nums">{slot.number}</span>
        <span className="flex items-center justify-between text-[11px]">
          <span className={cn(slot.state === 'lost' && 'line-through')}>{date}</span>
          {slot.state === 'read' && <Check className="size-3.5" strokeWidth={3} />}
          {slot.state === 'upcoming' && <Lock className="size-3" />}
          {slot.state === 'lost' && <span className="font-semibold">Lost</span>}
        </span>
      </button>
    </li>
  )
}

function Writing({ number }: { number: number }): React.JSX.Element {
  return (
    <div className="flex items-center gap-5">
      <span className="envi-quill grid size-12 shrink-0 place-items-center rounded-[14px] bg-bg-accent text-text-accent">
        <PenLine className="size-5" />
      </span>
      <div>
        <p className="text-lg font-semibold text-text-primary">Episode {number} is being written…</p>
        <p className="mt-1 text-sm text-text-muted">
          With your words, picking up where the story left off. This can take up to a minute.
        </p>
      </div>
    </div>
  )
}

/** Read today's episode: tomorrow's teaser and the time left until it unlocks. */
function CaughtUp({ today, onReread }: { today: StoredEpisode; onReread: () => void }): React.JSX.Element {
  const [left, setLeft] = useState(untilMidnight())
  useEffect(() => {
    const t = setInterval(() => setLeft(untilMidnight()), 30_000)
    return () => clearInterval(t)
  }, [])
  const finale = today.number >= SEASON_LENGTH
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0 max-w-[62ch]">
        <p className="text-sm text-text-muted">Episode {today.number} done</p>
        {finale ? (
          <p className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">That was the season finale.</p>
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
              Next time: <span className="marker">{today.episode.teaser || 'the story goes on'}</span>
            </p>
            <p className="mt-2 text-sm text-text-secondary">Episode {today.number + 1} unlocks in {left}.</p>
          </>
        )}
      </div>
      <Button variant="secondary" onClick={onReread}>
        Read again
      </Button>
    </div>
  )
}

function SeasonOver({ read, lost, onNewSeason }: { read: number; lost: number; onNewSeason: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-lg font-semibold text-text-primary">The season is over.</p>
        <p className="mt-1 text-sm text-text-secondary">
          You read {read} of {SEASON_LENGTH} episodes{lost > 0 ? ` and lost ${lost}` : ', every single one'}.
        </p>
      </div>
      <Button variant="brand" size="lg" onClick={onNewSeason}>
        Start a new season
      </Button>
    </div>
  )
}

function untilMidnight(): string {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const mins = Math.max(1, Math.round((end.getTime() - now.getTime()) / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

const EPISODE_FX = `
@keyframes envi-page-in { from { opacity: 0; transform: translateY(8px) rotate(-1.5deg) } to { opacity: 1; transform: none } }
.envi-page-in { animation: envi-page-in 420ms cubic-bezier(.2,.8,.3,1) both }
@keyframes envi-today { 0%, 100% { box-shadow: 0 0 0 0 rgb(14 122 103 / .35) } 50% { box-shadow: 0 0 0 6px rgb(14 122 103 / 0) } }
.envi-today { animation: envi-today 2.2s ease-in-out infinite }
.envi-torn { clip-path: polygon(0 0, 100% 0, 100% 88%, 88% 94%, 76% 87%, 62% 95%, 48% 86%, 34% 94%, 20% 87%, 8% 95%, 0 88%); opacity: .75 }
@keyframes envi-quill { 0%, 100% { transform: rotate(-8deg) translateY(0) } 50% { transform: rotate(6deg) translateY(-2px) } }
.envi-quill svg { animation: envi-quill 900ms ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { .envi-page-in, .envi-today, .envi-quill svg { animation: none } }
`
