import { useCallback, useRef, useState } from 'react'
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { gradeTyped, type QuizRating } from '@/wordbook'
import { spellingDiff } from './logic'

/** What an auto-graded exercise reports to the page. */
export interface ExerciseAnswer {
  rating: QuizRating
  correct: boolean
  /** A typed answer (type / listen / cloze) — counts toward the Focus quest when right. */
  typed: boolean
}

export type TypedResult = ReturnType<typeof gradeTyped>['result']

/** Small caption above an exercise ("Pick the meaning", "Type the English word"…). */
export function ExerciseCaption({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{children}</span>
}

/**
 * Typed-answer state: value, submit (grade against target), give up (= wrong). Blurs the field on
 * submit so the page's Enter / Space → Continue shortcut takes over.
 */
export function useTypedAnswer(target: string, onAnswer: (a: ExerciseAnswer) => void) {
  const [value, setValue] = useState('')
  const [graded, setGraded] = useState<{ result: TypedResult; typed: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const finish = useCallback(
    (typed: string, g: ReturnType<typeof gradeTyped>) => {
      setGraded({ result: g.result, typed })
      inputRef.current?.blur()
      onAnswer({ rating: g.rating, correct: g.result !== 'wrong', typed: true })
    },
    [onAnswer],
  )
  const submit = useCallback(() => {
    if (graded || !value.trim()) return
    finish(value, gradeTyped(value, target))
  }, [graded, value, target, finish])
  const giveUp = useCallback(() => {
    if (graded) return
    finish('', { result: 'wrong', rating: 1 })
  }, [graded, finish])

  return { value, setValue, graded, submit, giveUp, inputRef }
}

const TONE: Record<TypedResult, { box: string; icon: React.ReactNode; title: string }> = {
  correct: {
    box: 'border-border-success bg-bg-success text-text-success',
    icon: <CircleCheck className="size-4" />,
    title: 'Correct!',
  },
  typo: {
    box: 'border-border-warning bg-bg-warning text-text-warning',
    icon: <TriangleAlert className="size-4" />,
    title: 'Almost — watch the spelling',
  },
  wrong: {
    box: 'border-border-danger bg-bg-danger text-text-danger',
    icon: <CircleX className="size-4" />,
    title: 'Not quite',
  },
}

/** Result banner after a typed answer: green / amber (spelling diff) / red (the answer). */
export function TypedFeedback({
  result,
  typed,
  target,
}: {
  result: TypedResult
  typed: string
  target: string
}): React.JSX.Element {
  const tone = TONE[result]
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-card border px-4 py-3', tone.box)} role="status">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {tone.icon}
        {tone.title}
      </span>
      {result !== 'correct' && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span>
            Answer:{' '}
            <span className="font-serif text-lg font-semibold text-text-primary">
              {result === 'typo'
                ? spellingDiff(typed, target).map((s, i) => (
                    <span key={i} className={cn(!s.ok && 'rounded-sm bg-fill-warning/25 text-text-warning underline decoration-2 underline-offset-4')}>
                      {s.char}
                    </span>
                  ))
                : target}
            </span>
          </span>
          {typed.trim() && (
            <span>
              You typed: <span className="line-through decoration-text-danger/60">{typed}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Answer field styling shared by type / listen (big, centred). */
export const ANSWER_INPUT =
  'h-12 w-full rounded-card bg-fill-field px-4 text-center font-serif text-2xl text-text-primary shadow-field-ring outline-none ' +
  'placeholder:font-sans placeholder:text-base placeholder:text-text-muted transition-[box-shadow,background-color] duration-150 ' +
  'focus-visible:bg-surface-popover focus-visible:shadow-focus read-only:opacity-80'

/** Keyframes for the light Play-mode effects (XP float, combo pop, confetti). Rendered once where used. */
export function GameFxStyles(): React.JSX.Element {
  return (
    <style>{`
@keyframes envi-xp-float { 0% { opacity: 0; transform: translate(-50%, 6px) scale(.9) } 15% { opacity: 1; transform: translate(-50%, -4px) scale(1.05) } 100% { opacity: 0; transform: translate(-50%, -44px) scale(1) } }
@keyframes envi-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1) } }
@keyframes envi-confetti { 0% { opacity: 1; transform: translate(0, 0) rotate(0deg) } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) } }
@media (prefers-reduced-motion: reduce) { .envi-fx { animation: none !important; opacity: 0 } }
`}</style>
  )
}
