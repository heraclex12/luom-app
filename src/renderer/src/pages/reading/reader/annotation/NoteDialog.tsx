import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@/components/ui'
import type { AnnotationRecord } from '@/reading'
import { highlightTextClass, pageLabel, relativeDay, snippet } from '../util'

/**
 * Modal for writing / editing a note — opened from "Add note", a note anchor in the text, or
 * "Edit" in the sidebar. Header: page number · relative time; middle: the highlighted text in its
 * color / style (read-only context); then a markdown editor; footer can delete the highlight.
 *
 * Explicit save: edits stay in a local draft until "Done" (`onSave`); close / overlay / Esc
 * discard it. `annotation` null = closed (controlled by the parent's activeNoteId).
 */

/**
 * Max note length. 15000 chars × up to 4 UTF-8 bytes = 60KB, under a 65535-byte TEXT column.
 */
const NOTE_MAX_LEN = 15000

export interface NoteDialogProps {
  /** Highlight being edited; null = closed. */
  annotation: AnnotationRecord | null
  /** Computed page number (same source as the sidebar); null = not ready, hidden. */
  page: number | null
  /** "Done": save the draft and add/remove the note anchor in the text. */
  onSave: (id: string, note: string) => void
  /** Delete the whole highlight (including in the text). */
  onRemove: (id: string) => void
  /** Close (overlay / Esc / close button / Done); only Done saves. */
  onClose: () => void
}

export function NoteDialog({
  annotation,
  page,
  onSave,
  onRemove,
  onClose,
}: NoteDialogProps): React.JSX.Element {
  return (
    <Dialog
      open={annotation != null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {annotation && (
        // key = highlight id: remount on open/switch so the draft resets to that note.
        <NoteDialogBody
          key={annotation.id}
          annotation={annotation}
          page={page}
          onSave={onSave}
          onRemove={onRemove}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

/** Dialog body: holds the draft in local state, committed only on Done. */
function NoteDialogBody({
  annotation,
  page,
  onSave,
  onRemove,
  onClose,
}: {
  annotation: AnnotationRecord
  page: number | null
  onSave: (id: string, note: string) => void
  onRemove: (id: string) => void
  onClose: () => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(annotation.note)
  const label = pageLabel(page)
  const meta = `${label != null ? `${label} · ` : ''}${relativeDay(annotation.createdAt)}`

  // Done: write back only if changed, then close.
  const handleDone = (): void => {
    if (draft !== annotation.note) onSave(annotation.id, draft)
    onClose()
  }

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Note</DialogTitle>
        <p className="text-xs tabular-nums text-text-muted">{meta}</p>
      </DialogHeader>

      {/* Original text (read-only), drawn in the highlight's color + style. */}
      <div className="max-h-32 overflow-y-auto rounded-lg bg-bg-200 p-3">
        <span className={highlightTextClass(annotation.color, annotation.style)}>
          {snippet(annotation.text, 300)}
        </span>
      </div>

      {/* Note editor: edits the local draft; committed on Done. */}
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write a note… (Markdown supported)"
        className="min-h-[160px] text-sm"
        maxLength={NOTE_MAX_LEN}
        autoFocus
      />

      <DialogFooter className="sm:justify-between">
        <Button
          variant="ghost"
          onClick={() => onRemove(annotation.id)}
          className="text-text-danger hover:bg-bg-danger-chip hover:text-text-danger"
        >
          <Trash2 className="size-4" />
          Delete highlight
        </Button>
        <Button onClick={handleDone}>Done</Button>
      </DialogFooter>
    </DialogContent>
  )
}
