/**
 * Empty state for reader sidebar tabs (Highlights / Bookmarks): icon + title, optional action button.
 *
 * Deliberately not reusing `components/common/EmptyState` — its visual style (icon backdrop, sizes,
 * spacing) differs from the sidebar's.
 */
export function SidebarEmptyState({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode
  title: string
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="text-text-muted">{icon}</span>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}
