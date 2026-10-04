import { useState } from 'react'
import { BookMinus, BookPlus, CircleCheck, MoreHorizontal, Sparkles, SquarePen } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
} from '@/components/ui'
import { NoteDialog } from '@/components/word/NoteDialog'

/**
 * Word card action bar (top-right): Note button plus a "More (⋯)" menu that can hold
 * Add to / Remove from My words, Mark as known / Unmark, and Improve with AI.
 * Popover open state can be controlled by the parent or kept internally; the parent owns
 * the confirmation for destructive items (Remove from My words).
 */

interface WordActionBarProps {
  word: string

  // ═══ Note
  showNote?: boolean
  /** Current note text (used to show whether a note exists) */
  noteValue?: string
  /** Note UI: 'popover' (word detail) | 'dialog' (study) */
  noteMode?: 'popover' | 'dialog'
  /** Called when the note is saved */
  onNoteChange?: (value: string) => void
  /** Controlled open state; kept internally when omitted */
  noteOpen?: boolean
  onNoteOpenChange?: (open: boolean) => void
  /** Custom note content (replaces the default Textarea) */
  noteContent?: React.ReactNode

  // ═══ More (⋯ menu)
  /** Show the Add to / Remove from My words item (label depends on inLibrary) */
  showLibrary?: boolean
  /** Whether the word is already in My words */
  inLibrary?: boolean
  onToggleLibrary?: () => void
  /** Show the Mark as known / Unmark as known item */
  showMaster?: boolean
  mastered?: boolean
  onMasterClick?: () => void
  /** When provided, shows an "Improve with AI" item in the menu */
  onImproveWithAi?: () => void
  /** Disables the AI item while a request is running */
  improvingWithAi?: boolean
}

export function WordActionBar({
  word,
  showNote = false,
  noteValue,
  noteMode = 'popover',
  onNoteChange,
  noteOpen,
  onNoteOpenChange,
  noteContent,
  showLibrary = false,
  inLibrary = false,
  onToggleLibrary,
  showMaster = false,
  mastered,
  onMasterClick,
  onImproveWithAi,
  improvingWithAi = false,
}: WordActionBarProps): React.JSX.Element {
  // Open state: controlled by the parent if provided, otherwise internal.
  const [noteSelfOpen, setNoteSelfOpen] = useState(false)

  const noteOpenValue = noteOpen ?? noteSelfOpen
  const setNoteOpen = onNoteOpenChange ?? setNoteSelfOpen

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* Note: popover (word detail) or dialog (study) */}
      {showNote &&
        (noteMode === 'popover' ? (
          <Popover open={noteOpen !== undefined ? noteOpenValue : undefined} onOpenChange={onNoteOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Note"
                title="Note"
                className={noteValue ? 'text-text-secondary' : 'text-text-muted'}
              >
                <SquarePen className="size-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              {noteContent ?? (
                <>
                  <p className="mb-2 text-xs font-semibold text-text-secondary">My note · {word}</p>
                  <Textarea
                    value={noteValue}
                    onChange={(e) => onNoteChange?.(e.target.value)}
                    placeholder="Jot something down to help you remember…"
                    rows={4}
                  />
                </>
              )}
            </PopoverContent>
          </Popover>
        ) : (
          <>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Note"
              title="Note"
              className={noteValue ? 'text-text-secondary' : 'text-text-muted'}
              onClick={() => setNoteOpen(true)}
            >
              <SquarePen className="size-[18px]" />
            </Button>
            <NoteDialog
              open={noteOpenValue}
              onOpenChange={setNoteOpen}
              word={word}
              initial={noteValue ?? ''}
              onSave={(t) => {
                onNoteChange?.(t)
                setNoteOpen(false)
              }}
            />
          </>
        ))}

      {/* More (⋯) menu */}
      {(showLibrary || showMaster || onImproveWithAi) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconSm" aria-label="More actions" title="More" className="text-text-muted">
              <MoreHorizontal className="size-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[9rem]">
            {showMaster && (
              <DropdownMenuItem onSelect={onMasterClick}>
                <CircleCheck className={cn('size-4', mastered && 'text-fill-success')} />
                {mastered ? 'Unmark as known' : 'Mark as known'}
              </DropdownMenuItem>
            )}
            {onImproveWithAi && (
              <DropdownMenuItem onSelect={onImproveWithAi} disabled={improvingWithAi}>
                <Sparkles className="size-4" />
                {improvingWithAi ? 'Improving…' : 'Improve with AI'}
              </DropdownMenuItem>
            )}
            {onImproveWithAi && (showLibrary || showMaster) && <DropdownMenuSeparator />}
            {showLibrary && showMaster && <DropdownMenuSeparator />}
            {showLibrary &&
              (inLibrary ? (
                // Destructive (drops study progress too); parent shows the confirmation.
                <DropdownMenuItem onSelect={onToggleLibrary} className="text-text-danger">
                  <BookMinus className="size-4" />
                  Remove from My words
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={onToggleLibrary}>
                  <BookPlus className="size-4" />
                  Add to My words
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
