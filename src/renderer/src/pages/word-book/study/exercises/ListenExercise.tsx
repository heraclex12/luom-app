import { useEffect } from 'react'
import { SpeakerIcon } from '@/components/common/SpeakerIcon'
import { AnswerField } from './TypeExercise'
import { ExerciseCaption, TypedFeedback, useTypedAnswer, type ExerciseAnswer } from './shared'

/** Dictation: the word plays on show (big replay button) → type what you hear. Graded like Type. */
export function ListenExercise({
  target,
  audioUrl,
  onPlay,
  onAnswer,
}: {
  target: string
  /** Resolved audio URL (speaker animation). */
  audioUrl: string | null
  onPlay: () => void
  onAnswer: (a: ExerciseAnswer) => void
}): React.JSX.Element {
  const t = useTypedAnswer(target, onAnswer)
  const { inputRef } = t
  useEffect(() => inputRef.current?.focus(), [inputRef])

  return (
    <div className="flex flex-col gap-6">
      <ExerciseCaption>Type what you hear</ExerciseCaption>
      <div className="flex flex-col items-center gap-2 py-4">
        <button
          type="button"
          onClick={() => {
            onPlay()
            inputRef.current?.focus()
          }}
          aria-label="Play again"
          className="btn-squish grid size-20 place-items-center rounded-full border border-border-300 bg-surface-1 text-text-primary shadow-sm transition-colors hover:border-border-400"
        >
          {/* Neutral ground: the speaker tints accent blue while playing. */}
          <SpeakerIcon url={audioUrl} className="size-9" />
        </button>
        <span className="text-xs text-text-muted">Click to play again</span>
      </div>
      <AnswerField t={t} placeholder="Type what you hear" />
      {t.graded && <TypedFeedback result={t.graded.result} typed={t.graded.typed} target={target} />}
    </div>
  )
}
