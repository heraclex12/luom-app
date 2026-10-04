import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/components/ui'

/**
 * Word note editor dialog (word list / today / study card): title "{word} · Note", a large
 * textarea and Cancel / Save. Controlled; each open resets the draft from `initial`, and only
 * Save calls onSave (empty string clears the note).
 */
export function NoteDialog({
  open,
  onOpenChange,
  word,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  word: string
  initial: string
  onSave: (note: string) => void
}): React.JSX.Element {
  const [text, setText] = useState(initial)
  useEffect(() => {
    if (open) setText(initial)
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{word} · Note</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note-input">My note</Label>
          <Textarea
            id="note-input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mnemonics, collocations, common mistakes…"
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="primary" onClick={() => onSave(text)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
