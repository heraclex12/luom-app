import { cn } from '@/lib/cn'

/**
 * Small hover action button inside list rows/cards (edit / delete / rename…) — stops propagation so
 * the row's navigation doesn't fire. Shared by highlight, bookmark and notebook lists.
 */
export function RowAction({
  label,
  danger,
  onClick,
  children,
}: {
  label: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'grid size-6 place-items-center rounded text-text-muted transition-colors hover:bg-fill-ghost-hover',
        danger ? 'hover:text-text-danger' : 'hover:text-text-primary',
      )}
    >
      {children}
    </button>
  )
}
