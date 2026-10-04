import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { GameFxStyles } from '../exercises/shared'
import { leafBurst } from '../exercises/logic'

export interface AnswerFxEvent {
  id: number
  kind: 'right' | 'wrong'
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
              animation: `envi-leaf 900ms cubic-bezier(.2,.7,.3,1) ${l.delay}ms forwards`,
              '--dx': `${l.dx}px`,
              '--dy': `${l.dy}px`,
              '--rot': `${l.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
      <span
        className="envi-fx absolute -left-6 -top-6 grid size-12 place-items-center rounded-full bg-fill-brand text-on-brand shadow-[0_6px_20px_rgb(14_122_103/0.35)]"
        style={{ animation: 'envi-check 1100ms cubic-bezier(.2,.8,.3,1.2) forwards' }}
      >
        <Check className="size-6" strokeWidth={3} />
      </span>
    </div>
  )
}
