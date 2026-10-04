import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/cn'

/**
 * Master list: word count + selectable rows. Presentational; filtering is done by the parent.
 * Rows with term=null (entry not cached yet) show a placeholder.
 */

/** A row: dictId + spelling (null if the entry is missing). */
export interface WordRow {
  dictId: number
  term: string | null
}

export function WordList({
  words,
  selectedId,
  onSelect,
}: {
  words: WordRow[]
  selectedId: number | null
  onSelect: (dictId: number) => void
}): React.JSX.Element {
  // Virtualized: only rows in view are rendered.
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: words.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 12,
    getItemKey: (index) => words[index].dictId,
  })

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-border-200">
      <div className="flex flex-col gap-3 px-3 pb-2 pt-3">
        {/* Word count */}
        <div className="flex items-center gap-2.5 px-1">
          <span className="h-4 w-[3px] rounded-full bg-fill-brand" />
          <span className="text-sm font-semibold text-text-primary tabular-nums">{words.length} words</span>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {words.length === 0 ? (
          <p className="px-3 pt-8 text-center text-sm text-text-muted">No words here yet</p>
        ) : (
          <ul className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const w = words[vi.index]
              return (
                <li
                  key={vi.key}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute inset-x-0 top-0"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <WordListItem
                    index={vi.index + 1}
                    term={w.term}
                    active={w.dictId === selectedId}
                    onSelect={() => onSelect(w.dictId)}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

function WordListItem({
  index,
  term,
  active,
  onSelect,
}: {
  index: number
  term: string | null
  active: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
        active ? 'bg-bg-400' : 'hover:bg-bg-300'
      )}
    >
      <span className="w-6 shrink-0 text-xs tabular-nums text-text-muted">{String(index).padStart(2, '0')}</span>
      {term ? (
        <span className={cn('min-w-0 flex-1 truncate text-sm', active ? 'font-medium text-text-primary' : 'text-text-secondary')}>
          {term}
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm italic text-text-muted">Loading…</span>
      )}
    </button>
  )
}
