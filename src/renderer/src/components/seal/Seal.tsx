import type { PlantStage } from '@/wordbook'
import { cn } from '@/lib/cn'
import { sealGlyph } from './glyphs'

/**
 * The son-red seal (đóng dấu): a square chop with the word's first letter carved in seal script (./glyphs.ts), marking
 * how far a word has come.
 * seed = not yet carved (dashed outline), sprout = half-inked, thirsty = inked but dry (needs review, sophora ring),
 * bloom = pressed solid. `pressing` stamps the full impression once (e.g. right after a Good rating).
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
  const glyph = sealGlyph(term)
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : STAGE_LABEL[stage]}
      title={decorative ? undefined : STAGE_LABEL[stage]}
      className={cn('envi-seal', `envi-seal-${size}`, `envi-seal-${stage}`, pressing && 'envi-seal-press', className)}
      style={pressing && pressDelayMs ? { animationDelay: `${pressDelayMs}ms` } : undefined}
    >
      {glyph ? (
        <svg aria-hidden viewBox={size === 'sm' ? '-0.9 -0.9 6.8 6.8' : '-1.25 -1.25 7.5 7.5'} className="envi-seal-glyph">
          <path d={glyphPath(glyph)} fill="currentColor" />
        </svg>
      ) : (
        <span aria-hidden>{(term.trim()[0] ?? '?').toUpperCase()}</span>
      )}
    </span>
  )
}

export { STAGE_LABEL as SEAL_STAGE_LABEL }

/** One path of square cuts for a 5×5 glyph (cells overlap a hair so the strokes carve as solid bars). */
function glyphPath(glyph: readonly string[]): string {
  let d = ''
  glyph.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') d += `M${x} ${y}h1.04v1.04h-1.04z`
  })
  return d
}
