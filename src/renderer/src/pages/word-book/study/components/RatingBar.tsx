import { cn } from '@/lib/cn'
import type { IntervalPreview } from '@/wordbook'
import { RATING_ORDER, type RatingKey } from '../keys'

/**
 * 3-grade rating (Again / Hard / Good), shown under the revealed answer on the card. Each button shows the real
 * next-interval preview from ts-fsrs (passed in by the page) and its key (1 / 2 / 3, see keys.ts; Enter = Good).
 */

export type { RatingKey }

const RATINGS: Record<RatingKey, { label: string; pigment: string }> = {
  again: { label: 'Again', pigment: 'bg-son' },
  hard: { label: 'Hard', pigment: 'bg-hoe' },
  good: { label: 'Good', pigment: 'bg-dong' },
}

export function RatingBar({
  onRate,
  preview,
  disabled = false,
  className,
}: {
  onRate: (key: RatingKey) => void
  preview: IntervalPreview
  /** Disabled while a rating is in flight. */
  disabled?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <div role="group" aria-label="How well did you know it?" className={cn('grid grid-cols-3 gap-2', className)}>
      {RATING_ORDER.map((key, i) => {
        const r = RATINGS[key]
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onRate(key)}
            aria-keyshortcuts={key === 'good' ? `${i + 1} Enter` : String(i + 1)}
            className="btn-squish flex flex-col gap-1 rounded-[6px] border border-border bg-surface-1 px-3.5 py-2.5 text-left transition-colors hover:border-border-strong outline-2 outline-offset-1 outline-transparent focus-visible:outline-accent-100 disabled:pointer-events-none"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className={cn('size-2 shrink-0 rounded-[2px]', r.pigment)} />
              <span className="text-[15px] font-semibold text-text-primary">{r.label}</span>
              <kbd className="ml-auto inline-grid h-5 min-w-5 place-items-center rounded-[4px] border border-border px-1 font-sans text-[11px] font-medium tabular-nums text-text-muted">
                {i + 1}
              </kbd>
            </span>
            <span className="pl-4 text-[13px] tabular-nums text-text-secondary">{preview[key]}</span>
          </button>
        )
      })}
    </div>
  )
}
