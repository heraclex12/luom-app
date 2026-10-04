import { ChevronsUpDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import type { MeaningSource } from '@/types/word'

/**
 * Meaning source pill: "Tiếng Việt" (Vietnamese meanings) / "English" (English definitions
 * with Vietnamese translations). Same look as the accent pill. Shared by WordCard and DictPopup;
 * "English" is disabled when the word has no English definitions.
 *
 * Controlled; switching only affects the current card and does not write back to settings.
 */

interface MeaningSourceToggleProps {
  source: MeaningSource
  onChange: (s: MeaningSource) => void
  /** Whether English definitions exist; otherwise "English" is disabled. */
  collinsAvailable: boolean
  /**
   * Stop click propagation (default false); Study wraps the card in a click-to-reveal area.
   */
  stopClickPropagation?: boolean
  className?: string
}

export function MeaningSourceToggle({
  source,
  onChange,
  collinsAvailable,
  stopClickPropagation = false,
  className,
}: MeaningSourceToggleProps): React.JSX.Element {
  // Without English definitions, show the fallback "Tiếng Việt" (same rule as WordMeaning).
  const effective: MeaningSource = source === 'collins' && collinsAvailable ? 'collins' : 'simple'
  return (
    <div className={className} onClick={stopClickPropagation ? (e) => e.stopPropagation() : undefined}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="btn-squish inline-flex items-center gap-1 rounded-full border border-border-300 bg-surface-1 px-2.5 py-1 text-xs font-semibold text-text-secondary"
          >
            {effective === 'collins' ? 'English' : 'Tiếng Việt'}
            <ChevronsUpDown className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onChange('simple')}>Tiếng Việt</DropdownMenuItem>
          <DropdownMenuItem disabled={!collinsAvailable} onSelect={() => onChange('collins')}>
            English
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
