import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, FileX, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Badge, Button, ConfirmDialog } from '@/components/ui'
import { BookCover } from '@/components/common/BookCover'
import { EmptyState } from '@/components/common/EmptyState'
import { TopBar } from '@/components/layout/TopBar'
import { useAsyncData } from '@/hooks/useAsyncData'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'
import * as reading from '@/reading'
import type { ShelfBook } from '@/reading'

/**
 * Library (Reading tab landing page): responsive grid of book covers from the local user_book table.
 *
 * "Import book" picks an EPUB, identifies it by content hash, copies it to `books/<hash>/` and stores
 * its metadata; re-importing the same file is recognized by hash. Clicking a book opens /reader/:bookHash.
 * Deleting removes the local file but keeps highlights and progress (re-import restores them).
 *
 * Sorted by most recently read (unread books fall back to import order). Read books show a percentage.
 * Covers come from `books/<hash>/cover.png` extracted at import, with a text cover as fallback.
 *
 * A book whose file isn't on this device (`hasFile === false`) is marked "File not on this device" and
 * can't be opened; importing the same file again restores it (see the `exists` branch in handleImport).
 */

export default function Reading(): React.JSX.Element {
  const navigate = useNavigate()
  const shelf = useAsyncData(() => reading.listShelf(), [])
  const books = shelf.data ?? []
  const [importing, setImporting] = useState(false)
  // Book awaiting delete confirmation; null = no dialog.
  const [pendingDelete, setPendingDelete] = useState<ShelfBook | null>(null)
  // Title snapshot: pendingDelete clears before the dialog's exit animation ends, so the title would flash empty.
  const pendingTitleRef = useRef('')
  if (pendingDelete) pendingTitleRef.current = pendingDelete.title

  const handleImport = async (): Promise<void> => {
    setImporting(true)
    try {
      const result = await reading.importBook()
      if (result.status === 'canceled') return
      if (result.status === 'exists') {
        // Reload anyway: the idempotent copy may have restored a missing file, so hasFile must be recomputed.
        await shelf.reload()
        toast.info(`“${result.book.title}” is already in your library`)
        return
      }
      await shelf.reload()
      toast.info(result.status === 'restored' ? `“${result.title}” is back in your library` : `Added “${result.title}”`)
    } catch (e) {
      toast.error(`Import failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (book: ShelfBook): Promise<void> => {
    try {
      await reading.deleteBook(book.bookHash)
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      // Reload even on failure: the tombstone may have been written before file removal failed.
      await shelf.reload()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar segments={['Library']} />
      {/* Header: import a book */}
      <header className="shrink-0">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-8 pb-2 pt-6">
          <div className="flex items-baseline gap-2.5" />
          <Button
            variant="secondary"
            size="sm"
            className="!min-w-0"
            loading={importing}
            onClick={() => void handleImport()}
          >
            <Plus className="size-4" />
            Import book
          </Button>
        </div>
      </header>

      {/* Cover grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-8 pb-12 pt-4">
          {/* Render nothing on first load to avoid flashing the empty state (local queries are fast). */}
          {shelf.loading && !shelf.data ? null : shelf.error ? (
            // Show load errors distinctly from an empty library, so users don't think their books are gone.
            <EmptyState
              variant="detail"
              className="min-h-96"
              icon={<TriangleAlert className="size-6 text-text-muted" />}
              title="Couldn't load your library"
              subtitle={shelf.error instanceof Error ? shelf.error.message : String(shelf.error)}
            >
              <Button variant="secondary" size="sm" onClick={() => void shelf.reload()}>
                Retry
              </Button>
            </EmptyState>
          ) : books.length === 0 ? null : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-7">
              {books.map((book) => (
                <ShelfCell
                  key={book.bookHash}
                  book={book}
                  onOpen={() => navigate(`/reader/${book.bookHash}`)}
                  onRequestDelete={() => setPendingDelete(book)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Remove this book from your library?"
        description={`The file for “${pendingTitleRef.current}” will be deleted from this device. Your highlights and reading progress are kept; import the same book again to restore them.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete)
        }}
      />
    </div>
  )
}

// ─────────────────────────── Book cell ───────────────────────────

/**
 * Grid cell: cover + title (with percentage if started) + author; clickable, with a delete button on hover.
 * If the file isn't on this device the cover is dimmed, the cell is disabled and a badge is shown.
 */
function ShelfCell({
  book,
  onOpen,
  onRequestDelete,
}: {
  book: ShelfBook
  onOpen: () => void
  onRequestDelete: () => void
}): React.JSX.Element {
  // Progress exists only once started (fraction is null otherwise); floor so it never overstates.
  const percent = book.fraction == null ? null : Math.floor(book.fraction * 100)
  return (
    <div className="group relative flex flex-col gap-2.5">
      <button
        type="button"
        disabled={!book.hasFile}
        onClick={onOpen}
        className={cn('flex flex-col gap-2.5 text-left', book.hasFile && 'btn-squish')}
      >
        {/* Lift and deepen shadow on hover. */}
        <BookCover
          title={book.title}
          src={book.coverUrl}
          size="fill"
          className={cn(
            'transition duration-200',
            book.hasFile ? 'group-hover:-translate-y-1 group-hover:shadow-lg' : 'opacity-50',
          )}
         
        />

        <div className="flex flex-col gap-1 px-0.5">
          <div className="flex items-start gap-1.5">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug text-text-primary">
              {book.title}
            </h3>
            {percent != null && (
              <span className="mt-px shrink-0 text-xs font-semibold tabular-nums text-text-muted">{percent}%</span>
            )}
          </div>
          <span className="truncate text-xs text-text-muted">{book.author}</span>
          {!book.hasFile && (
            <Badge variant="neutral" className="w-fit" title="Import the same file again to read it">
              <FileX className="size-3" />
              File not on this device
            </Badge>
          )}
        </div>
      </button>

      {/* Delete button: shown on hover/focus; separate from the cell button (buttons can't nest). */}
      <Button
        variant="ghost"
        size="iconXs"
        aria-label={`Delete “${book.title}”`}
        onClick={onRequestDelete}
        className="absolute right-1.5 top-1.5 bg-surface-1 opacity-0 shadow-card-ring transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
