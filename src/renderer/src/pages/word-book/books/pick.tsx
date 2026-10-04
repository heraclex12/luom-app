import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, Minus, Plus, Search, WifiOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge, Button, Card, Input, ToggleGroup, ToggleGroupItem, type BadgeProps } from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import { useAsyncData } from '@/hooks/useAsyncData'
import * as wordbook from '@/wordbook'
import type { WordSegment } from '@/wordbook'
import { toast } from '@/lib/toast'

/**
 * Word list picker (/wordbook/books/:bookId): loads the list's entries, marks words already in
 * My words (batched getWordSegments), and lets the user pick words to add.
 * Filters (All / Not added / Added, default Not added) + prefix search + checkboxes (shift-click
 * for ranges) + select all + sticky "Add to My words" bar → addWords.
 */

/** Membership: none = not in My words; otherwise its segment. */
type Member = 'none' | WordSegment
type Filter = 'all' | 'none' | 'joined'

/** Badge per segment for words already in My words. */
const SEGMENT_BADGE: Record<WordSegment, { variant: BadgeProps['variant']; label: string }> = {
  new: { variant: 'neutral', label: 'New' },
  memorizing: { variant: 'accent', label: 'Learning' },
  due: { variant: 'warning', label: 'Due' },
  mastered: { variant: 'success', label: 'Mastered' },
}

function matchFilter(member: Member, f: Filter): boolean {
  if (f === 'all') return true
  if (f === 'none') return member === 'none'
  return member !== 'none'
}

