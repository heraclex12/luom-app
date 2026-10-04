import { cn } from '@/lib/cn'

/**
 * Word card headline: the word in large type (click to hear it) + optional part of speech.
 * The click handler comes from the parent; without it clicks do nothing.
 *
 * Two sizes: `lg` for full cards (default), `sm` for the compact reading popup.
 */

/** Headline sizes: full card / compact popup. */
const SIZES = {
  lg: 'font-serif text-4xl font-semibold text-text-primary sm:text-5xl',
  sm: 'font-serif text-2xl font-semibold text-text-primary',
} as const

interface WordHeadlineProps {
  word: string
  /** Part of speech (e.g. "n.", "v.", "adj.") */
  partOfSpeech?: string
  /** Word click handler (usually speaks it) */
  onWordClick?: () => void
  /** Size (default 'lg') */
  size?: keyof typeof SIZES
  /**
   * Stop click propagation (default false); used by Study's click-to-reveal.
   */
  stopClickPropagation?: boolean
}

export function WordHeadline({
  word,
  partOfSpeech,
  onWordClick,
  size = 'lg',
  stopClickPropagation = false,
}: WordHeadlineProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopClickPropagation) e.stopPropagation()
        onWordClick?.()
      }}
      className="btn-squish self-start text-left"
      aria-label={`Play ${word}`}
    >
      <span className={cn('break-words', SIZES[size])}>{word}</span>
      {partOfSpeech && <span className="ml-2 font-serif text-sm italic text-text-muted">{partOfSpeech}</span>}
    </button>
  )
}
