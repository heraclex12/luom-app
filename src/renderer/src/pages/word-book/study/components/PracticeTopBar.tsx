import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CircleCheck, MoreHorizontal, SquarePen } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { modeInfo, type LearningMode } from '@/wordbook'

/**
 * Study top bar: back + remaining counts "New N · Learning N · Review N" (current kind underlined,
 * like Anki) + learning-mode chip (+ collection chip when scoped) + note and more (⋯) with Mark as known. No "Remove" here to avoid accidental removal mid-session.
 */

export function PracticeTopBar({
  counts,
  current,
  onNote,
  onMaster,
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
            className="ml-1 rounded-full bg-bg-neutral px-2.5 py-0.5 text-xs font-semibold text-text-secondary"
            title={`${modeInfo(mode).name} mode: ${modeInfo(mode).description}`}
          >
            {modeInfo(mode).emoji} {modeInfo(mode).name}
          </span>
        )}
        {collectionName && (
          <span className="rounded-full bg-bg-neutral px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
            {collectionName}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
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
