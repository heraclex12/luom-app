import { cn } from '@/lib/cn'
import type * as practice from '@/practice'

/** A read-aloud sentence after shadowing: words the Mac heard stay as they are, missed ones are marked. */
export function ShadowLine({ tokens, className }: { tokens: practice.ShadowToken[]; className?: string }): React.JSX.Element {
  return (
    <span className={className}>
      {tokens.map((t, i) => (
        <span
          key={i}
          className={cn(t.hit === false && 'text-text-danger underline decoration-wavy decoration-1 underline-offset-4')}
        >
          {t.text}
        </span>
      ))}
    </span>
  )
}

/** "You got 5 of 6 words across." */
export function shadowSummary(tokens: practice.ShadowToken[]): string {
  const words = tokens.filter((t) => t.hit !== null)
  const hits = words.filter((t) => t.hit).length
  if (hits === words.length) return 'Every word came through. Lovely.'
  if (hits === 0) return 'Nothing came through. Try again a little slower.'
  return `You got ${hits} of ${words.length} words across. The marked ones need another go.`
}
