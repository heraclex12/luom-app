import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, MoreHorizontal, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { useAsyncData } from '@/hooks/useAsyncData'
import { onWordsChanged } from '@/app'
import * as wordbook from '@/wordbook'
import type { CollectionSummary } from '@/wordbook'

/**
 * Collections on the My words home: your own groups of words (Animals, Vegetables, Work…).
 * Click a collection to browse it; Study practises only its words. Rename / delete from the ⋯ menu.
 */
export function CollectionsSection(): React.JSX.Element {
  const navigate = useNavigate()
  const list = useAsyncData(() => wordbook.listCollections(), [])
  const reload = list.reload
  useEffect(() => onWordsChanged(() => void reload()), [reload])

  const [nameDialog, setNameDialog] = useState<{ mode: 'create' } | { mode: 'rename'; c: CollectionSummary } | null>(null)
  const [deleting, setDeleting] = useState<CollectionSummary | null>(null)

  const collections = list.data ?? []

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Collections</h2>
        <Button variant="secondary" className="gap-1.5" onClick={() => setNameDialog({ mode: 'create' })}>
          <Plus />
          New collection
        </Button>
      </div>
      {collections.length === 0 ? (
        <Card className="px-6 py-8 text-center text-sm text-text-secondary">
          Group words your way — e.g. “Animals”, “Vegetables”, “Work”. Create a collection, then use{' '}
          <span className="font-medium text-text-primary">⋯ → Collections…</span> on any word card, or pick one in the
          capture popup.
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {collections.map((c) => (
            <Card
              key={c.collectionId}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/wordbook/words?collection=${c.collectionId}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/wordbook/words?collection=${c.collectionId}`)}
              className="group flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-fill-ghost-hover"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-bg-neutral text-text-secondary">
                <Folder className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium text-text-primary">{c.name}</div>
                <div className="text-xs text-text-muted">
                  {c.wordCount} {c.wordCount === 1 ? 'word' : 'words'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label={`Study ${c.name}`}
                title="Study this collection"
                disabled={c.wordCount === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/wordbook/study?collection=${c.collectionId}`)
                }}
              >
                <Play className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="iconSm" aria-label="Collection actions" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onSelect={() => setNameDialog({ mode: 'rename', c })}>
                    <Pencil className="size-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-text-danger" onSelect={() => setDeleting(c)}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
        </div>
      )}

      <CollectionNameDialog
        state={nameDialog}
        onClose={() => setNameDialog(null)}
        onDone={() => void reload()}
      />
      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name ?? ''}”?`}
        description="The collection is removed. Its words stay in My words with their progress."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          const target = deleting
          setDeleting(null)
          if (target) void wordbook.deleteCollection(target.collectionId).then(() => reload())
        }}
      />
    </section>
  )
}

function CollectionNameDialog({
  state,
  onClose,
  onDone,
}: {
  state: { mode: 'create' } | { mode: 'rename'; c: CollectionSummary } | null
  onClose: () => void
  onDone: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  useEffect(() => {
    setName(state?.mode === 'rename' ? state.c.name : '')
  }, [state])

  const submit = async (): Promise<void> => {
    try {
      if (state?.mode === 'rename') await wordbook.renameCollection(state.c.collectionId, name)
      else await wordbook.createCollection(name)
      onDone()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog open={state != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{state?.mode === 'rename' ? 'Rename collection' : 'New collection'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Animals" />
          <DialogFooter className="mt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {state?.mode === 'rename' ? 'Rename' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
