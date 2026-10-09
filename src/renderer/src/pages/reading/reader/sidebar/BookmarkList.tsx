import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Pencil, Trash2, X, Bookmark as BookmarkIcon } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { BookmarkRecord, CfiRange, TocNode } from '@/reading'
import { useBookmarks } from '../annotationStore'
import { ChapterGroupList } from './ChapterGroupList'
import { RowAction } from '../components/RowAction'
import { SidebarEmptyState } from './SidebarEmptyState'
import { groupByChapter } from './grouping'
import { formatDay, itemsInRange, pageLabel } from '../util'

/**
 * Sidebar "Bookmarks" tab — all bookmarks in the current book, grouped by chapter and sorted by
 * position. Shows title + page · date (page computed from cfi). Bookmarks within the visible screen
 * are marked current (see `util.itemsInRange`). Click jumps there (`onNavigate`); hover reveals
 * rename (inline, `onRename`) / delete (`onRemove`).
 * Empty state offers "Bookmark this page" (`onAddBookmark`).
 */

export interface BookmarkListProps {
  /** Current book's TOC: each bookmark's chapter is computed from its cfi (see grouping.ts). */
  toc: TocNode[]
  /** Visible range [start, end) from engine relocate; null = no position yet, highlight nothing. */
  visibleRange: CfiRange | null
  /** cfi → page number in current layout (null = not ready / unresolved, hide page). */
  pageOfCfi: (cfi: string) => number | null
  onNavigate: (b: BookmarkRecord) => void
  onRename: (id: string, title: string) => void
  onRemove: (id: string) => void
  /** Empty-state "Bookmark this page": add a bookmark at the current position. */
  onAddBookmark: () => void
}

export function BookmarkList({
  toc,
  visibleRange,
  pageOfCfi,
  onNavigate,
  onRename,
  onRemove,
  onAddBookmark,
}: BookmarkListProps): React.JSX.Element {
  const bookmarks = useBookmarks()
  const groups = useMemo(() => groupByChapter(bookmarks, toc), [bookmarks, toc])
  // Bookmarks on this screen. Each needs a CFI parse, and Reader re-renders for unrelated reasons,
  // so memoize on the visible range endpoints.
  const onPage = useMemo(
    () => new Set(itemsInRange(bookmarks, visibleRange).map((b) => b.id)),
    [bookmarks, visibleRange],
  )
  // Auto-scroll to the first one on this page (if any).
  const currentId = bookmarks.find((b) => onPage.has(b.id))?.id ?? null

  const currentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [currentId])

  if (bookmarks.length === 0) {
    return (
      <SidebarEmptyState
        icon={<BookmarkIcon className="size-6" />}
        title="No bookmarks yet"
        action={
          <Button variant="secondary" size="sm" onClick={onAddBookmark}>
            Bookmark this page
          </Button>
        }
      />
    )
  }

  return (
    <ChapterGroupList
      groups={groups}
      renderItem={(b) => {
        return (
          <BookmarkRow
            key={b.id}
            bookmark={b}
            page={pageOfCfi(b.cfi)}
            current={onPage.has(b.id)}
            rowRef={b.id === currentId ? currentRef : undefined}
            onNavigate={() => onNavigate(b)}
            onRename={(title) => onRename(b.id, title)}
            onRemove={() => onRemove(b.id)}
          />
        )
      }}
    />
  )
}

/** One bookmark: icon + title + page · date; hover rename/delete; click jumps; current highlighted. */
function BookmarkRow({
  bookmark,
  page,
  current,
  rowRef,
  onNavigate,
  onRename,
  onRemove,
}: {
  bookmark: BookmarkRecord
  /** Computed page number (null = not ready). */
  page: number | null
  current: boolean
  rowRef?: React.Ref<HTMLDivElement>
  onNavigate: () => void
  onRename: (title: string) => void
  onRemove: () => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(bookmark.title)

  const beginEdit = (): void => {
    setDraft(bookmark.title)
    setEditing(true)
  }
  const save = (): void => {
    const next = draft.trim()
    if (next) onRename(next)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-lg bg-bg-300 p-2">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            else if (e.key === 'Escape') setEditing(false)
          }}
          className="h-8"
        />
        <div className="mt-1.5 flex justify-end gap-1">
          <Button variant="ghost" size="iconSm" aria-label="Cancel" onClick={() => setEditing(false)}>
            <X className="size-4" />
          </Button>
          <Button variant="ghost" size="iconSm" aria-label="Save" disabled={!draft.trim()} onClick={save}>
            <Check className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNavigate()
        }
      }}
      className={cn(
        'group flex cursor-pointer items-start gap-2 rounded-lg p-2 transition-colors',
        current ? 'bg-bg-400' : 'hover:bg-bg-300',
      )}
    >
      <BookmarkIcon className={cn('mt-0.5 size-4 shrink-0', current ? 'text-text-accent' : 'text-text-muted')} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] leading-snug text-text-secondary">{bookmark.title}</p>
        <span className="text-[11px] tabular-nums text-text-muted">
          {[pageLabel(page), formatDay(bookmark.createdAt)]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <RowAction label="Rename" onClick={beginEdit}>
          <Pencil className="size-3.5" />
        </RowAction>
        <RowAction label="Delete bookmark" danger onClick={onRemove}>
          <Trash2 className="size-3.5" />
        </RowAction>
      </div>
    </div>
  )
}
