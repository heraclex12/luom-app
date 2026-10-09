import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Flame, Gamepad2, Minus, Plus, Undo2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui'
import { Seal } from '@/components/seal/Seal'
import * as wordbook from '@/wordbook'
import type { ExtraCounts, ExtraKind } from '@/wordbook'
import { useAsyncData } from '@/hooks/useAsyncData'
import type { ExtraGroupSizes } from '@/wordbook'
import { GameFxStyles } from '../exercises/shared'
import type { SessionRecap } from '../recap'

/**
 * Session finished. Leads with a recap of this session (cards rated, Good vs Hard vs Again, the words that reached a
 * new stage as a row of seals, pressed for newly mastered ones, and the streak), then one primary action back to
 * My words. "Study more" (Learn more new words / Review more / Review ahead, with a group-size stepper; options map
 * to extraGroup kinds, availability from extraCounts) and Play stay a quiet, collapsed secondary group.
 * Play mode (`celebrate`) adds a one-off CSS confetti burst behind the title.
 */

const OPTIONS: {
  kind: ExtraKind
  title: string
  subtitle: string
  unit: string
  verb: string
}[] = [
  { kind: 'learn', title: 'Learn more new words', subtitle: "Beyond today's new-word limit, in the order added", unit: 'available', verb: 'learning' },
  { kind: 'review', title: 'Review more', subtitle: "Due cards beyond today's review limit", unit: 'due', verb: 'reviewing' },
  { kind: 'ahead', title: 'Review ahead', subtitle: 'Cards not yet due, soonest first', unit: 'available', verb: 'reviewing' },
]

/** Max group size (actual count is capped by availability). */
const MAX_GROUP_SIZE = 50
/** Seals shown in the recap row; the rest are counted. */
const MAX_SEALS = 24

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

