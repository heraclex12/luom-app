import { useEffect, useSyncExternalStore } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { onWordsChanged, openSettingsDialog, settingsDialogStore } from '@/app'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getSettings } from '@/settings'
import * as wordbook from '@/wordbook'
import { recentDays } from './progressStrip'

/**
 * Progress card on the My words home: streak, level + XP, today's goal ring, 7-day activity strip,
 * today's quests and the current learning mode (opens Settings). Refreshes when words change and
 * when the settings dialog closes (mode / goal may have changed).
 */
export function ProgressCard(): React.JSX.Element | null {
  const data = useAsyncData(() => Promise.all([wordbook.progressSnapshot(), getSettings()]), [])
  const reload = data.reload
  useEffect(() => onWordsChanged(() => void reload()), [reload])
  const settingsOpen = useSyncExternalStore(settingsDialogStore.subscribe, settingsDialogStore.getSnapshot)
  useEffect(() => {
    if (!settingsOpen) void reload()
  }, [settingsOpen, reload])

  if (!data.data) return null
  const [snap, settings] = data.data
  const mode = wordbook.modeInfo(settings.learningMode)
  const goal = Math.max(1, settings.dailyGoal)
  const lvl = wordbook.levelFor(snap.xp)
  const quests = wordbook.dailyQuests(settings.learningMode, goal, snap.today)
  const days = recentDays(snap.activeDays, Date.now(), 7)
  const xpPercent = lvl.xpForNext > 0 ? Math.min(100, (lvl.xpInLevel / lvl.xpForNext) * 100) : 0

  return (
    <Card className="grid gap-6 p-6 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_1.15fr]">
      {/* Goal ring */}
      <div className="flex flex-col items-center justify-center gap-2 md:pr-2">
        <GoalRing value={snap.today.reviews} goal={goal} />
        <span className="text-xs text-text-secondary">Today’s goal</span>
      </div>

      {/* Streak, level, last 7 days */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl leading-none" aria-hidden>
              🔥
            </span>
            <span className="text-2xl font-medium leading-none text-text-primary">{snap.streak}</span>
            <span className="text-sm text-text-secondary">day streak</span>
          </div>
          <button
            type="button"
            onClick={openSettingsDialog}
            title="Change learning mode"
            className="btn-squish group flex shrink-0 items-center gap-1 rounded-full bg-bg-neutral px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-200 hover:text-text-primary"
          >
            <span aria-hidden>{mode.emoji}</span>
            {mode.name}
            <ChevronRight className="size-3.5 text-text-muted transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-text-primary">Level {lvl.level}</span>
            <span className="text-xs text-text-secondary">
              {lvl.xpInLevel} / {lvl.xpForNext} XP
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-neutral">
            <div className="h-full rounded-full bg-fill-primary transition-all" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-1.5" aria-label="Last 7 days">
          {days.map((d) => (
            <div key={d.date.getTime()} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                title={d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                className={cn(
                  'size-3 rounded-full',
                  d.active ? 'bg-fill-brand' : 'bg-bg-neutral',
                  d.isToday && !d.active && 'ring-1 ring-fill-brand ring-inset'
                )}
              />
              <span className={cn('text-[11px]', d.isToday ? 'font-medium text-text-primary' : 'text-text-muted')}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Today's quests */}
      <div className="flex min-w-0 flex-col gap-2 md:col-span-2 lg:col-span-1 lg:border-l lg:border-border-300 lg:pl-6">
        <h3 className="text-[15px] font-semibold text-text-primary">Today’s quests</h3>
        <ul className="space-y-1.5">
          {quests.map((q) => (
            <li key={q.id} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full',
                  q.done ? 'bg-fill-success text-on-success' : 'shadow-card-ring'
                )}
              >
                {q.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className={cn('min-w-0 flex-1 truncate', q.done ? 'text-text-secondary line-through' : 'text-text-primary')}>
                {q.title}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-text-muted">
                {q.progress}/{q.target}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

/** Circular progress toward the daily goal (black ring; full ring turns green). */
function GoalRing({ value, goal }: { value: number; goal: number }): React.JSX.Element {
  const r = 34
  const c = 2 * Math.PI * r
  const ratio = Math.min(1, value / goal)
  const done = value >= goal
  return (
    <div className="relative size-24">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-bg-neutral" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={cn('transition-[stroke-dashoffset] duration-500', done ? 'stroke-fill-success' : 'stroke-fill-primary')}
          style={{ opacity: ratio === 0 ? 0 : 1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-medium leading-none text-text-primary">{value}</span>
        <span className="mt-1 text-[11px] text-text-muted">of {goal}</span>
      </div>
    </div>
  )
}
