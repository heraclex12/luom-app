import { useState } from 'react'
import { BookMinus, Check, CircleCheck, FolderPlus, MoreHorizontal, Sparkles, SquarePen } from 'lucide-react'
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
import { CollectionsDialog } from '@/components/word/CollectionsDialog'

/**
 * Word card action bar (top-right): an "Improve with AI" button (when available), the Note button, a visible
 * "Add to My words" button (or a quiet "In My words" once added), and a "More (⋯)" menu that can hold Collections,
 * Remove from My words and Mark as known / Unmark.
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
  /** Show the Add to My words button, or (once added) the Remove from My words item */
  showLibrary?: boolean
  /** Whether the word is already in My words */
  inLibrary?: boolean
  /** Once added, say so ("In My words") where the Add button was */
  showInLibrary?: boolean
  onToggleLibrary?: () => void
  /** Show the Mark as known / Unmark as known item */
  showMaster?: boolean
  mastered?: boolean
  onMasterClick?: () => void
  /** When provided, shows the "Improve with AI" button */
  onImproveWithAi?: () => void
  /** Disables the AI item while a request is running */
  improvingWithAi?: boolean
  /** When set, shows a "Collections…" item that manages this dict id's collections */
  collectionsDictId?: number
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
  showInLibrary = false,
  onToggleLibrary,
  showMaster = false,
  mastered,
  onMasterClick,
  onImproveWithAi,
  improvingWithAi = false,
  collectionsDictId,
}: WordActionBarProps): React.JSX.Element {
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  // Open state: controlled by the parent if provided, otherwise internal.
  const [noteSelfOpen, setNoteSelfOpen] = useState(false)

  const noteOpenValue = noteOpen ?? noteSelfOpen
  const setNoteOpen = onNoteOpenChange ?? setNoteSelfOpen

  return (
    <div className="flex shrink-0 items-center gap-1">
      {onImproveWithAi && (
        <Button
          variant="ghost"
          size="sm"
          loading={improvingWithAi}
          disabled={improvingWithAi}
          onClick={onImproveWithAi}
          title="Rewrite this entry with AI: natural Vietnamese meanings and bilingual examples"
          className="mr-1 gap-1.5 rounded-full border border-border-accent bg-bg-accent/60 px-3 font-semibold text-text-accent hover:bg-bg-accent"
        >
          {!improvingWithAi && <Sparkles className="size-3.5" />}
          {improvingWithAi ? 'Improving…' : 'Improve with AI'}
        </Button>
      )}
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

      {/* My words: adding is the main thing to do with a new word, so it sits in the open */}
      {showLibrary &&
        (inLibrary ? (
          showInLibrary && (
            <span className="ml-1 inline-flex h-8 items-center gap-1 px-1.5 text-xs font-medium text-text-muted">
              <Check className="size-3.5 text-fill-brand" strokeWidth={2.5} />
              In My words
            </span>
          )
        ) : (
          <Button variant="brand" size="sm" onClick={onToggleLibrary} className="ml-1">
            Add to My words
          </Button>
        ))}

      {/* More (⋯) menu */}
      {((showLibrary && inLibrary) || showMaster || collectionsDictId != null) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconSm" aria-label="More actions" title="More" className="text-text-muted">
              <MoreHorizontal className="size-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[9rem]">
            {collectionsDictId != null && (
              <DropdownMenuItem onSelect={() => setCollectionsOpen(true)}>
                <FolderPlus className="size-4" />
                Collections…
              </DropdownMenuItem>
            )}
            {showMaster && (
              <DropdownMenuItem onSelect={onMasterClick}>
                <CircleCheck className={cn('size-4', mastered && 'text-fill-success')} />
                {mastered ? 'Unmark as known' : 'Mark as known'}
              </DropdownMenuItem>
            )}
            {showLibrary && inLibrary && (
              <>
                {(showMaster || collectionsDictId != null) && <DropdownMenuSeparator />}
                {/* Destructive (drops study progress too); parent shows the confirmation. */}
                <DropdownMenuItem onSelect={onToggleLibrary} className="text-text-danger">
                  <BookMinus className="size-4" />
                  Remove from My words
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {collectionsDictId != null && (
        <CollectionsDialog
          open={collectionsOpen}
          onOpenChange={setCollectionsOpen}
          dictId={collectionsDictId}
          word={word}
        />
      )}
    </div>
  )
}
