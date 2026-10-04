import type { ChapterGroup } from './grouping'

/**
 * Chapter-grouped list skeleton for the sidebar — scroll container + chapter headings + item stacks.
 * Shared by the Highlights and Bookmarks tabs; items come from `renderItem`.
 */
export function ChapterGroupList<T>({
  groups,
  renderItem,
}: {
  groups: ChapterGroup<T>[]
  renderItem: (item: T) => React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
      {groups.map((group) => (
        <div key={group.key} className="pb-1">
          <h3 className="truncate px-2 pb-1 pt-3 text-xs font-medium text-text-muted">{group.label}</h3>
          <div className="flex flex-col gap-1.5">{group.items.map(renderItem)}</div>
        </div>
      ))}
    </div>
  )
}
