import { useEffect, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenText, Check, Clapperboard, Droplets, Flame, Gamepad2, NotebookPen, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import { ModeIcon } from '@/components/common/ModeIcon'
import { cn } from '@/lib/cn'
import { onWordsChanged, openSettingsDialog, settingsDialogStore } from '@/app'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getSettings } from '@/settings'
import * as wordbook from '@/wordbook'
import * as episodes from '@/episodes'
import { WordGarden } from '@/components/garden/WordGarden'
import { CollectionsSection } from './components/CollectionsSection'
import { recentDays } from './components/progressStrip'

/**
 * My words home. One clear statement of what today asks for (due + new words) with the Study action,
 * a quiet line of progress (streak, goal, level, mode), then today's quests, the week, ways to practise
 * for fun, and collections. Few boxes: structure comes from type, spacing and hairlines.
 */

/** Rough time per card, for the "about N minutes" hint. */
const SECONDS_PER_CARD = 9

export default function WordBook(): React.JSX.Element {
  const navigate = useNavigate()

  // Fetch entries for words added from lists that are still placeholders (background).
  useEffect(() => {
    void wordbook.fillMissingDict()
  }, [])

  const data = useAsyncData(
    () =>
      Promise.all([
        wordbook.studyStatus(),
        wordbook.segmentCounts(),
        wordbook.progressSnapshot(),
        getSettings(),
        wordbook.loadGarden(),
        episodes.loadSeason().catch(() => null),
      ]),
    [],
  )
  const reload = data.reload
  useEffect(() => onWordsChanged(() => void reload()), [reload])
  // The mode or the goal may change in Settings.
  const settingsOpen = useSyncExternalStore(settingsDialogStore.subscribe, settingsDialogStore.getSnapshot)
  useEffect(() => {
    if (!settingsOpen) void reload()
  }, [settingsOpen, reload])

  if (!data.data) {
    return (
      <>
        <TopBar segments={['My words']} />
        <div className="mx-auto w-full max-w-5xl px-10 pt-16">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-bg-neutral" />
          <div className="mt-4 h-5 w-56 animate-pulse rounded bg-bg-neutral" />
        </div>
      </>
    )
  }

  const [status, seg, progress, settings, plants, season] = data.data
  const total = seg.new + seg.due + seg.memorizing + seg.mastered
  const learned = total - seg.new
  const todo = status.due + status.newAvailable
  const minutes = Math.max(1, Math.round((todo * SECONDS_PER_CARD) / 60))
  const goal = Math.max(1, settings.dailyGoal)
  const lvl = wordbook.levelFor(progress.xp)
  const quests = wordbook.dailyQuests(settings.learningMode, goal, progress.today)
  const days = recentDays(progress.activeDays, Date.now(), 7)
  const mode = wordbook.modeInfo(settings.learningMode)
  const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

  return (
    <>
      <TopBar segments={['My words']} />
      <div className="mx-auto w-full max-w-5xl px-10 pb-16 pt-14">
        {/* Today */}
        <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
            <h1 className="text-[2.6rem] font-semibold leading-[1.1] tracking-tight text-text-primary">
              {total === 0
                ? 'Start your word list'
                : todo === 0
                  ? 'You’re done for today'
                  : status.due > 0
                    ? `${plural(status.due, 'word', 'words')} to review`
                    : `${plural(status.newAvailable, 'new word', 'new words')} to learn`}
            </h1>
            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-text-secondary">
              {total === 0
                ? 'Select a word in any app and press ⌥⌘E, look one up in Dictionary, or add a set from the word lists.'
                : todo === 0
                  ? 'Everything due is reviewed. Play a game or read a story if you want a little more.'
                  : status.due > 0 && status.newAvailable > 0
                    ? `Plus ${status.newAvailable} new. About ${plural(minutes, 'minute', 'minutes')}.`
                    : `About ${plural(minutes, 'minute', 'minutes')}.`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="lg" className="gap-1.5" onClick={() => navigate('/wordbook/books')}>
              <Plus />
              Add words
            </Button>
            {total > 0 && (
              <Button
                variant="brand"
                size="lg"
                className="gap-2 px-6"
                onClick={() => navigate(todo === 0 ? '/wordbook/play' : '/wordbook/study')}
              >
                {todo === 0 ? <Gamepad2 /> : <Play />}
                {todo === 0 ? 'Play' : 'Study'}
              </Button>
            )}
          </div>
        </section>

        {/* Progress line: streak, goal, level, mode. Plain text, no boxes. */}
        {total > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-border py-4 text-sm text-text-secondary">
            <span className="flex items-center gap-2">
              <Flame className={cn('size-4', progress.streak > 0 ? 'text-fill-brand' : 'text-text-muted')} strokeWidth={2} />
              <span className="font-semibold tabular-nums text-text-primary">{progress.streak}</span>
              day streak
            </span>
            <span className="flex items-center gap-2">
              <GoalRing value={progress.today.reviews} goal={goal} />
              <span>
                <span className="font-semibold tabular-nums text-text-primary">{Math.min(progress.today.reviews, goal)}</span>
                <span className="tabular-nums"> / {goal}</span> cards today
              </span>
            </span>
            <span>
              Level <span className="font-semibold tabular-nums text-text-primary">{lvl.level}</span>
              <span className="ml-2 tabular-nums text-text-muted">
                {lvl.xpInLevel} of {lvl.xpForNext} XP
              </span>
            </span>
            <button
              type="button"
              onClick={openSettingsDialog}
              title={`${mode.name}: ${mode.description} Click to change.`}
              className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-text-primary transition-colors hover:bg-fill-ghost-hover"
            >
              <ModeIcon mode={mode.id} className="size-4 text-text-accent" />
              {mode.name} mode
            </button>
          </div>
        )}

        {total > 0 && season && <EpisodeBanner view={season} onOpen={() => navigate('/wordbook/episodes')} />}

        {total > 0 && (
          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <h2 className="text-lg font-semibold text-text-primary">Your garden</h2>
              <div className="flex flex-wrap items-center gap-4">
                <GardenLegend plants={plants} />
                {plants.some((p) => p.stage === 'thirsty') && (
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => navigate('/wordbook/garden')}>
                    <Droplets className="size-3.5" />
                    Water {plants.filter((p) => p.stage === 'thirsty').length} plants
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Every word you save is a plant. Review the ones with a drop to keep them growing; mastered words flower.
            </p>
            <WordGarden
              plants={plants}
              onSelect={(p) => navigate(`/lookup?q=${encodeURIComponent(p.term)}`)}
              className="mt-2 h-[340px]"
            />
          </section>
        )}

        {total > 0 && (
          <div className="mt-12 grid gap-x-16 gap-y-12 lg:grid-cols-[3fr_2fr]">
            {/* Quests + week */}
            <section>
              <h2 className="text-lg font-semibold text-text-primary">Today’s quests</h2>
              <ul className="mt-4 space-y-3">
                {quests.map((q) => (
                  <li key={q.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full border',
                        q.done ? 'border-transparent bg-fill-brand text-on-brand' : 'border-border-strong',
                      )}
                    >
                      {q.done && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={cn('flex-1 text-[15px]', q.done ? 'text-text-muted line-through' : 'text-text-primary')}>
                      {q.title}
                    </span>
                    <span className="text-sm tabular-nums text-text-muted">
                      {q.progress} / {q.target}
                    </span>
                  </li>
                ))}
              </ul>

              <h2 className="mt-12 text-lg font-semibold text-text-primary">This week</h2>
              <div className="mt-4 flex gap-2" aria-label="Practice in the last 7 days">
                {days.map((d) => (
                  <div key={d.date.getTime()} className="flex flex-1 flex-col items-center gap-2">
                    <span
                      title={d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      className={cn(
                        'h-9 w-full rounded-md',
                        d.active ? 'bg-fill-brand' : 'bg-bg-neutral',
                        d.isToday && !d.active && 'border border-dashed border-border-stronger bg-transparent',
                      )}
                    />
                    <span className={cn('text-xs', d.isToday ? 'font-semibold text-text-primary' : 'text-text-muted')}>
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Other ways in */}
            <section>
              <h2 className="text-lg font-semibold text-text-primary">More practice</h2>
              <div className="mt-2 divide-y divide-border">
                <LinkRow
                  icon={<Gamepad2 />}
                  title="Games"
                  body="Match, unscramble, lightning round and more"
                  onClick={() => navigate('/wordbook/play')}
                />
                <LinkRow
                  icon={<Clapperboard />}
                  title="Daily episodes"
                  body="A story that continues every day, with your words"
                  onClick={() => navigate('/wordbook/episodes')}
                />
                <LinkRow
                  icon={<BookOpenText />}
                  title="Story"
                  body="A short story written with your words"
                  onClick={() => navigate('/wordbook/story')}
                />
                <LinkRow
                  icon={<NotebookPen />}
                  title="Notes"
                  body="Everything you jotted down about words"
                  onClick={() => navigate('/wordbook/notes')}
                />
              </div>

              <button
                type="button"
                onClick={() => navigate('/wordbook/words')}
                className="group mt-8 flex w-full items-baseline justify-between text-left"
              >
                <span>
                  <span className="text-3xl font-semibold tabular-nums text-text-primary">{total}</span>
                  <span className="ml-2 text-sm text-text-secondary">words saved, {learned} learned</span>
                </span>
                <span className="flex items-center gap-1 text-sm font-medium text-text-accent">
                  Browse
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </section>
          </div>
        )}

        <div className="mt-14">
          <CollectionsSection />
        </div>
      </div>
    </>
  )
}

/** Today's episode is waiting (not read yet): yesterday's cliffhanger as the hook. Hidden once read. */
function EpisodeBanner({ view, onOpen }: { view: episodes.SeasonView; onOpen: () => void }): React.JSX.Element | null {
  const n = view.todayNumber
  if (n == null || view.slots[n - 1]?.state !== 'today') return null
  const yesterday = view.episodes.get(n - 1)
  const lost = view.slots.filter((s) => s.state === 'lost').length
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group mt-8 flex w-full items-center gap-5 rounded-2xl border border-border-accent bg-bg-accent/40 px-6 py-5 text-left transition-colors hover:bg-bg-accent/70"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-fill-brand text-on-brand">
        <Clapperboard className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-text-accent">
          {view.season.bible.title} · Episode {n} is waiting
        </span>
        <span className="mt-1 block text-[15px] text-text-primary">
          {yesterday?.episode.teaser ? (
            <>
              Last time: <span className="marker">{yesterday.episode.teaser}</span>
            </>
          ) : (
            'Read it today, or this page of the story is lost.'
          )}
        </span>
        {lost > 0 && <span className="mt-1 block text-xs text-text-muted">{lost === 1 ? '1 lost page' : `${lost} lost pages`} so far</span>}
      </span>
      <ArrowRight className="size-5 shrink-0 text-text-accent transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

const LEGEND: { stage: wordbook.PlantStage; label: string; dot: string }[] = [
  { stage: 'seed', label: 'Seeds', dot: 'bg-[#d8b98a]' },
  { stage: 'sprout', label: 'Growing', dot: 'bg-[#4cb187]' },
  { stage: 'thirsty', label: 'Need water', dot: 'bg-[#79c4ee]' },
  { stage: 'bloom', label: 'In bloom', dot: 'bg-[#ff9eaa]' },
]

function GardenLegend({ plants }: { plants: readonly wordbook.Plant[] }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
      {LEGEND.map((l) => (
        <span key={l.stage} className="flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', l.dot)} />
          {l.label}
          <span className="tabular-nums text-text-secondary">{plants.filter((p) => p.stage === l.stage).length}</span>
        </span>
      ))}
    </div>
  )
}

function LinkRow({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  body: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 py-3.5 text-left [&_svg]:size-[18px] [&_svg]:shrink-0"
    >
      <span className="text-text-secondary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-text-primary">{title}</span>
        <span className="block truncate text-sm text-text-muted">{body}</span>
      </span>
      <ArrowRight className="text-text-muted transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

/** Small goal ring next to the "cards today" count; fills with the accent. */
function GoalRing({ value, goal }: { value: number; goal: number }): React.JSX.Element {
  const r = 9
  const c = 2 * Math.PI * r
  const ratio = Math.min(1, value / goal)
  return (
    <svg viewBox="0 0 24 24" className="size-5 -rotate-90" aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="3" className="stroke-bg-neutral-hover" />
      {ratio > 0 && (
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className="stroke-fill-brand transition-[stroke-dashoffset] duration-500"
        />
      )}
    </svg>
  )
}
