import type { PlantStage } from '@/wordbook'
import { cn } from '@/lib/cn'

/**
 * The word seal: a rounded green tile with the word's first letter, marking how far a word has come.
 * seed = dashed outline, sprout = lower half filled, thirsty = filled once but due (amber ring),
 * bloom = solid green. `pressing` stamps it once (e.g. right after a Good rating).
 */
export interface SealProps {
  stage: PlantStage
  /** The word; its first letter is carved into the seal. */
  term: string
  size?: 'sm' | 'md' | 'lg'
  pressing?: boolean
  /** Delay before the press lands (to stamp several seals one after another). */
  pressDelayMs?: number
  /** Ornament only (e.g. a book cover monogram): hidden from assistive tech, no stage tooltip. */
  decorative?: boolean
  className?: string
}

const STAGE_LABEL: Record<PlantStage, string> = {
  seed: 'New word',
  sprout: 'Learning',
  thirsty: 'Due for review',
  bloom: 'Mastered',
}

export function Seal({
  stage,
  term,
  size = 'md',
  pressing = false,
  pressDelayMs,
  decorative = false,
  className,
}: SealProps): React.JSX.Element {
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : STAGE_LABEL[stage]}
      title={decorative ? undefined : STAGE_LABEL[stage]}
      className={cn('envi-seal', `envi-seal-${size}`, `envi-seal-${stage}`, pressing && 'envi-seal-press', className)}
      style={pressing && pressDelayMs ? { animationDelay: `${pressDelayMs}ms` } : undefined}
    >
      <span aria-hidden>{(term.trim()[0] ?? '?').toUpperCase()}</span>
    </span>
  )
}

export { STAGE_LABEL as SEAL_STAGE_LABEL }

