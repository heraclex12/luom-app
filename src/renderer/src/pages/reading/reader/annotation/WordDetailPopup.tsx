import { X } from 'lucide-react'
import { WordLookupPanel } from '@/components/word/WordLookupPanel'

/**
 * Full entry window opened from "Full entry" in the compact card. Reuses the Look up page's
 * result panel (`WordLookupPanel`) as-is.
 *
 * Intentionally non-modal so the book stays visible; floats centered near the top rather than
 * next to the selection.
 *
 * Has its own close button (back to the compact card) plus the host's shared dismissal, hence
 * `data-annotation-layer`.
 */

export interface WordDetailPopupProps {
  /** Lookup term (same as the compact card; usually a local hit). */
  term: string
  /** Close: back to the compact card. */
  onClose: () => void
}

export function WordDetailPopup({ term, onClose }: WordDetailPopupProps): React.JSX.Element {
  return (
    <div
      // Exempts this layer from the host's click-outside dismissal (see SelectionAnnotator).
      data-annotation-layer=""
      className="anim-pop fixed left-1/2 top-[10vh] z-50 flex max-h-[72vh] w-[560px] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col select-text rounded-card bg-surface-3 text-text-primary shadow-popover"
      onMouseDown={(e) => e.preventDefault()} // keep the selection when clicking the window
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3.5">
        <span className="text-[13px] font-semibold text-text-muted">Full entry</span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="btn-squish grid size-7 place-items-center rounded-md text-text-secondary transition-colors hover:bg-fill-ghost-hover hover:text-text-100"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <WordLookupPanel term={term} />
      </div>
    </div>
  )
}
