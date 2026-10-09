import { useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenText, Check, Clapperboard, Droplets, Flame, Gamepad2, LibraryBig, Play } from 'lucide-react'
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
import { Seal } from '@/components/seal/Seal'
import { recentDays } from './components/progressStrip'
import { GardenGrew, GardenWorldChip } from './components/GardenWorlds'

/**
 * My words home. What today asks for (due + new words) with the one Study action and the due words as thirsty
 * seals, then the garden (with the way into All words), one "next" row (today's episode, else a game), and one
 * grouped Progress section (streak, goal, level, week, quests, learning mode). Collections and Notes live on All words;
 * episodes and stories on Play.
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
        wordbook.seenGardenTier(),
      ]),
    [],
  )
  const reload = data.reload
  const [grewSeen, setGrewSeen] = useState(false)
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

  const [status, seg, progress, settings, plants, season, seenTier] = data.data
  const total = seg.new + seg.due + seg.memorizing + seg.mastered
  const todo = status.due + status.newAvailable
  const minutes = Math.max(1, Math.round((todo * SECONDS_PER_CARD) / 60))
  const goal = Math.max(1, settings.dailyGoal)
  const lvl = wordbook.levelFor(progress.xp)
  const quests = wordbook.dailyQuests(settings.learningMode, goal, progress.today)
  const days = recentDays(progress.activeDays, Date.now(), 7)
  const mode = wordbook.modeInfo(settings.learningMode)
  const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

  const thirsty = plants.filter((p) => p.stage === 'thirsty')
  // The garden grows with the level (wordbook/gardenWorld.ts); a newly reached world is announced once.
  const world = wordbook.gardenWorld(lvl.level)
  const nextWorld = wordbook.nextGardenTier(lvl.level)
  const grew = world.tier > seenTier && !grewSeen

  return (
    <>
      <TopBar segments={['My words']} />
      <div className="mx-auto w-full max-w-5xl px-10 pb-16 pt-12">
        {/* Today: what is due, which words, and the one action. */}
        <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
            <h1 className="text-balance font-serif text-[2.75rem] font-bold leading-[1.08] tracking-[-0.015em] text-text-primary">
              {total === 0
                ? 'Start your word list'
                : todo === 0
                  ? 'All done for today'
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
              <LibraryBig />
              Browse word lists
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

        {thirsty.length > 0 && <DueWords plants={thirsty} onOpen={() => navigate('/wordbook/study')} />}

        {total > 0 && (
          <section className="mt-10" aria-labelledby="garden-title">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 id="garden-title" className="font-serif text-xl font-bold text-text-primary">
                  Your garden
                </h2>
                <GardenWorldChip level={lvl.level} xp={progress.xp} />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <GardenLegend plants={plants} />
                <button
                  type="button"
                  onClick={() => navigate('/wordbook/words')}
                  className="can-focus flex items-center gap-1 rounded-[10px] text-sm font-medium text-text-accent hover:underline"
                >
                  All {total} words
                  <ArrowRight className="size-3.5" />
                </button>
                {thirsty.length > 0 && season && episodeWaiting(season) && (
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => navigate('/wordbook/garden')}>
                    <Droplets className="size-3.5" />
                    Water {plural(thirsty.length, 'plant', 'plants')}
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Every word you save is a plant. Thirsty ones need a review; mastered words come into bloom.
              {nextWorld && ` Level up and it grows into a ${nextWorld.name.toLowerCase()} at level ${nextWorld.level}.`}
            </p>
            {grew && (
              <GardenGrew
                level={lvl.level}
                onDone={() => {
                  setGrewSeen(true)
                  void wordbook.markGardenTierSeen(world.tier)
                }}
              />
            )}
            <WordGarden
              plants={plants}
              level={lvl.level}
              reveal={grew ? world.tier : null}
              onSelect={(p) =>
                navigate(p.stage === 'thirsty' ? '/wordbook/garden' : `/lookup?q=${encodeURIComponent(p.term)}`)
              }
              className={cn(
                'mt-3 rounded-card bg-surface-1',
                world.tier >= 5 ? 'h-[440px]' : world.tier >= 2 ? 'h-[390px]' : 'h-[340px]',
              )}
            />
          </section>
        )}

        {total > 0 &&
          (season && episodeWaiting(season) ? (
            <EpisodeBanner view={season} onOpen={() => navigate('/wordbook/episodes')} />
          ) : (
            <NextGame thirsty={thirsty.length} done={todo === 0} onOpen={(path) => navigate(path)} />
          ))}

        {total > 0 && (
          <section className="mt-12 border-t border-border pt-8" aria-labelledby="progress-title">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="progress-title" className="font-serif text-xl font-bold text-text-primary">
                Progress
              </h2>
              <button
                type="button"
                onClick={() => openSettingsDialog('style')}
                title={`${mode.description} Click to change.`}
                className="can-focus flex items-center gap-1.5 rounded-[10px] px-2 py-1 text-sm text-text-secondary transition-colors hover:bg-fill-ghost-hover hover:text-text-primary"
              >
                <ModeIcon mode={mode.id} className="size-4 text-text-accent" />
                Learning mode: <span className="font-medium text-text-primary">{mode.name}</span>
              </button>
            </div>

            <div className="mt-6 grid gap-x-16 gap-y-10 lg:grid-cols-[3fr_2fr]">
              <div>
                <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Flame className={cn('size-4', progress.streak > 0 ? 'text-son' : 'text-text-muted')} />
                    <span className="font-semibold tabular-nums text-text-primary">{plural(progress.streak, 'day', 'days')}</span> in a row
                  </span>
                  <span className="flex items-center gap-2">
                    <span>
                      <span className="font-semibold tabular-nums text-text-primary">{Math.min(progress.today.reviews, goal)}</span> of{' '}
                      <span className="tabular-nums">{goal}</span> cards today
                    </span>
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-neutral-hover" aria-hidden>
                      <span
                        className="block h-full rounded-full bg-hoe transition-[width] duration-500"
                        style={{ width: `${Math.min(100, (progress.today.reviews / goal) * 100)}%` }}
                      />
                    </span>
                  </span>
                  <span>
                    Level <span className="font-semibold tabular-nums text-text-primary">{lvl.level}</span>
                    <span className="tabular-nums text-text-muted">
                      {' '}
                      · {lvl.xpInLevel} of {lvl.xpForNext} XP
                    </span>
                  </span>
                </p>

                <h3 className="mt-6 text-sm font-semibold text-text-primary">This week</h3>
                <ol className="mt-3 flex gap-2" aria-label="Practice in the last 7 days">
                  {days.map((d) => (
                    <li key={d.date.getTime()} className="flex flex-1 flex-col items-center gap-1.5">
                      <span
                        title={d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        className={cn(
                          'grid aspect-square w-full max-w-11 place-items-center rounded-[10px] font-serif text-sm font-bold',
                          d.active && d.isToday
                            ? 'bg-fill-brand text-on-brand'
                            : d.active
                              ? 'bg-[var(--marker)] text-text-accent'
                              : d.isToday
                              ? 'border border-dashed border-border-stronger text-text-muted'
                              : 'bg-bg-neutral text-text-muted',
                        )}
                      >
                        {d.date.getDate()}
                      </span>
                      <span className={cn('text-xs', d.isToday ? 'font-semibold text-text-primary' : 'text-text-muted')}>
                        {d.isToday ? 'Today' : d.label}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-primary">Today’s quests</h3>
                <ul className="mt-3 space-y-3">
                  {quests.map((q) => (
                    <li key={q.id} className="flex items-center gap-3">
                      <span
                        className={cn(
                          'grid size-5 shrink-0 place-items-center rounded-[6px]',
                          q.done ? 'bg-dong text-on-success' : 'border border-border-strong',
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
              </div>
            </div>
          </section>
        )}

      </div>
    </>
  )
}

/** The words due now, each with its thirsty seal; the whole row starts the review. */
function DueWords({ plants, onOpen }: { plants: readonly wordbook.Plant[]; onOpen: () => void }): React.JSX.Element {
  const shown = plants.slice(0, 8)
  const more = plants.length - shown.length
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Review ${plants.length} due words`}
      className="can-focus group mt-7 flex w-full flex-wrap items-center gap-x-5 gap-y-2.5 rounded-[14px] bg-surface-1 px-4 py-3 text-left transition-colors hover:bg-bg-neutral-hover"
    >
      {shown.map((p) => (
        <span key={p.dictId} className="flex items-center gap-2">
          <Seal stage="thirsty" term={p.term} size="sm" />
          <span className="font-serif text-[15px] font-semibold text-text-primary">{p.term}</span>
        </span>
      ))}
      {more > 0 && <span className="text-sm text-text-secondary">and {more} more</span>}
      <ArrowRight className="ml-auto size-4 text-text-primary transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

/** Today's episode is waiting (not read yet): yesterday's cliffhanger as the hook. Hidden once read. */
function EpisodeBanner({ view, onOpen }: { view: episodes.SeasonView; onOpen: () => void }): React.JSX.Element | null {
  const n = view.todayNumber
  if (n == null || !episodeWaiting(view)) return null
  const yesterday = view.episodes.get(n - 1)
  const lost = view.slots.filter((s) => s.state === 'lost').length
  return (
    <button
      type="button"
      onClick={onOpen}
      className="can-focus group mt-10 flex w-full items-center gap-5 rounded-card bg-surface-1 px-6 py-5 text-left text-text-primary transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-fill-brand text-on-brand">
        <Clapperboard className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-lg font-bold">
          Episode {n} of {view.season.bible.title} is waiting
        </span>
        <span className="mt-1 block text-[15px] text-text-secondary">
          {yesterday?.episode.teaser ? <>Last time: {yesterday.episode.teaser}</> : 'Today’s page of your story, written with your words.'}
        </span>
        {lost > 0 && <span className="font-hand mt-1 block text-base leading-tight text-text-accent">{lost === 1 ? '1 page missed' : `${lost} pages missed`} so far</span>}
      </span>
      <ArrowRight className="size-5 shrink-0 text-fill-brand transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

const LEGEND: { stage: wordbook.PlantStage; label: string }[] = [
  { stage: 'seed', label: 'Seeds' },
  { stage: 'sprout', label: 'Growing' },
  { stage: 'thirsty', label: 'Thirsty' },
  { stage: 'bloom', label: 'In bloom' },
]

/** Garden legend in the seal's own stages, so the counts read the same way everywhere a word appears. */
function GardenLegend({ plants }: { plants: readonly wordbook.Plant[] }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
      {LEGEND.map((l) => (
        <span key={l.stage} className="flex items-center gap-1.5">
          <Seal stage={l.stage} term={l.label} size="sm" />
          {l.label}
          <span className="font-semibold tabular-nums text-text-primary">{plants.filter((p) => p.stage === l.stage).length}</span>
        </span>
      ))}
    </div>
  )
}

/** Today's episode exists and hasn't been read yet. */
function episodeWaiting(view: episodes.SeasonView): boolean {
  const n = view.todayNumber
  return n != null && view.slots[n - 1]?.state === 'today'
}

/**
 * The one "next" row when no episode is waiting: thirsty plants first; when everything is done (the primary action is
 * already Play) a story instead, so the row never repeats the primary; otherwise a review round.
 */
function NextGame({
  thirsty,
  done,
  onOpen,
}: {
  thirsty: number
  done: boolean
  onOpen: (path: string) => void
}): React.JSX.Element {
  const next =
    thirsty > 0
      ? {
          path: '/wordbook/garden',
          icon: <Droplets className="size-5" />,
          title: 'Garden rescue',
          body: `Water ${thirsty === 1 ? 'your thirsty plant' : `your ${thirsty} thirsty plants`} by remembering their words.`,
        }
      : done
        ? {
            path: '/wordbook/story',
            icon: <BookOpenText className="size-5" />,
            title: 'Read a short story',
            body: 'A new story written with the words you are learning.',
          }
        : {
            path: '/wordbook/play',
            icon: <Gamepad2 className="size-5" />,
            title: 'Play a review round',
            body: 'Word Fishing, Bubble Tea Shop and more, with the words you are learning.',
          }
  return (
    <button
      type="button"
      onClick={() => onOpen(next.path)}
      className="can-focus group mt-10 flex w-full items-center gap-5 rounded-card bg-surface-1 px-6 py-5 text-left text-text-primary transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-dong text-on-success">{next.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-lg font-bold">{next.title}</span>
        <span className="mt-1 block text-[15px] text-text-secondary">{next.body}</span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-fill-brand transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
