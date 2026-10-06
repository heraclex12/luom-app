import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { Seal } from '@/components/seal/Seal'
import type { PlantStage } from '@/wordbook'
import { GameFxStyles } from '../exercises/shared'
import { leafBurst } from '../exercises/logic'

export interface AnswerFxEvent {
  id: number
  kind: 'right' | 'wrong'
}

/** A Good rating: the word's seal is pressed onto the card (see SealStamp). */
export interface SealStampEvent {
  id: number
  term: string
  /** The word's stage after the rating. */
  stage: PlantStage
}

/**
 * Good / Easy: the word's seal inks down onto the card's top-right corner, like the chop on a woodblock print,
 * for the moment before the next card. Decorative (the rating itself is announced by the page); the press is
 * still with Reduce motion (seal.css), the seal simply appears.
 */
export function SealStamp({ stamp }: { stamp: SealStampEvent | null }): React.JSX.Element | null {
  if (!stamp) return null
  return (
    <span key={stamp.id} aria-hidden className="pointer-events-none absolute -top-1 right-0 z-20 -rotate-3">
      <Seal stage={stamp.stage} term={stamp.term} size="lg" pressing />
    </span>
  )
}

/**
 * Right answer: a check pops and a handful of leaves burst out of it. (Wrong answers shake the exercise; see the
 * `envi-shake` class.) Purely decorative, never blocks clicks; off with Reduce motion.
 */
export function AnswerFx({ fx }: { fx: AnswerFxEvent | null }): React.JSX.Element | null {
  const leaves = useMemo(() => (fx?.kind === 'right' ? leafBurst(14, fx.id) : []), [fx])
  if (!fx || fx.kind !== 'right') return <GameFxStyles />
  return (
    <div key={fx.id} aria-hidden className="pointer-events-none absolute left-1/2 top-[34%] z-20 size-0">
      <GameFxStyles />
      {leaves.map((l, i) => (
        <span
          key={i}
          className="envi-fx absolute rounded-[0_80%_0_80%]"
          style={
            {
              width: l.size,
              height: l.size * 0.7,
              left: -l.size / 2,
              top: -l.size / 2,
              background: l.color,
              opacity: 0,
              animation: `envi-leaf 900ms cubic-bezier(.16,1,.3,1) ${l.delay}ms forwards`,
              '--dx': `${l.dx}px`,
              '--dy': `${l.dy}px`,
              '--rot': `${l.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
      <span
        className="envi-fx absolute -left-6 -top-6 grid size-12 place-items-center rounded-full bg-fill-brand text-on-brand"
        style={{ animation: 'envi-check 1100ms cubic-bezier(.16,1,.3,1) forwards' }}
      >
        <Check className="size-6" strokeWidth={3} />
      </span>
    </div>
  )
}
