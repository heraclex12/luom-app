import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, MoreHorizontal, Pencil, Search, StickyNote, Trash2 } from 'lucide-react'
import {
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/cn'
import { playWordAudio, resolveWordAudioUrl } from '@/lib/audio'
import { SpeakerIcon, useAudioPhase } from '@/components/common/SpeakerIcon'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSettings } from '@/hooks/useSettings'
import * as wordbook from '@/wordbook'
import type { NoteCardData } from '@/wordbook'
import { relTime } from './relTime'

/**
 * Notes: all personal notes attached to words. Search + sort (recent / oldest / A–Z) above a list of
 * cards (word + phonetic + short meaning + note + relative time). Clicking a card opens it in My words (?dictId=).
 */

type SortKey = 'recent' | 'oldest' | 'word'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently edited' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'word', label: 'A-Z' },
]

export default function MyNotes(): React.JSX.Element {
  const navigate = useNavigate()
  const list = useAsyncData(() => wordbook.listNoteCards(), [])
  const notes = useMemo(() => list.data ?? [], [list.data])
  // Pronunciation accent follows settings (silent if no audio).
  const accent = useSettings()?.accent ?? 'us'

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  const [editing, setEditing] = useState<NoteCardData | null>(null)
  const [removeTarget, setRemoveTarget] = useState<NoteCardData | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)

  const now = Date.now()
  const keyword = query.trim().toLowerCase()
  const visible = useMemo(() => {
    const filtered = notes.filter(
      (n) =>
        keyword === '' ||
        n.word.toLowerCase().includes(keyword) ||
        n.note.toLowerCase().includes(keyword) ||
        n.meaning.toLowerCase().includes(keyword)
    )
    const sorted = [...filtered]
    if (sort === 'recent') sorted.sort((a, b) => b.editTime - a.editTime)
    else if (sort === 'oldest') sorted.sort((a, b) => a.editTime - b.editTime)
    else sorted.sort((a, b) => a.word.localeCompare(b.word))
    return sorted
  }, [notes, keyword, sort])

  function requestRemove(note: NoteCardData): void {
    setRemoveTarget(note)
    setRemoveOpen(true)
  }

  async function handleRemove(): Promise<void> {
    if (!removeTarget) return
    await wordbook.clearNote(removeTarget.dictId)
    setRemoveOpen(false)
    await list.reload()
  }

  async function handleSaveEdit(text: string): Promise<void> {
    if (!editing) return
    await wordbook.setNote(editing.dictId, text)
    setEditing(null)
    await list.reload()
  }

  /** Open the word in My words. */
  function openDetail(note: NoteCardData): void {
    navigate(`/wordbook/words?dictId=${note.dictId}`)
  }

  const hasNotes = notes.length > 0

  return (
    <>
      <TopBar segments={['My words', 'Notes']} backTo="/wordbook" />
      <div className="mx-auto max-w-3xl px-8 py-8 lg:px-10">
        {hasNotes && (
          <div className="mb-5 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search words or notes"
                className="pl-9"
              />
            </div>
            <SortSelect sort={sort} onChange={setSort} />
          </div>
        )}

        {!hasNotes ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <NoMatch />
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((note) => (
              <NoteCard
                key={note.dictId}
                note={note}
                now={now}
                audioUrl={resolveWordAudioUrl(note, accent)}
                onSpeak={() => void playWordAudio(note, accent)}
                onOpen={() => openDetail(note)}
                onEdit={() => setEditing(note)}
                onRemove={() => requestRemove(note)}
              />
            ))}
          </div>
        )}
      </div>

      <EditNoteDialog note={editing} onOpenChange={(open) => !open && setEditing(null)} onSave={(t) => void handleSaveEdit(t)} />

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Delete the note for "${removeTarget?.word}"?`}
        description="The word stays in My words. This can't be undone."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => void handleRemove()}
      />
    </>
  )
}

/** Sort selector (CDS Select). */
function SortSelect({ sort, onChange }: { sort: SortKey; onChange: (s: SortKey) => void }): React.JSX.Element {
  return (
    <Select value={sort} onValueChange={(v) => onChange(v as SortKey)}>
      <SelectTrigger className="shrink-0" aria-label="Sort by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORTS.map((s) => (
          <SelectItem key={s.key} value={s.key}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Note card: whole card opens the word; the word itself plays audio. Inner buttons stop propagation.
 */
function NoteCard({
  note,
  now,
  audioUrl,
  onSpeak,
  onOpen,
  onEdit,
  onRemove,
}: {
  note: NoteCardData
  now: number
  /** Audio URL for the speaker animation (null if none). */
  audioUrl: string | null
  onSpeak: () => void
  onOpen: () => void
  onEdit: () => void
  onRemove: () => void
}): React.JSX.Element {
  // Speaker shows on hover, and stays visible while playing.
  const sounding = useAudioPhase(audioUrl) !== 'idle'
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group cursor-pointer p-4 transition-shadow hover:shadow-md focus-visible:shadow-focus focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSpeak()
              }}
              className="btn-squish inline-flex items-center gap-1 text-left font-serif text-lg font-semibold text-text-primary"
              aria-label={`Play ${note.word}`}
            >
              {note.word}
              <SpeakerIcon
                url={audioUrl}
                className={cn(
                  'size-3.5 text-text-muted transition-opacity',
                  sounding ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              />
            </button>
            {note.phonetic && <span className="text-xs text-text-muted">{note.phonetic}</span>}
          </div>
          {note.meaning && <p className="mt-0.5 text-xs text-text-secondary">{note.meaning}</p>}
        </div>
        <NoteActionsMenu onEdit={onEdit} onRemove={onRemove} />
      </div>

      <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{note.note}</p>

      <div className="mt-3 flex items-center gap-1 text-xs text-text-muted">
        <Clock className="size-3" />
        {relTime(note.editTime, now)}
      </div>
    </Card>
  )
}

/** Card actions menu (edit / delete), visible on hover / focus / open. */
function NoteActionsMenu({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="iconXs"
          aria-label="More actions"
          onClick={(e) => e.stopPropagation()}
          className="-mr-1 -mt-0.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="size-4 text-text-muted" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-text-danger" onSelect={onRemove}>
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Edit note dialog: opens when `note` is set, prefilled with its text. */
function EditNoteDialog({
  note,
  onOpenChange,
  onSave,
}: {
  note: NoteCardData | null
  onOpenChange: (open: boolean) => void
  onSave: (text: string) => void
}): React.JSX.Element {
  const [text, setText] = useState('')

  // Prefill when opened.
  useEffect(() => {
    if (note) setText(note.note)
  }, [note])

  const canSave = text.trim().length > 0

  return (
    <Dialog open={note != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{note?.word} · Note</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-note">My note</Label>
          <Textarea
            id="edit-note"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mnemonics, collocations, common mistakes…"
            className="min-h-28"
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="primary" disabled={!canSave} onClick={() => onSave(text.trim())}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Empty state when there are no notes. */
function EmptyState(): React.JSX.Element {
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-card bg-bg-neutral text-text-muted">
        <StickyNote className="size-6" />
      </span>
      <p className="text-sm font-semibold text-text-primary">No notes yet</p>
    </Card>
  )
}

/** No search results. */
function NoMatch(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-bg-neutral-chip">
        <Search className="size-5 text-text-muted" />
      </div>
      <p className="text-sm text-text-primary">No matching notes</p>
    </div>
  )
}
