import { cn } from '@/lib/cn'
import type { IntervalPreview } from '@/wordbook'

/**
 * 3-grade rating bar (Again / Hard / Good), shown after reveal.
 * Each button shows the real next-interval preview from ts-fsrs, passed in by the page.
 */

export type RatingKey = 'again' | 'hard' | 'good'

const RATINGS: { key: RatingKey; label: string; dot: string }[] = [
  { key: 'again', label: 'Again', dot: 'bg-fill-danger' },
  { key: 'hard', label: 'Hard', dot: 'bg-fill-warning' },
  { key: 'good', label: 'Good', dot: 'bg-fill-success' },
]

export function RatingBar({
  onRate,
  preview,
  disabled = false,
}: {
  onRate: (key: RatingKey) => void
  preview: IntervalPreview
  /** Disabled while a rating is in flight. */
  disabled?: boolean
}): React.JSX.Element {
  return (
    <div className="shrink-0 bg-bg-100">
      <div className="mx-auto flex max-w-2xl">
        {RATINGS.map((r) => (
          <button
            key={r.key}
            type="button"
            disabled={disabled}
            onClick={() => onRate(r.key)}
            className="btn-squish flex flex-1 flex-col items-center gap-1 py-4 disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="text-xs text-text-muted">{preview[r.key]}</span>
            <span className="text-base font-semibold text-text-primary">{r.label}</span>
            <span className={cn('h-[3px] w-5 rounded-full', r.dot)} />
          </button>
        ))}
      </div>
    </div>
  )
}