export function FinishedView({
  recap,
  counts,
  sizes,
  onSizeChange,
  onStart,
  onUndo,
  celebrate = false,
}: {
  /** What happened in this session (sessionRecap). */
  recap: SessionRecap
  /** Play mode: confetti burst on arrival. */
  celebrate?: boolean
  counts: ExtraCounts
  sizes: ExtraGroupSizes
  onSizeChange: (kind: ExtraKind, size: number) => void
  onStart: (kind: ExtraKind, size: number) => void
  /** Shown briefly when the rating that ended the session can be undone. */
  onUndo?: () => void
}): React.JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false)
  const [selected, setSelected] = useState<ExtraKind | null>(null)
  const navigate = useNavigate()
  const streak = useAsyncData(() => wordbook.progressSnapshot().then((p) => p.streak), []).data ?? 0

  const option = OPTIONS.find((o) => o.kind === selected) ?? null
  const available = option ? counts[option.kind] : 0
  const size = option ? sizes[option.kind] : 0
  const effective = Math.min(size, available) // actual count, capped by availability
  const canStart = option != null && effective > 0
  const anyMore = OPTIONS.some((o) => counts[o.kind] > 0)

  const studied = recap.reviewed > 0 || recap.known > 0
  const seals = recap.grew.slice(0, MAX_SEALS)
  const learned = recap.grew.filter((g) => !g.mastered).length
  const mastered = recap.grew.length - learned

  return (
    <div className="relative mx-auto flex w-full max-w-xl flex-col px-6 pb-10 pt-[8vh]">
      {celebrate && <Confetti />}
      {onUndo && (
        <>
          <GameFxStyles />
          <Button
            variant="ghost"
            size="sm"
            aria-keyshortcuts="Z"
            className="envi-fade-in absolute top-4 right-6 gap-1.5"
            onClick={onUndo}
          >
            <Undo2 className="size-3.5" />
            Undo last rating
          </Button>
        </>
      )}

      <h1 className="font-serif text-3xl font-bold text-text-primary">All done for today</h1>

      {studied ? (
        <section aria-label="This session" className="mt-3 flex flex-col gap-7">
          <p className="max-w-[56ch] text-base leading-relaxed text-text-secondary">
            You reviewed <span className="font-semibold text-text-primary tabular-nums">{plural(recap.reviewed, 'card')}</span>:{' '}
            <span className="tabular-nums">{recap.good}</span> good, <span className="tabular-nums">{recap.hard}</span> hard,{' '}
            <span className="tabular-nums">{recap.again}</span> again.
            {streak > 0 && (
              <>
                {' '}
                <Flame aria-hidden className="inline size-4 -translate-y-px text-son" />{' '}
                <span className="font-semibold text-text-primary tabular-nums">{plural(streak, 'day')}</span> in a row.
              </>
            )}
          </p>

          {seals.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {[learned > 0 && `${plural(learned, 'new word')} stamped`, mastered > 0 && `${plural(mastered, 'word')} marked as known`]
                  .filter(Boolean)
                  .join(' · ')}
              </h2>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-4 gap-y-5">
                {seals.map((g, i) => (
                  <li key={g.dictId} className="flex flex-col items-center gap-2 text-center">
                    <Seal stage={g.stage} term={g.term} size="lg" pressing pressDelayMs={250 + i * 140} />
                    <span className="max-w-full truncate font-serif text-[15px] font-semibold text-text-primary">{g.term}</span>
                  </li>
                ))}
                {recap.grew.length > seals.length && (
                  <li className="self-center text-sm text-text-muted">+{recap.grew.length - seals.length} more</li>
                )}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">Nothing left in today's queue.</p>
      )}

      <div className="flex flex-col gap-3 pt-9">
        <Button variant="brand" size="lg" className="w-full" onClick={() => navigate('/wordbook')}>
          Back to My words
        </Button>

        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <div className="flex items-center justify-center gap-1">
            {anyMore && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  Study more
                  <ChevronDown className={cn('size-3.5 transition-transform duration-200', moreOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
            )}
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/wordbook/play')}>
              <Gamepad2 className="size-3.5" />
              Play a word game
            </Button>
          </div>
          <CollapsibleContent className="mt-3 flex flex-col gap-2">
            {OPTIONS.map((o) => {
              const isSelected = o.kind === selected
              const avail = counts[o.kind]
              const disabled = avail <= 0
              return (
                <button
                  key={o.kind}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelected(o.kind)}
                  className={cn(
                    'btn-squish flex flex-col gap-1.5 rounded-[14px] border bg-surface-1 px-3.5 py-2.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50',
                    isSelected ? 'border-border-accent' : 'border-border',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid size-4 shrink-0 place-items-center rounded-full border',
                        isSelected ? 'border-border-accent' : 'border-border-strong',
                      )}
                    >
                      {isSelected && <span className="size-2 rounded-full bg-fill-accent" />}
                    </span>
                    <span className="text-sm font-semibold text-text-primary">{o.title}</span>
                    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                      {isSelected ? (
                        <BatchStepper value={sizes[o.kind]} onChange={(v) => onSizeChange(o.kind, v)} />
                      ) : (
                        <span className="text-sm text-text-muted">
                          {avail} {o.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center justify-between pl-7 text-[13px] text-text-muted">
                      <span>{o.subtitle}</span>
                      <span>
                        {avail} {o.unit}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
            <Button
              variant="secondary"
              className="mt-1 w-full"
              disabled={!canStart}
              onClick={() => option && onStart(option.kind, size)}
            >
              {option && canStart ? `Start ${option.verb} · ${plural(effective, 'card')}` : 'Choose an option above'}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}


function BatchStepper({ value, onChange }: { value: number; onChange: (v: number) => void }): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5 rounded-[14px] border border-border p-0.5">
      <Button variant="ghost" size="iconXs" aria-label="Decrease" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus className="size-3.5" />
      </Button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums text-text-primary">{value}</span>
      <Button variant="ghost" size="iconXs" aria-label="Increase" disabled={value >= MAX_GROUP_SIZE} onClick={() => onChange(Math.min(MAX_GROUP_SIZE, value + 1))}>
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}

/** Confetti colours: theme fills so it follows light / dark. */
const CONFETTI_COLORS = ['bg-fill-accent', 'bg-fill-success', 'bg-fill-warning', 'bg-fill-danger', 'bg-fill-brand']
const CONFETTI_PIECES = 28

/** A single CSS burst from above the title (pieces fan out and fall, then fade). Deterministic layout. */
function Confetti(): React.JSX.Element {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-12 z-10 flex justify-center overflow-visible">
      <GameFxStyles />
      {Array.from({ length: CONFETTI_PIECES }, (_, i) => {
        const angle = (i / CONFETTI_PIECES) * Math.PI * 2
        const spread = 90 + ((i * 37) % 70)
        const style = {
          '--dx': `${Math.round(Math.cos(angle) * spread * 1.6)}px`,
          '--dy': `${Math.round(Math.sin(angle) * spread * 0.7 + 120 + ((i * 53) % 60))}px`,
          '--rot': `${(i * 67) % 360 + 180}deg`,
          animationDelay: `${(i % 5) * 40}ms`,
        } as React.CSSProperties
        return (
          <span
            key={i}
            style={style}
            className={cn(
              'envi-fx absolute h-2.5 w-1.5 animate-[envi-confetti_1600ms_cubic-bezier(.16,1,.3,1)_forwards] rounded-[1px] opacity-0',
              i % 3 === 0 && 'h-1.5 w-1.5 rounded-full',
              CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            )}
          />
        )
      })}
    </div>
  )
}
