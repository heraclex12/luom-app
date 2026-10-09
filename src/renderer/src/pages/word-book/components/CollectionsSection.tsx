import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import {
  Button,
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
export function CollectionsSection({ inDialog = false }: { inDialog?: boolean } = {}): React.JSX.Element {
  const navigate = useNavigate()
  const list = useAsyncData(() => wordbook.listCollections(), [])
  const reload = list.reload
  useEffect(() => onWordsChanged(() => void reload()), [reload])

  const [nameDialog, setNameDialog] = useState<{ mode: 'create' } | { mode: 'rename'; c: CollectionSummary } | null>(null)
  const [deleting, setDeleting] = useState<CollectionSummary | null>(null)

  const collections = list.data ?? []

  return (
    <section>
      <div className={inDialog ? 'flex justify-end' : 'flex items-baseline justify-between'}>
        {!inDialog && <h2 className="font-serif text-xl font-bold text-text-primary">Collections</h2>}
        <button
          type="button"
          onClick={() => setNameDialog({ mode: 'create' })}
          className="flex items-center gap-1 text-sm font-medium text-text-accent hover:underline"
        >
          <Plus className="size-4" />
          New collection
        </button>
      </div>
      {collections.length === 0 ? (
        <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-text-muted">
          Group words your way, like “Animals”, “Vegetables” or “Work”. Then use{' '}
          <span className="text-text-secondary">⋯ › Collections…</span> on a word card, or pick one in the capture popup.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {collections.map((c) => (
            <div
              key={c.collectionId}
              className="group flex items-center rounded-full bg-fill-control transition-colors hover:bg-fill-control-hover"
            >
              <button
                type="button"
                onClick={() => navigate(`/wordbook/words?collection=${c.collectionId}`)}
                className="flex items-center gap-2 py-1.5 pl-3.5 pr-2 text-sm"
              >
                <span className="font-medium text-text-primary">{c.name}</span>
                <span className="tabular-nums text-text-muted">{c.wordCount}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${c.name} actions`}
                    className="mr-1 grid size-6 place-items-center rounded-full text-text-muted hover:bg-fill-ghost-hover hover:text-text-primary"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    disabled={c.wordCount === 0}
                    onSelect={() => navigate(`/wordbook/study?collection=${c.collectionId}`)}
                  >
                    <Play className="size-4" /> Study this collection
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setNameDialog({ mode: 'rename', c })}>
                    <Pencil className="size-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-text-danger" onSelect={() => setDeleting(c)}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
