import { useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * Generated cover (word lists / books). 3:4 book shell + serif initial, adapts to light/dark.
 * When `src` is given a real cover image is layered on top; if missing or broken it falls back
 * to the text cover. Two visual styles across four sizes:
 *
 * - `lg` / `fill`: hardcover spine + embossed frame + initial. `lg` is a fixed-width detail
 *   cover; `fill` fills its grid cell (bookshelf).
 * - `md` / `sm`: smaller shell without the hardcover outline, for lists / grids.
 *
 * `cta`: call-to-action that slides up on hover (e.g. "Continue reading"), driven by a parent `group`.
 */

/** Hardcover sizes (lg / fill): box width and shadow, frame ratio, initial size. */
const HARD_SHELL = {
  lg: { box: 'w-[104px] shadow-md', frame: 'w-[56%]', letter: 'text-3xl' },
  fill: { box: 'w-full shadow-sm', frame: 'w-[52%]', letter: 'font-serif text-4xl' },
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

  if (size === 'lg' || size === 'fill') {
    const spec = HARD_SHELL[size]
    return (
      <div
        className={cn(
          'relative aspect-[3/4] shrink-0 overflow-hidden rounded-lg bg-fill-primary',
          spec.box,
          className,
        )}
      >
        {/* Soft diagonal highlight for depth */}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-on-primary/10 to-transparent" />
        {/* Spine highlight */}
        <span className="pointer-events-none absolute inset-y-0 left-2 w-px bg-on-primary/20" />
        {/* Embossed frame + initial */}
        <div className="absolute inset-0 grid place-items-center pl-1.5">
          <span
            className={cn('grid aspect-square place-items-center rounded-sm border border-on-primary/25', spec.frame)}
          >
            <span className={cn('font-medium leading-none text-on-primary', spec.letter)}>{initial}</span>
          </span>
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
        'relative grid aspect-[3/4] shrink-0 place-items-center overflow-hidden rounded-lg bg-fill-primary shadow-sm',
        size === 'md' ? 'w-16' : 'w-10',
        className,
      )}
    >
      <span aria-hidden className="absolute inset-y-0 left-1 w-px bg-on-primary/15" />
      <span className={cn('font-serif font-medium text-on-primary', size === 'md' ? 'text-2xl' : 'text-base')}>
        {initial}
      </span>
      {src && <CoverImage src={src} />}
    </div>
  )
}
