import { useEffect } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui'
import type { PickedCloze } from './logic'
import { ExerciseCaption, TypedFeedback, useTypedAnswer, type ExerciseAnswer } from './shared'

/**
 * Fill in the blank: an example sentence with the word blanked (inline input) and its Vietnamese
 * translation underneath. Graded with gradeTyped against the exact form used (may be inflected).
 */
export function ClozeExercise({
  cloze,
  onAnswer,
}: {
  cloze: PickedCloze
  onAnswer: (a: ExerciseAnswer) => void
}): React.JSX.Element {
  const t = useTypedAnswer(cloze.answer, onAnswer)
  const { inputRef } = t
  useEffect(() => inputRef.current?.focus(), [inputRef])
  // Blank width follows the answer length (no hint beyond that), within sane bounds.
  const width = `${Math.min(Math.max(cloze.answer.length, 4), 18) + 2}ch`
  const tone =
    t.graded?.result === 'correct'
      ? 'border-border-success text-text-success'
      : t.graded?.result === 'typo'
        ? 'border-border-warning text-text-warning'
        : t.graded
          ? 'border-border-danger text-text-danger'
          : 'border-border-400 focus:border-border-accent'

  return (
    <div className="flex flex-col gap-6">
      <ExerciseCaption>Fill in the blank</ExerciseCaption>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          t.submit()
        }}
      >
        <p className="font-serif text-2xl leading-relaxed text-text-primary">
          {cloze.before}
          <input
            ref={inputRef}
            value={t.value}
            onChange={(e) => t.setValue(e.target.value)}
            readOnly={!!t.graded}
            aria-label="Missing word"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{ width }}
            className={cn(
              'mx-1 border-b-2 bg-transparent px-1 text-center font-serif text-2xl text-text-primary outline-none transition-colors',
              tone,
            )}
          />
          {cloze.after}
        </p>
        {cloze.translation && <p className="text-sm leading-relaxed text-text-secondary">{cloze.translation}</p>}
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
      {t.graded && <TypedFeedback result={t.graded.result} typed={t.graded.typed} target={cloze.answer} />}
    </div>
  )
}
