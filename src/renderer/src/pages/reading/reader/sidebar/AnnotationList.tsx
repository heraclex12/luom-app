import { useEffect, useMemo, useRef } from 'react'
import { Highlighter, PenLine, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { AnnotationRecord, CfiRange, TocNode } from '@/reading'
import { useAnnotations } from '../annotationStore'
import { ChapterGroupList } from './ChapterGroupList'
import { RowAction } from '../components/RowAction'
import { SidebarEmptyState } from './SidebarEmptyState'
import { groupByChapter } from './grouping'
import { formatDay, highlightTextClass, itemsInRange, pageLabel, snippet } from '../util'

/**
 * Sidebar "Highlights" tab — all highlights in the current book, grouped by chapter and sorted by
 * position. Each shows the text in its color/style, a note preview if any, and page · date (page
 * computed from cfi, not persisted). Highlights within the visible screen are marked current
 * (see `util.itemsInRange`).
 * Click jumps to the text (`onNavigate`); hover reveals edit (`onEdit`) / delete (`onRemove`).
 * Data comes from the shared annotationStore, so new highlights appear immediately.
 */

export interface AnnotationListProps {
  /** Current book's TOC: each highlight's chapter is computed from its cfi (see grouping.ts). */
  toc: TocNode[]
  /** Visible range [start, end) from engine relocate; null = no position yet, highlight nothing. */
  visibleRange: CfiRange | null
  /** cfi → page number in current layout (null = not ready / unresolved, hide page). */
  pageOfCfi: (cfi: string) => number | null
  /** Click: jump to the highlighted text. */
  onNavigate: (a: AnnotationRecord) => void
  /** Hover "Edit": open the note dialog. */
  onEdit: (id: string) => void
  /** Hover "Delete": remove the highlight. */
  onRemove: (id: string) => void
}

export function AnnotationList({
  toc,
  visibleRange,
  pageOfCfi,
  onNavigate,
  onEdit,
  onRemove,
}: AnnotationListProps): React.JSX.Element {
  const annotations = useAnnotations()
  const groups = useMemo(() => groupByChapter(annotations, toc), [annotations, toc])
  // Highlights on this screen. Each needs a CFI parse, and Reader re-renders for unrelated reasons,
  // so memoize on the visible range endpoints.
  const onPage = useMemo(
    () => new Set(itemsInRange(annotations, visibleRange).map((a) => a.id)),
    [annotations, visibleRange],
  )
  // Auto-scroll to the first one on this screen (if any).
  const currentId = annotations.find((a) => onPage.has(a.id))?.id ?? null

  // On tab switch / current change, scroll the current item into view.
  const currentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [currentId])

  if (annotations.length === 0) {
    return <SidebarEmptyState icon={<Highlighter className="size-6" />} title="No highlights yet" />
  }

  return (
    <ChapterGroupList
      groups={groups}
      renderItem={(a) => (
        <AnnotationRow
          key={a.id}
          annotation={a}
          page={pageOfCfi(a.cfi)}
          current={onPage.has(a.id)}
          rowRef={a.id === currentId ? currentRef : undefined}
          onNavigate={() => onNavigate(a)}
          onEdit={() => onEdit(a.id)}
          onRemove={() => onRemove(a.id)}
        />
      )}
    />
  )
}

/** One highlight card: note preview + styled text + page · date; hover edit/delete; current highlighted. */
function AnnotationRow({
  annotation,
  page,
  current,
  rowRef,
  onNavigate,
  onEdit,
  onRemove,
}: {
  annotation: AnnotationRecord
  /** Computed page number (null = not ready). */
  page: number | null
  current: boolean
  rowRef?: React.Ref<HTMLDivElement>
  onNavigate: () => void
  onEdit: () => void
  onRemove: () => void
}): React.JSX.Element {
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
        'group cursor-pointer rounded-lg p-2 transition-colors',
        current ? 'bg-bg-400' : 'hover:bg-bg-300',
      )}
    >
      {annotation.note && (
        <p className="mb-1 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">{annotation.note}</p>
      )}
      <p className="line-clamp-3 text-[13px] leading-snug">
        <span className={highlightTextClass(annotation.color, annotation.style)}>
          {snippet(annotation.text, 120)}
        </span>
      </p>
      <div className="mt-1.5 flex h-5 items-center justify-between">
        <span className="text-[11px] tabular-nums text-text-muted">
          {[pageLabel(page), formatDay(annotation.createdAt)]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <RowAction label="Edit note" onClick={onEdit}>
            <PenLine className="size-3.5" />
          </RowAction>
          <RowAction label="Delete highlight" danger onClick={onRemove}>
            <Trash2 className="size-3.5" />
          </RowAction>
        </div>
      </div>
    </div>
  )
}
