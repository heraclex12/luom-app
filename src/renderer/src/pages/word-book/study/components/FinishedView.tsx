import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui'
import * as wordbook from '@/wordbook'
import type { ExtraCounts, ExtraKind } from '@/wordbook'
import { useAsyncData } from '@/hooks/useAsyncData'
import { WordGarden } from '@/components/garden/WordGarden'
import type { ExtraGroupSizes } from '@/wordbook'
import { GameFxStyles } from '../exercises/shared'

/**
 * Session finished: "All done for today" + Study more (Learn more new words / Review more / Review ahead,
 * with a group-size stepper). Options map to extraGroup kinds; availability comes from extraCounts.
 * Play mode (`celebrate`) adds a one-off CSS confetti burst behind the title. The word garden below the title grows
 * in the words studied today.
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

export function FinishedView({
  counts,
  sizes,
  onSizeChange,
  onStart,
  celebrate = false,
}: {
  /** Play mode: confetti burst on arrival. */
  celebrate?: boolean
  counts: ExtraCounts
  sizes: ExtraGroupSizes
  onSizeChange: (kind: ExtraKind, size: number) => void
  onStart: (kind: ExtraKind, size: number) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState<ExtraKind | null>(null)
  const navigate = useNavigate()
  const garden = useAsyncData(() => Promise.all([wordbook.loadGarden(), wordbook.todayStudiedWords()]), [])
  const grow = useMemo(() => new Set(garden.data?.[1] ?? []), [garden.data])
  const grown = garden.data ? garden.data[0].filter((p) => grow.has(p.dictId)).length : 0

  const option = OPTIONS.find((o) => o.kind === selected) ?? null
  const available = option ? counts[option.kind] : 0
  const size = option ? sizes[option.kind] : 0
  const effective = Math.min(size, available) // actual count, capped by availability
  const canStart = option != null && effective > 0

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-10">
      {celebrate && <Confetti />}
      <h1 className="mb-8 text-center text-2xl font-bold text-text-primary">
        
        All done for today
      </h1>

      {garden.data && garden.data[0].length > 0 && (
        <section className="-mx-6 -mt-4 mb-6">
          <WordGarden
            plants={garden.data[0]}
            grow={grow}
            onSelect={(p) => navigate(`/lookup?q=${encodeURIComponent(p.term)}`)}
            className="h-[280px]"
          />
          {grown > 0 && (
            <p className="text-center text-sm text-text-secondary">
              {grown === 1 ? '1 word' : `${grown} words`} grew in your garden today.
            </p>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2.5">
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
                'btn-squish flex flex-col gap-2 rounded-card border bg-surface-1 px-4 py-3.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50',
                isSelected ? 'border-border-accent' : 'border-border-300'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-[18px] shrink-0 place-items-center rounded-full border-2',
                    isSelected ? 'border-border-accent' : 'border-border-400'
                  )}
                >
                  {isSelected && <span className="size-2 rounded-full bg-fill-accent" />}
                </span>
                <span className="text-base font-semibold text-text-primary">{o.title}</span>
                <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                  {isSelected ? (
                    <BatchStepper
                      value={sizes[o.kind]}
                      onChange={(v) => onSizeChange(o.kind, v)}
                    />
                  ) : (
                    <span className="text-sm text-text-muted">
                      {avail} {o.unit}
                    </span>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="flex items-center justify-between pl-[30px] text-sm text-text-muted">
                  <span>{o.subtitle}</span>
                  <span>
                    {avail} {o.unit}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto pt-8">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!canStart}
          onClick={() => option && onStart(option.kind, size)}
        >
          {option && canStart ? `Start ${option.verb} · ${effective} ${effective === 1 ? 'card' : 'cards'}` : 'Choose an option above'}
        </Button>
      </div>
    </div>
  )
}

function BatchStepper({ value, onChange }: { value: number; onChange: (v: number) => void }): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border-300 p-0.5">
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
              'envi-fx absolute h-2.5 w-1.5 animate-[envi-confetti_1600ms_cubic-bezier(.2,.7,.4,1)_forwards] rounded-[1px] opacity-0',
              i % 3 === 0 && 'h-1.5 w-1.5 rounded-full',
              CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            )}
          />
        )
      })}
    </div>
  )
}
