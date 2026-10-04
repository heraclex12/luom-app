import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Shortcut card: hairline card + icon box + title; subtle hover.
 * `disabled` renders a greyed-out "Coming soon" placeholder.
 */
export function FeatureCard({
  icon: Icon,
  title,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon
  title: string
  onClick?: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'btn-squish group flex items-center gap-3.5 rounded-card bg-surface-1 p-4 text-left shadow-card-ring transition-colors',
        disabled ? 'cursor-not-allowed opacity-55' : 'hover:bg-bg-200'
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-lg bg-bg-neutral',
          disabled ? 'text-text-muted' : 'text-text-secondary'
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{title}</span>
      {disabled ? (
        <span className="shrink-0 text-xs text-text-muted">Coming soon</span>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  )
}
