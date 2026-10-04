// Shared empty-state placeholder:
// - variant='inline': tab/section level, a single line of text.
// - variant='detail': container/layout level (e.g. the right pane when no word is selected).

import { BookText } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  /** Icon (optional; only for variant='detail'; defaults to BookText) */
  icon?: React.ReactNode
  /** Title / description */
  title: string
  subtitle?: string
  /**
   * Layout:
   * - 'inline': tab/section level, one line of text (default)
   * - 'detail': container/layout level, centred icon + text
   */
  variant?: 'inline' | 'detail'
  /** Custom content slot */
  children?: React.ReactNode
  /** Extra class names for the root */
  className?: string
}

export function EmptyState({
  icon,
  title,
  subtitle,
  variant = 'inline',
  children,
  className,
}: EmptyStateProps): React.JSX.Element {
  if (variant === 'detail') {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center gap-3 text-center',
          className,
        )}
      >
        <div className="grid size-12 place-items-center rounded-full bg-bg-neutral-chip">
          {icon ?? <BookText className="size-6 text-text-muted" />}
        </div>
        <p className="text-sm text-text-muted">{title}</p>
        {subtitle ? <p className="text-sm text-text-muted">{subtitle}</p> : null}
        {children}
      </div>
    )
  }

  return <p className={cn('text-sm text-text-muted', className)}>{title}</p>
}
