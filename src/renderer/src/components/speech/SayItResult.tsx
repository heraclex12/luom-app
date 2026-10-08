import { cn } from '@/lib/cn'
import * as practice from '@/practice'

/** What the Mac made of a spoken word, in one friendly line. */
export function SayItResult({ term, check }: { term: string; check: practice.WordCheck }): React.JSX.Element {
  const clear = check.ok && (check.confidence ?? 1) >= practice.CLEAR_CONFIDENCE
  const tone = clear ? 'text-text-success' : check.ok ? 'text-text-warning' : 'text-text-danger'
  return (
    <p className={cn('text-sm font-medium', tone)}>
      {clear
        ? `Clear! The Mac heard “${term}”.`
        : check.ok
          ? 'It came through, but only just. Try once more, a little slower.'
          : check.heard
            ? `The Mac heard “${check.heard}”. Listen, then try again.`
            : 'Nothing came through. Try a little closer to the microphone.'}
    </p>
  )
}
