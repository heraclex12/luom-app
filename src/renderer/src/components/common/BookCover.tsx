import { useState } from 'react'
import { cn } from '@/lib/cn'
import { coverPigment, type CoverPigment } from './coverPigment'
import { Seal } from '@/components/seal/Seal'

/**
 * Generated cover (word lists / books): a 3:4 woodblock print in one pigment (chosen from the title) with the
 * initial carved in the display face, adapts to light/dark.
 * When `src` is given a real cover image is layered on top; if missing or broken it falls back
 * to the text cover. Two visual styles across four sizes:
 *
 * - `lg` / `fill`: hardcover spine + the initial pressed as a seal. `lg` is a fixed-width detail
 *   cover; `fill` fills its grid cell (bookshelf).
 * - `md` / `sm`: smaller shell without the hardcover outline, for lists / grids.
 *
 * `cta`: call-to-action that slides up on hover (e.g. "Continue reading"), driven by a parent `group`.
 */

/** Hardcover sizes (lg / fill): box width and shadow, monogram seal size. */
const HARD_SHELL = {
  lg: { box: 'w-[104px] shadow-md', seal: '[--seal-size:48px]' },
  fill: { box: 'w-full shadow-sm', seal: '[--seal-size:64px]' },
}

/** Ground and ink per pigment (token classes, so both themes follow); the monogram seal reads --cover-bg / --cover-ink. */
const PIGMENT: Record<CoverPigment, string> = {
  son: 'bg-son text-on-brand [--cover-bg:var(--pigment-son)] [--cover-ink:var(--on-brand)]',
  dong: 'bg-dong text-on-success [--cover-bg:var(--pigment-dong)] [--cover-ink:var(--on-success)]',
  cham: 'bg-cham text-on-accent [--cover-bg:var(--pigment-cham)] [--cover-ink:var(--on-accent)]',
  hoe: 'bg-hoe text-on-warning [--cover-bg:var(--pigment-hoe)] [--cover-ink:var(--on-warning)]',
  ink: 'bg-fill-primary text-on-primary [--cover-bg:var(--fill-primary)] [--cover-ink:var(--on-primary)]',
}

/**
 * Real cover image layered over the text cover; removes itself on load error. The text cover
 * always stays in the DOM, so there's no blank flash.
 */
function CoverImage({ src }: { src: string }): React.JSX.Element | null {
  // Track which src failed (not a boolean) so a new src retries automatically.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  if (brokenSrc === src) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setBrokenSrc(src)}
      className="absolute inset-0 size-full object-cover"
    />
  )
}

export function BookCover({
  title,
  src,
  size = 'lg',
  cta,
  className,
}: {
  title: string
  /** Cover image URL; falls back to the text cover when missing or broken. */
  src?: string | null
  size?: 'lg' | 'fill' | 'md' | 'sm'
  /** CTA shown on hover (e.g. "Continue reading"); omitted = not rendered. */
  cta?: React.ReactNode
  className?: string
}): React.JSX.Element {
  const initial = title.trim().charAt(0) || '?'
  const pigment = PIGMENT[coverPigment(title)]

  if (size === 'lg' || size === 'fill') {
    const spec = HARD_SHELL[size]
    return (
      <div
        className={cn(
          'relative aspect-[3/4] shrink-0 overflow-hidden rounded-[10px]',
          pigment,
          spec.box,
          className,
        )}
      >
        {/* Spine line */}
        <span className="pointer-events-none absolute inset-y-0 left-2 w-px bg-current opacity-25" />
        {/* Monogram: the initial as a pressed seal in the cover's ink, letter left in the cover's pigment */}
        <div className="absolute inset-0 grid place-items-center pl-1.5">
          <Seal
            stage="bloom"
            term={initial}
            size="lg"
            decorative
            className={cn('[--seal-ink:var(--cover-bg)] [--seal:var(--cover-ink)]', spec.seal)}
          />
        </div>
        {src && <CoverImage src={src} />}
        {cta && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {cta}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative grid aspect-[3/4] shrink-0 place-items-center overflow-hidden rounded-[6px]',
        pigment,
        size === 'md' ? 'w-16' : 'w-10',
        className,
      )}
    >
      <span aria-hidden className="absolute inset-y-0 left-1 w-px bg-current opacity-25" />
      <span className={cn('font-serif font-bold', size === 'md' ? 'text-2xl' : 'text-base')}>
        {initial}
      </span>
      {src && <CoverImage src={src} />}
    </div>
  )
}
