import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, Card } from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import { BookCover } from '@/components/common/BookCover'
import { useAsyncData } from '@/hooks/useAsyncData'
import * as wordbook from '@/wordbook'
import type { OfficialBook } from '@/wordbook'

/**
 * Word lists (/wordbook/books): bundled lists grouped by a two-level category tree.
 * Cards show cover / title / description / word count; clicking opens the picker.
 */

export default function WordBooks(): React.JSX.Element {
  const navigate = useNavigate()
  const cats = useAsyncData(() => wordbook.fetchCategories(), [])

  const [topId, setTopId] = useState<number | null>(null) // null = All
  const [subId, setSubId] = useState<number | null>(null)

  const categories = cats.data ?? []
  const top = categories.find((c) => c.id === topId) ?? null
  const children = top?.children ?? []
  const effectiveCategoryId = subId ?? topId ?? undefined

  const books = useAsyncData(() => wordbook.fetchOfficialBooks(effectiveCategoryId), [effectiveCategoryId])

  // Failed to load categories → full-page error state.
  if (cats.error) return <OfflinePage onRetry={() => void cats.reload()} />

  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['My words', 'Word lists']} backTo="/wordbook" />

      {/* Category filter: top level always shown, second level when the selected category has children */}
      <div className="shrink-0 px-6 pt-4">
        {/* Top-level categories */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={topId === null} onClick={() => { setTopId(null); setSubId(null) }}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={topId === c.id} onClick={() => { setTopId(c.id); setSubId(null) }}>
              {c.title}
            </Chip>
          ))}
        </div>

        {/* Subcategories */}
        {children.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border-100 pt-2.5">
            <Chip active={subId === null} onClick={() => setSubId(null)} size="sm">
              All
            </Chip>
            {children.map((c) => (
              <Chip key={c.id} active={subId === c.id} onClick={() => setSubId(c.id)} size="sm">
                {c.title}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
        <BookGrid
          books={books.data ?? []}
          loading={books.loading}
          error={books.error != null}
          onOpen={(b) => navigate(`/wordbook/books/${b.id}`, { state: { title: b.title } })}
        />
      </main>
    </div>
  )
}

function BookGrid({
  books,
  loading,
  error,
  onOpen,
}: {
  books: OfficialBook[]
  loading: boolean
  error: boolean
  onOpen: (b: OfficialBook) => void
}): React.JSX.Element {
  if (error) {
    return <p className="pt-16 text-center text-sm text-text-muted">Couldn't load this category.</p>
  }
  if (loading && books.length === 0) {
    return <p className="pt-16 text-center text-sm text-text-muted">Loading…</p>
  }
  if (books.length === 0) {
    return <p className="pt-16 text-center text-sm text-text-muted">No word lists in this category.</p>
  }
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))]">
      {books.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onOpen(b)}
          className="btn-squish group flex items-center gap-4 rounded-card bg-surface-1 p-4 text-left shadow-card-ring transition-colors hover:bg-bg-200"
        >
          <BookCover title={b.title} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-text-primary">{b.title}</h3>
            {b.description && <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{b.description}</p>}
            <p className="mt-1.5 text-xs text-text-muted tabular-nums">{b.wordCount.toLocaleString()} words</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function Chip({
  active,
  onClick,
  size = 'md',
  children,
}: {
  active: boolean
  onClick: () => void
  size?: 'md' | 'sm'
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'btn-squish shrink-0 rounded-full font-medium transition-colors',
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
        active ? 'bg-fill-primary text-on-primary' : 'bg-bg-neutral-chip text-text-secondary hover:bg-bg-300'
      )}
    >
      {children}
    </button>
  )
}

function OfflinePage({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['My words', 'Word lists']} backTo="/wordbook" />
      <div className="grid flex-1 place-items-center px-6">
        <Card className="flex max-w-md flex-col items-center gap-3 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-card bg-bg-neutral text-text-muted">
            <WifiOff className="size-7" />
          </span>
          <h3 className="text-xl font-medium text-text-primary">Couldn't load word lists</h3>
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </Card>
      </div>
    </div>
  )
}
