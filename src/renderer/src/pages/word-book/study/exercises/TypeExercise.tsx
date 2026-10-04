import { useEffect } from 'react'
import { Button } from '@/components/ui'
import { splitPos } from './logic'
import { ANSWER_INPUT, ExerciseCaption, TypedFeedback, useTypedAnswer, type ExerciseAnswer } from './shared'

/**
 * Recall the spelling: Vietnamese meaning lines (+ part of speech) and the example's translation as a
 * hint → type the English word. Enter submits; "I don't know" = wrong. Graded with gradeTyped.
 */
export function TypeExercise({
  senses,
  hint,
  target,
  onAnswer,
}: {
  /** Vietnamese meaning lines ("n. …"). */
  senses: string[]
  /** Vietnamese translation of an example sentence (optional hint). */
  hint?: string
  target: string
  onAnswer: (a: ExerciseAnswer) => void
}): React.JSX.Element {
  const t = useTypedAnswer(target, onAnswer)
  const { inputRef } = t
  useEffect(() => inputRef.current?.focus(), [inputRef])

  return (
    <div className="flex flex-col gap-6">
      <ExerciseCaption>Type the English word</ExerciseCaption>
      <div className="flex flex-col gap-2 py-2">
        {senses.slice(0, 3).map((line, i) => {
          const { pos, text } = splitPos(line)
          return (
            <p key={i} className="text-xl leading-snug text-text-primary">
              {pos && <span className="mr-2 font-serif text-base italic text-text-muted">{pos}</span>}
              {text}
            </p>
          )
        })}
        {hint && (
          <p className="mt-2 border-l-2 border-border-300 pl-3 text-sm leading-relaxed text-text-secondary">
            <span className="mr-1.5 text-xs font-medium text-text-muted">Hint</span>
            {hint}
          </p>
        )}
      </div>
      <AnswerField t={t} placeholder="Type the English word" />
      {t.graded && <TypedFeedback result={t.graded.result} typed={t.graded.typed} target={target} />}
    </div>
  )
}

/** Big answer input + Check / I don't know (shared by type and listen). */
export function AnswerField({
  t,
  placeholder,
}: {
  t: ReturnType<typeof useTypedAnswer>
  placeholder: string
}): React.JSX.Element {
  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        t.submit()
      }}
    >
      <input
        ref={t.inputRef}
        value={t.value}
        onChange={(e) => t.setValue(e.target.value)}
        readOnly={!!t.graded}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={ANSWER_INPUT}
      />
      {!t.graded && (
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={t.giveUp}>
            I don’t know
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!t.value.trim()}>
            Check
          </Button>
        </div>
      )}
    </form>
  )
}
