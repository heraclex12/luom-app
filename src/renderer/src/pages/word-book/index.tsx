import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookPlus,
  GraduationCap,
  History,
  Layers,
  ListChecks,
  type LucideIcon,
  NotebookPen,
  Play,
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import { TodayStat } from './components/TodayStat'
import { FeatureCard } from './components/FeatureCard'
import { CollectionsSection } from './components/CollectionsSection'
import { onWordsChanged } from '@/app'
import { useAsyncData } from '@/hooks/useAsyncData'
import * as wordbook from '@/wordbook'

/**
 * My words home: dashboard layout with two hero cards (library + progress / today's queue + CTA)
 * above a grid of shortcuts.
 *
 * Library card uses segmentCounts (learned = total − new); Today card uses todayCounts
 * (studied today = new + reviewed today; due = all due cards, not capped by daily limits).
 */

/** Shortcut tiles. */
const FEATURES: { title: string; icon: LucideIcon; path?: string; disabled?: boolean }[] = [
  { title: 'My words', icon: ListChecks, path: '/wordbook/words' },
  { title: 'Notes', icon: NotebookPen, path: '/wordbook/notes' },
]

export default function WordBook(): React.JSX.Element {
  const navigate = useNavigate()

  // Entering My words: fetch entries for words added from lists that are still placeholders (background).
  useEffect(() => {
    void wordbook.fillMissingDict()
  }, [])

  const home = useAsyncData(() => Promise.all([wordbook.todayCounts(), wordbook.segmentCounts()]), [])
  const [today, seg] = home.data ?? [null, null]
  const reloadHome = home.reload
  useEffect(() => onWordsChanged(() => void reloadHome()), [reloadHome])

  const total = seg ? seg.new + seg.due + seg.memorizing + seg.mastered : 0
  const learned = seg ? total - seg.new : 0 // learned = no longer New (due + learning + mastered)
  const percent = total > 0 ? Math.round((learned / total) * 100) : 0
  const hasLibrary = !!seg && total > 0
  const newToday = today ? today.newDone + today.reviewDone : 0
  const dueReview = today ? today.dueTotal : 0

  return (
    <>
      <TopBar segments={['My words']} />
      <div className="mx-auto w-full max-w-5xl px-8 pb-12 pt-[12vh] lg:px-10">
        {/* Currently studying */}
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Studying</h2>
            <Button variant="secondary" size="default" className="gap-1.5" onClick={() => navigate('/wordbook/books')}>
              <BookPlus />
              Add from word lists
            </Button>
          </div>

          {!home.data ? (
            <Card className="flex items-center justify-center py-16 text-sm text-text-muted">Loading…</Card>
          ) : hasLibrary ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Left: library + progress */}
              <Card className="flex flex-col gap-6 p-6 lg:col-span-2">
                <div className="flex items-center gap-5">
                  <span className="grid size-16 shrink-0 place-items-center rounded-card bg-bg-neutral text-text-primary">
                    <Layers className="size-8" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-2xl font-medium leading-tight text-text-primary">My words</h3>
                    <p className="mt-1.5 truncate text-sm text-text-secondary">All your saved words in one place</p>
                  </div>
                </div>

                {/* Progress bar pinned to the card bottom; black fill, clay is reserved for the CTA. */}
                <div className="mt-auto space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-text-secondary">Progress</span>
                    <span className="text-sm font-medium text-text-primary">{percent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bg-neutral">
                    <div className="h-full rounded-full bg-fill-primary transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-text-primary">
                      Learned <span className="text-base font-medium">{learned}</span>
                    </span>
                    <span className="text-text-secondary">{total.toLocaleString()} words</span>
                  </div>
                </div>
              </Card>

              {/* Right: today's queue + the single clay CTA. */}
              <Card className="flex flex-col gap-4 p-6">
                <h3 className="text-[15px] font-semibold text-text-primary">Today</h3>
                <div className="space-y-1">
                  <TodayStat
                    icon={GraduationCap}
                    value={newToday}
                    label="Studied today"
                    onClick={() => navigate('/wordbook/today')}
                  />
                  <TodayStat
                    icon={History}
                    value={dueReview}
                    label="Due for review"
                    onClick={() => navigate('/wordbook/words?seg=due')}
                  />
                </div>
                <Button
                  variant="brand"
                  size="lg"
                  className="mt-auto w-full justify-center gap-2"
                  onClick={() => navigate('/wordbook/study')}
                >
                  <Play />
                  Study
                </Button>
              </Card>
            </div>
          ) : (
            /* Empty state: no words yet. */
            <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-text-primary">No words yet</h3>
                <p className="text-sm text-text-secondary">
                  Select a word in any app and press ⌥⌘E, look one up in Dictionary, or add from word lists.
                </p>
              </div>
            </Card>
          )}
        </section>

        <CollectionsSection />

        {/* Shortcuts */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Shortcuts</h2>
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),300px))]">
            {FEATURES.map((f) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                disabled={f.disabled}
                onClick={f.path ? () => navigate(f.path!) : undefined}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
