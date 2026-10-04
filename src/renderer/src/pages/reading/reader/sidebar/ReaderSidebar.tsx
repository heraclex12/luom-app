import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Bookmark, BookOpen, ChevronRight, Highlighter, List } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { AnnotationRecord, BookmarkRecord, CfiRange, TocNode } from '@/reading'
import { AnnotationList } from './AnnotationList'
import { BookmarkList } from './BookmarkList'

/**
 * Reader left sidebar — navigation for the current book: Contents / Highlights / Bookmarks tabs.
 * Contents comes from engine `getTOC`; Highlights / Bookmarks read the shared annotationStore.
 * Toggled from the header bar; collapse width animation lives in the parent.
 */

type Tab = 'toc' | 'annotations' | 'bookmarks'

export interface ReaderSidebarProps {
  className?: string
  /** Whether the sidebar is open (used to auto-locate the current chapter on open). */
  open: boolean
  /** TOC tree (engine `getTOC()`). */
  toc: TocNode[]
  /** Current chapter href (engine relocate `tocItem.href`) for highlighting; null = unknown. */
  currentHref: string | null
  /** Reader's current page; null = page map not ready, hide the "Current position" row. */
  currentPage: number | null
  /** Visible range [start, end) from engine relocate, shared by Highlights / Bookmarks; null = no position yet. */
  visibleRange: CfiRange | null
  /** Book fraction → page number: each chapter's start page is `pageOfFraction(fractionStart)`. */
  pageOfFraction: (fraction: number) => number | null
  /** cfi → page number: the "p N" on highlight / bookmark items. */
  pageOfCfi: (cfi: string) => number | null
  /** Click a TOC item to jump to that chapter. */
  onNavigate: (href: string) => void
  /** Click "Current position" to jump back to the reading point. */
  onNavigateToCurrent: () => void
  /** Highlights: click to jump / hover edit (note dialog) / delete. */
  onNavigateAnnotation: (a: AnnotationRecord) => void
  onEditAnnotation: (id: string) => void
  onRemoveAnnotation: (id: string) => void
  /** Bookmarks: click to jump / rename / delete / add from empty state. */
  onNavigateBookmark: (b: BookmarkRecord) => void
  onRenameBookmark: (id: string, title: string) => void
  onRemoveBookmark: (id: string) => void
  onAddBookmark: () => void
}

export function ReaderSidebar({
  className,
  open,
  toc,
  currentHref,
  currentPage,
  visibleRange,
  pageOfFraction,
  pageOfCfi,
  onNavigate,
  onNavigateToCurrent,
  onNavigateAnnotation,
  onEditAnnotation,
  onRemoveAnnotation,
  onNavigateBookmark,
  onRenameBookmark,
  onRemoveBookmark,
  onAddBookmark,
}: ReaderSidebarProps): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('toc')

  return (
    <aside className={cn('flex flex-col bg-page-bg', className)}>
      {/* Header: three tabs (toggle lives in the header bar) */}
      <div className="flex h-12 shrink-0 items-center px-2">
        <ToggleGroup
          className="h-8 flex-1"
          value={tab}
          onValueChange={(v) => v && setTab(v as Tab)}
        >
          <ToggleGroupItem value="toc" className="flex-1 px-2" aria-label="Contents">
            <List className="size-4" />
            <span className="text-xs">Contents</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="annotations" className="flex-1 px-2" aria-label="Highlights">
            <Highlighter className="size-4" />
            <span className="text-xs">Highlights</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="bookmarks" className="flex-1 px-2" aria-label="Bookmarks">
            <Bookmark className="size-4" />
            <span className="text-xs">Bookmarks</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Tab content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'toc' ? (
          <TocTree
            open={open}
            toc={toc}
            currentHref={currentHref}
            currentPage={currentPage}
            pageOfFraction={pageOfFraction}
            onNavigate={onNavigate}
            onNavigateToCurrent={onNavigateToCurrent}
          />
        ) : tab === 'annotations' ? (
          <AnnotationList
            toc={toc}
            visibleRange={visibleRange}
            pageOfCfi={pageOfCfi}
            onNavigate={onNavigateAnnotation}
            onEdit={onEditAnnotation}
            onRemove={onRemoveAnnotation}
          />
        ) : (
          <BookmarkList
            toc={toc}
            visibleRange={visibleRange}
            pageOfCfi={pageOfCfi}
            onNavigate={onNavigateBookmark}
            onRename={onRenameBookmark}
            onRemove={onRemoveBookmark}
            onAddBookmark={onAddBookmark}
          />
        )}
      </div>
    </aside>
  )
}

// ── TOC tree ───────────────────────────────────────────────────────────────

/** A flattened row: a TOC item, or the injected "Current position" row. `key` is the tree path (stable). */
type Row =
  | { kind: 'item'; node: TocNode; depth: number; key: string; hasChildren: boolean; expanded: boolean }
  | { kind: 'current'; depth: number; key: string }

/** Flatten the TOC tree depth-first by expanded set. Keys are tree paths, stable and unique. */
function flatten(nodes: TocNode[], expanded: Set<string>, depth: number, prefix: string, out: Row[]): void {
  nodes.forEach((node, i) => {
    const key = prefix ? `${prefix}.${i}` : `${i}`
    const hasChildren = node.subitems.length > 0
    const isExpanded = expanded.has(key)
    out.push({ kind: 'item', node, depth, key, hasChildren, expanded: isExpanded })
    if (hasChildren && isExpanded) flatten(node.subitems, expanded, depth + 1, key, out)
  })
}

