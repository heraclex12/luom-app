import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CircleCheck, FolderPlus, MoreHorizontal, SquarePen, Undo2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ModeIcon } from '@/components/common/ModeIcon'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { modeInfo, type LearningMode } from '@/wordbook'
import { GameFxStyles } from '../exercises/shared'

/**
 * Study top bar: back + remaining counts "New N · Learning N · Review N" (current kind underlined,
 * like Anki) + learning-mode chip (+ collection chip when scoped) + a quiet "Undo (Z)" for a few seconds after a
 * rating + note and the one more (⋯) menu for the card: Collections… and Mark as known (the word card itself shows
 * no menu in Study). No "Remove" here to avoid accidental removal mid-session.
 */

export function PracticeTopBar({
  counts,
  current,
  onNote,
  onMaster,
  onCollections,
  onUndo,
  collectionName,
  mode,
}: {
  counts: { new: number; learning: number; review: number }
  /** Shown as a chip when the session is limited to one collection. */
  collectionName?: string | null
  current?: 'new' | 'learning' | 'review'
  /** Learning mode chip (decides the exercises). */
  mode?: LearningMode
  onNote: () => void
  onMaster: () => void
  onCollections: () => void
  /** Shown (briefly, after a rating) when the last rating can be undone. */
  onUndo?: () => void
}): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <header className="flex shrink-0 items-center gap-3 px-6 py-3">
      <Button
        variant="ghost"
        size="iconSm"
        aria-label="Back"
        className="text-text-secondary"
        onClick={() => navigate('/wordbook')}
      >
        <ChevronLeft className="size-[18px]" />
      </Button>
      <div className="flex items-center gap-3 text-sm font-semibold text-text-primary">
        <span className={cn(current === 'new' && 'underline underline-offset-4')}>
          New <span className="tabular-nums">{counts.new}</span>
        </span>
        <span className="text-text-muted">·</span>
        <span className={cn(current === 'learning' && 'underline underline-offset-4')}>
          Learning <span className="tabular-nums">{counts.learning}</span>
        </span>
        <span className="text-text-muted">·</span>
        <span className={cn(current === 'review' && 'underline underline-offset-4')}>
          Review <span className="tabular-nums">{counts.review}</span>
        </span>
        {mode && (
          <span
            className="ml-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-bg-neutral px-2.5 py-0.5 text-xs font-semibold text-text-secondary"
            title={`${modeInfo(mode).name} mode: ${modeInfo(mode).description}`}
          >
            <ModeIcon mode={mode} className="size-3.5" />
            {modeInfo(mode).name}
          </span>
        )}
        {collectionName && (
          <span className="rounded-full bg-bg-neutral px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
            {collectionName}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {onUndo && <GameFxStyles />}
        {onUndo && (
          <Button
            variant="ghost"
            size="sm"
            aria-keyshortcuts="Z"
            className="envi-fade-in mr-1 gap-1.5 text-text-secondary"
            onClick={onUndo}
          >
            <Undo2 className="size-3.5" />
            Undo
            <kbd className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-[10px] border border-border px-1 font-sans text-[10px] font-medium text-text-muted">
              Z
            </kbd>
          </Button>
        )}
        <Button variant="ghost" size="iconSm" aria-label="Note" className="text-text-secondary" onClick={onNote}>
          <SquarePen className="size-[18px]" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconSm" aria-label="More actions" title="More" className="text-text-secondary">
              <MoreHorizontal className="size-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[9rem]">
            <DropdownMenuItem onSelect={onCollections}>
              <FolderPlus className="size-4" />
              Collections…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onMaster}>
              <CircleCheck className="size-4" />
              Mark as known
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
