import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { LearningModeInfo } from '@/wordbook'

/**
 * A selectable learning-mode card (emoji, name, who it's for, description). Shared by the first-run
 * setup and the "Learning style" settings section. `badge` adds a small label next to the name.
 */
export function ModeCard({
  mode,
  selected,
  onSelect,
  badge,
  size = 'default',
}: {
  mode: LearningModeInfo
  selected: boolean
  onSelect: () => void
  badge?: string
  size?: 'default' | 'lg'
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'can-focus group relative flex w-full cursor-pointer items-start gap-3 rounded-xl border text-left transition-colors',
        size === 'lg' ? 'p-4' : 'p-3',
        selected
          ? 'border-border-accent bg-bg-accent/40'
          : 'border-border bg-surface-1 hover:border-border-strong hover:bg-fill-ghost-hover',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-surface-2 leading-none',
          size === 'lg' ? 'size-12 text-2xl' : 'size-9 text-lg',
        )}
      >
        {mode.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn('font-semibold text-text-primary', size === 'lg' ? 'text-base' : 'text-sm')}>
            {mode.name}
          </span>
          {badge && (
            <span className="rounded-full bg-bg-accent-chip px-2 py-0.5 text-[11px] font-medium text-text-accent">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs font-medium text-text-secondary">{mode.forWho}</span>
        <span className="mt-1 block text-[13px] leading-snug text-text-muted">{mode.description}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected ? 'border-transparent bg-fill-accent text-on-accent' : 'border-border-strong',
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
    </button>
  )
}
