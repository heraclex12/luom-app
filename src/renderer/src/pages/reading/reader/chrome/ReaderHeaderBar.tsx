import { ArrowLeft, Bookmark, Languages, PanelLeft, Settings2 } from 'lucide-react'
import { TooltipProvider } from '@/components/ui'
import { cn } from '@/lib/cn'
import { ToolButton } from './ToolButton'

/**
 * Reader header bar — hidden by default, faded in by the parent on mouse move. Three sections:
 * left: sidebar toggle · back to Library · bookmark · translate; center: title; right: settings.
 * Settings opens the global settings dialog at the Reading section (the only reading-settings entry).
 * No fullscreen button — use the OS (macOS green light / Windows maximize).
 * Window controls are the native title bar (macOS traffic lights / Windows buttons), not drawn here.
 */

export interface ReaderHeaderBarProps {
  /** Book title (center). */
  title: string
  /** Author (center). */
  author: string
  bookmarked: boolean
  translationOn: boolean
  translatable: boolean
  onToggleSidebar: () => void
  onToggleBookmark: () => void
  onToggleTranslation: () => void
  onOpenSettings: () => void
  onBackToShelf: () => void
}

export function ReaderHeaderBar(props: ReaderHeaderBarProps): React.JSX.Element {
  const {
    title,
    author,
    bookmarked,
    translationOn,
    translatable,
    onToggleSidebar,
    onToggleBookmark,
    onToggleTranslation,
    onOpenSettings,
    onBackToShelf,
  } = props

  return (
    <TooltipProvider delayDuration={400}>
      <header className="flex h-12 items-center gap-2 bg-page-bg/85 px-2 backdrop-blur">
        {/* Left */}
        <div className="flex items-center gap-0.5">
          <ToolButton label="Sidebar (Contents / Highlights / Bookmarks)" onClick={onToggleSidebar}>
            <PanelLeft className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Back to Library" onClick={onBackToShelf}>
            <ArrowLeft className="size-[18px]" />
          </ToolButton>
          <ToolButton
            label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            active={bookmarked}
            activeSurface={false}
            onClick={onToggleBookmark}
          >
            {/* Bookmarked = same icon turns solid brand orange */}
            <Bookmark className={cn('size-[18px]', bookmarked && 'fill-current text-brand-100')} />
          </ToolButton>
          <ToolButton
            label={translatable ? (translationOn ? 'Hide translation' : 'Show translation') : 'Translation not available for this language'}
            active={translationOn}
            disabled={!translatable}
            onClick={onToggleTranslation}
          >
            <Languages className="size-[18px]" />
          </ToolButton>
        </div>

        {/* Center: title (display only) */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 text-center">
          <span className="max-w-full truncate text-sm font-medium text-text-primary">{title}</span>
          <span className="max-w-full truncate text-[11px] text-text-muted">{author}</span>
        </div>

        {/* Right: settings (opens dialog at the Reading section) */}
        <div className="flex items-center gap-0.5">
          <ToolButton label="Reading settings" onClick={onOpenSettings}>
            <Settings2 className="size-[18px]" />
          </ToolButton>
        </div>
      </header>
    </TooltipProvider>
  )
}