export default function PickWords(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { bookId } = useParams()
  const id = Number(bookId)
  const title = (location.state as { title?: string } | null)?.title ?? 'Word list'

  const entriesState = useAsyncData(() => wordbook.fetchBookEntries(id), [id])
  const entries = useMemo(() => entriesState.data ?? [], [entriesState.data])
  const dictIds = useMemo(() => entries.map((e) => e.dictId), [entries])

  // Membership lookup for all entries; reloaded after adding to refresh badges.
  const segState = useAsyncData(
    () => (dictIds.length ? wordbook.getWordSegments(dictIds) : Promise.resolve(new Map<number, WordSegment>())),
    [dictIds],
  )
  const segments = segState.data ?? new Map<number, WordSegment>()

  const [filter, setFilter] = useState<Filter>('none')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [joining, setJoining] = useState(false)
  const lastIndex = useRef<number | null>(null)
  // Filter/search change reorders rows, so reset the shift-click anchor.
  useEffect(() => {
    lastIndex.current = null
  }, [filter, query])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries
      .map((e) => ({ dictId: e.dictId, term: e.term, member: (segments.get(e.dictId) ?? 'none') as Member }))
      .filter((w) => matchFilter(w.member, filter) && (q === '' || w.term.toLowerCase().startsWith(q)))
  }, [entries, segments, filter, query])

  // Memoize O(n) derivations; virtualization re-renders often.
  const selectable = useMemo(() => visible.filter((w) => w.member === 'none'), [visible])
  const selectedVisible = useMemo(
    () => selectable.reduce((n, w) => (selected.has(w.dictId) ? n + 1 : n), 0),
    [selectable, selected],
  )
  const allState: 'off' | 'on' | 'partial' =
    selectedVisible === 0 ? 'off' : selectedVisible === selectable.length ? 'on' : 'partial'

  // Virtualized list: only rows in view are rendered.
  const scrollRef = useRef<HTMLElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 12,
    paddingStart: 12,
    paddingEnd: 12,
    getItemKey: (index) => visible[index].dictId,
  })

  /** Toggle a row (only words not yet added); shift extends from the last clicked row. */
  function toggleAt(index: number, shift: boolean): void {
    const item = visible[index]
    if (!item || item.member !== 'none') return
    setSelected((prev) => {
      const next = new Set(prev)
      if (shift && lastIndex.current !== null) {
        const [a, b] = [lastIndex.current, index].sort((x, y) => x - y)
        const turnOn = !next.has(item.dictId)
        for (let i = a; i <= b; i++) {
          const w = visible[i]
          if (w?.member !== 'none') continue
          if (turnOn) next.add(w.dictId)
          else next.delete(w.dictId)
        }
      } else if (next.has(item.dictId)) {
        next.delete(item.dictId)
      } else {
        next.add(item.dictId)
      }
      return next
    })
    lastIndex.current = index
  }

  function toggleSelectAll(): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allState === 'on') selectable.forEach((w) => next.delete(w.dictId))
      else selectable.forEach((w) => next.add(w.dictId))
      return next
    })
  }

  /** Add selected words to My words, then refresh badges and clear the selection. */
  async function commit(): Promise<void> {
    if (selected.size === 0 || joining) return
    setJoining(true)
    try {
      await wordbook.addWords([...selected])
      setSelected(new Set())
      lastIndex.current = null
      await segState.reload()
    } catch {
      toast.error("Couldn't add words. Please try again.")
    } finally {
      setJoining(false)
    }
  }

  // Failed to load entries → full-page error state.
  if (entriesState.error) return <OfflinePage title={title} onRetry={() => void entriesState.reload()} />

  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['My words', 'Word lists', title]} backTo="/wordbook/books" />

      {/* Filter + search */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-200 px-4">
        <ToggleGroup value={filter} onValueChange={(v) => v && setFilter(v as Filter)}>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="none">Not added</ToggleGroupItem>
          <ToggleGroupItem value="joined">Added</ToggleGroupItem>
        </ToggleGroup>
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search words"
            className="h-9 rounded-lg pl-9"
          />
        </div>
      </header>

      {/* Word count, pinned below the filter bar */}
      <div className="flex shrink-0 items-center gap-2.5 px-5 pb-1 pt-3">
        <span className="h-4 w-[3px] rounded-full bg-fill-brand" />
        <span className="text-sm font-semibold tabular-nums text-text-primary">{visible.length} words</span>
      </div>

      {/* Word list (virtualized) */}
      <main ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2">
        {entriesState.loading && entries.length === 0 ? (
          <p className="px-3 pt-12 text-center text-sm text-text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-3 pt-12 text-center text-sm text-text-muted">
            {filter === 'none' ? 'All words in this list are already in My words' : 'No matching words'}
          </p>
        ) : (
          <ul className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const w = visible[vi.index]
              return (
                <li
                  key={vi.key}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute inset-x-0 top-0"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <PickRow
                    term={w.term}
                    member={w.member}
                    checked={selected.has(w.dictId)}
                    onToggle={(shift) => toggleAt(vi.index, shift)}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {/* Sticky action bar */}
      <footer className="sticky bottom-0 z-10 flex shrink-0 items-center gap-4 bg-page-bg px-4 py-3">
        <button
          type="button"
          onClick={toggleSelectAll}
          disabled={selectable.length === 0}
          className="btn-squish group flex items-center gap-2 text-sm text-text-secondary disabled:opacity-40"
        >
          <PickBox state={allState} />
          Select all not added
        </button>
        <span className="ml-auto text-sm text-text-secondary">
          <span className="font-semibold tabular-nums text-text-primary">{selected.size}</span> selected
        </span>
        <Button variant="brand" disabled={selected.size === 0} loading={joining} onClick={() => void commit()} className="gap-1.5">
          <Plus />
          Add to My words
        </Button>
      </footer>
    </div>
  )
}

/** Entry row: selectable if not added; otherwise dimmed with a segment badge. */
function PickRow({
  term,
  member,
  checked,
  onToggle,
}: {
  term: string
  member: Member
  checked: boolean
  onToggle: (shift: boolean) => void
}): React.JSX.Element {
  const owned = member !== 'none'
  const boxState: PickBoxState = owned ? 'owned' : checked ? 'on' : 'off'

  const inner = (
    <>
      <PickBox state={boxState} />
      <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', owned ? 'text-text-secondary' : 'text-text-primary')}>
        {term}
      </span>
      {owned && <Badge variant={SEGMENT_BADGE[member].variant}>{SEGMENT_BADGE[member].label}</Badge>}
    </>
  )

  if (owned) {
    return <div className="flex items-center gap-3 rounded-lg px-3 py-2">{inner}</div>
  }
  return (
    <button
      type="button"
      onClick={(e) => onToggle(e.shiftKey)}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-bg-300"
    >
      {inner}
    </button>
  )
}

type PickBoxState = 'off' | 'on' | 'partial' | 'owned'

/** Custom checkbox: off / on / partial / owned (already added, not selectable). */
function PickBox({ state }: { state: PickBoxState }): React.JSX.Element {
  if (state === 'off') {
    return <span className="size-5 shrink-0 rounded-md border-2 border-border-300 transition-colors group-hover:border-border-400" />
  }
  if (state === 'owned') {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-bg-400 text-text-muted">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    )
  }
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-md bg-fill-primary text-on-primary">
      {state === 'partial' ? <Minus className="size-3.5" strokeWidth={3} /> : <Check className="size-3.5" strokeWidth={3} />}
    </span>
  )
}

function OfflinePage({ title, onRetry }: { title: string; onRetry: () => void }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['My words', 'Word lists', title]} backTo="/wordbook/books" />
      <div className="grid flex-1 place-items-center px-6">
        <Card className="flex max-w-md flex-col items-center gap-3 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-card bg-bg-neutral text-text-muted">
            <WifiOff className="size-7" />
          </span>
          <div className="space-y-1">
            <h3 className="text-xl font-medium text-text-primary">Couldn't load this word list</h3>
            <p className="text-sm text-text-secondary">Please try again.</p>
          </div>
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </Card>
      </div>
    </div>
  )
}
