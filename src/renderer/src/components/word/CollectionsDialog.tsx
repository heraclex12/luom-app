import { useEffect, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'
import { notifyWordsChanged } from '@/app'
import * as wordbook from '@/wordbook'
import type { CollectionSummary } from '@/wordbook'

/**
 * "Collections…" dialog for one word: tick the collections it belongs to, or create a new one inline.
 * Saving replaces the word's memberships; a word put in a collection is also added to My words.
 */
export function CollectionsDialog({
  open,
  onOpenChange,
  dictId,
  word,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dictId: number
  word: string
  onSaved?: () => void
}): React.JSX.Element {
  const [all, setAll] = useState<CollectionSummary[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNewName('')
    void Promise.all([wordbook.listCollections(), wordbook.collectionsOfWord(dictId)]).then(([list, mine]) => {
      setAll(list)
      setSelected(new Set(mine))
    })
  }, [open, dictId])

  const toggle = (id: number): void =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const create = async (): Promise<void> => {
    try {
      const id = await wordbook.createCollection(newName)
      setAll(await wordbook.listCollections())
      setSelected((s) => new Set(s).add(id))
      setNewName('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await wordbook.setWordCollections(dictId, [...selected])
      notifyWordsChanged()
      onSaved?.()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Collections</DialogTitle>
          <DialogDescription>Choose the collections for “{word}”.</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {all.length === 0 && <p className="py-2 text-sm text-text-muted">No collections yet — create one below.</p>}
          {all.map((c) => {
            const on = selected.has(c.collectionId)
            return (
              <button
                key={c.collectionId}
                type="button"
                onClick={() => toggle(c.collectionId)}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-fill-ghost-hover"
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-md border',
                    on ? 'border-fill-brand bg-fill-brand text-on-brand' : 'border-border-300',
                  )}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="flex-1 truncate text-text-primary">{c.name}</span>
                <span className="text-xs tabular-nums text-text-muted">{c.wordCount}</span>
              </button>
            )
          })}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (newName.trim()) void create()
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New collection, e.g. Animals" />
          <Button type="submit" variant="secondary" size="icon" aria-label="Create collection" disabled={!newName.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
