/**
 * Cover placeholder: brand background + first letter of the title (no real cover image yet).
 * Size / radius come from the caller via className.
 */
import { cn } from '@/lib/cn'

export function Cover({ book, className }: { book: string; className?: string }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-14 shrink-0 place-items-center rounded-md bg-fill-brand text-lg font-semibold text-on-brand',
        className,
      )}
    >
      {book.slice(0, 1)}
    </span>
  )
}