/** Key chain (root → node) for the node with this href; null if not found. */
function pathToHref(nodes: TocNode[], href: string, prefix: string): string[] | null {
  for (let i = 0; i < nodes.length; i++) {
    const key = prefix ? `${prefix}.${i}` : `${i}`
    if (nodes[i].href === href) return [key]
    const sub = pathToHref(nodes[i].subitems, href, key)
    if (sub) return [key, ...sub]
  }
  return null
}

function TocTree({
  open,
  toc,
  currentHref,
  currentPage,
  pageOfFraction,
  onNavigate,
  onNavigateToCurrent,
}: {
  open: boolean
  toc: TocNode[]
  currentHref: string | null
  currentPage: number | null
  pageOfFraction: (fraction: number) => number | null
  onNavigate: (href: string) => void
  onNavigateToCurrent: () => void
}): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Key chain of the current chapter (incl. itself): ancestors auto-expand, last key is highlight/scroll target.
  const currentPath = useMemo(
    () => (currentHref ? pathToHref(toc, currentHref, '') : null),
    [toc, currentHref],
  )

  // Auto-locate on open / chapter change: merge ancestors into the expanded set (additive only).
  useEffect(() => {
    if (!currentPath || currentPath.length <= 1) return
    const ancestors = currentPath.slice(0, -1)
    setExpanded((prev) => {
      if (ancestors.every((k) => prev.has(k))) return prev
      const next = new Set(prev)
      ancestors.forEach((k) => next.add(k))
      return next
    })
  }, [currentPath])

  // Flatten + inject the "Current position" row after the current chapter.
  const rows = useMemo(() => {
    const flat: Row[] = []
    flatten(toc, expanded, 0, '', flat)
    const activeKey = currentPath?.at(-1)
    if (activeKey && currentPage != null) {
      const at = flat.findIndex((r) => r.kind === 'item' && r.key === activeKey)
      if (at >= 0) {
        const depth = (flat[at] as Extract<Row, { kind: 'item' }>).depth + 1
        flat.splice(at + 1, 0, { kind: 'current', depth, key: `${activeKey}::current` })
      }
    }
    return flat
  }, [toc, expanded, currentPath, currentPage])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 34,
    overscan: 12,
    getItemKey: (index) => rows[index].key,
  })

  // Scroll current chapter to center only on open / chapter change — deliberately not on rows, or expanding
  // unrelated chapters would yank back. Read latest rows via ref; rAF waits for auto-expand.
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const activeKey = currentPath?.at(-1)
  useEffect(() => {
    if (!open || !activeKey) return
    const raf = requestAnimationFrame(() => {
      const idx = rowsRef.current.findIndex((r) => r.kind === 'item' && r.key === activeKey)
      if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center' })
    })
    return () => cancelAnimationFrame(raf)
  }, [open, activeKey, virtualizer])

  const toggle = (key: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  if (toc.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="text-xs leading-relaxed text-text-muted">This book has no table of contents</p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2" role="tree">
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index]
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              {row.kind === 'current' ? (
                <CurrentRow depth={row.depth} page={currentPage} onClick={onNavigateToCurrent} />
              ) : (
                <TocRow
                  node={row.node}
                  depth={row.depth}
                  hasChildren={row.hasChildren}
                  expanded={row.expanded}
                  active={!!row.node.href && row.node.href === currentHref}
                  page={row.node.fractionStart == null ? null : pageOfFraction(row.node.fractionStart)}
                  onToggle={() => toggle(row.key)}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** A TOC row: indent + expand arrow (if children) + title (truncated) + start page (if any). Current highlighted. */
function TocRow({
  node,
  depth,
  hasChildren,
  expanded,
  active,
  page,
  onToggle,
  onNavigate,
}: {
  node: TocNode
  depth: number
  hasChildren: boolean
  expanded: boolean
  active: boolean
  page: number | null
  onToggle: () => void
  onNavigate: (href: string) => void
}): React.JSX.Element {
  const clickable = !!node.href
  return (
    <div
      role="treeitem"
      aria-current={active ? 'true' : undefined}
      aria-expanded={hasChildren ? expanded : undefined}
      onClick={clickable ? () => onNavigate(node.href as string) : undefined}
      className={cn(
        'flex min-h-[34px] items-center gap-1 rounded-md py-1.5 pr-2 text-left transition-colors',
        clickable && 'cursor-pointer',
        active ? 'bg-bg-400 text-text-primary' : clickable && 'hover:bg-bg-300',
      )}
      style={{ paddingInlineStart: `${depth * 14 + 4}px` }}
      title={node.label}
    >
      {hasChildren ? (
        <button
          type="button"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="grid size-5 shrink-0 place-items-center rounded text-text-muted hover:text-text-primary"
        >
          <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>
      ) : (
        <span className="size-5 shrink-0" aria-hidden />
      )}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          active ? 'font-medium text-text-primary' : 'text-text-secondary',
        )}
      >
        {node.label}
      </span>
      {page != null && (
        <span className="shrink-0 pl-1 text-xs tabular-nums text-text-muted">{page}</span>
      )}
    </div>
  )
}

/** Injected "Current position" row: shows current page; click jumps back to the reading point. */
function CurrentRow({
  depth,
  page,
  onClick,
}: {
  depth: number
  page: number | null
  onClick: () => void
}): React.JSX.Element {
  return (
    <div
      role="treeitem"
      aria-current="true"
      onClick={onClick}
      className="flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-text-accent transition-colors hover:bg-bg-300"
      style={{ paddingInlineStart: `${depth * 14 + 4}px` }}
      title="Current position"
    >
      <BookOpen className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">Current position</span>
      {page != null && <span className="shrink-0 pl-1 text-xs tabular-nums">{page}</span>}
    </div>
  )
}
