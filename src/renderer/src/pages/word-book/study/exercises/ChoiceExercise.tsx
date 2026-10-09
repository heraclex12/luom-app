import { useEffect, useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/cn'
import { gradeChoice, type Choice } from '@/wordbook'
import { SpeakerIcon } from '@/components/common/SpeakerIcon'
import { choiceIndexForKey, splitPos } from './logic'
import { ExerciseCaption, GameFxStyles, type ExerciseAnswer } from './shared'

/**
 * Multiple choice: the English headword (click / speaker to hear it) + 4 Vietnamese meanings.
 * Keys 1–4 pick. After a pick the right option turns green, a wrong pick red; the page then reveals
 * the word card and a Continue button. Rating = gradeChoice (slow but right = Hard).
 * Play mode adds a combo counter and a "+10 XP" float on correct picks.
 */
export function ChoiceExercise({
  headword,
  phonetic,
  choices,
  shownAt,
  onAnswer,
  onSpeak,
  audioUrl,
  keysEnabled,
  play,
}: {
  headword: string
  phonetic: string
  choices: Choice[]
  shownAt: number
  onAnswer: (a: ExerciseAnswer) => void
  onSpeak?: () => void
  /** Resolved audio URL (speaker animation); null hides the speaker. */
  audioUrl: string | null
  /** False while a dialog is open. */
  keysEnabled: boolean
  /** Play mode: current combo (consecutive correct, updated by the page on each answer). */
  play?: { combo: number }
}): React.JSX.Element {
  const [picked, setPicked] = useState<number | null>(null)
  const pickedRef = useRef<number | null>(null)

  function pick(i: number): void {
    if (pickedRef.current != null) return
    pickedRef.current = i
    setPicked(i)
    const correct = choices[i]!.correct
    onAnswer({ rating: gradeChoice(correct, Date.now() - shownAt), correct, typed: false })
  }

  useEffect(() => {
    if (!keysEnabled || picked != null) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const i = choiceIndexForKey(e.key, choices.length)
      if (i == null) return
      e.preventDefault()
      pick(i)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const answered = picked != null
  const combo = play?.combo ?? 0

  return (
    <div className="flex flex-col gap-6">
      {play && <GameFxStyles />}
      <div className="flex items-start justify-between gap-3">
        <ExerciseCaption>Pick the meaning</ExerciseCaption>
        {play && combo >= 2 && (
          <span
            key={combo}
            className="inline-flex animate-[envi-pop_320ms_ease-out] items-center gap-1 rounded-full bg-bg-warning-chip px-2.5 py-0.5 text-xs font-bold text-text-warning"
          >
            <Flame className="size-3.5" />
            Combo ×{combo}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <button
          type="button"
          onClick={onSpeak}
          className="btn-squish font-serif text-5xl font-semibold break-words text-text-primary"
          aria-label={`Play ${headword}`}
        >
          {headword}
        </button>
        {(phonetic || audioUrl) && (
          <button
            type="button"
            onClick={onSpeak}
            disabled={!audioUrl}
            className="btn-squish inline-flex items-center gap-1.5 rounded-full bg-fill-control px-3 py-1 text-sm text-text-secondary disabled:pointer-events-none"
          >
            {audioUrl && <SpeakerIcon url={audioUrl} className="size-4" />}
            {phonetic && <span>{phonetic}</span>}
          </button>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {choices.map((c, i) => {
          const isPicked = picked === i
          const { pos, text } = splitPos(c.text)
          const tone = !answered
            ? 'border-border-300 bg-surface-1 hover:border-border-400'
            : c.correct
              ? 'border-border-success bg-bg-success'
              : isPicked
                ? 'border-border-danger bg-bg-danger'
                : 'border-border-300 bg-surface-1 opacity-50'
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => pick(i)}
              className={cn(
                'btn-squish relative flex items-start gap-3 rounded-card border px-4 py-3.5 text-left transition-colors disabled:pointer-events-none',
                tone,
              )}
            >
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-md border text-xs font-semibold tabular-nums',
                  answered && c.correct
                    ? 'border-transparent bg-fill-success text-on-success'
                    : answered && isPicked
                      ? 'border-transparent bg-fill-danger text-on-danger'
                      : 'border-border-300 text-text-muted',
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 text-[15px] leading-snug text-text-primary">
                {pos && <span className="mr-1.5 font-serif text-sm italic text-text-muted">{pos}</span>}
                {text}
              </span>
              {play && isPicked && c.correct && (
                <span className="envi-fx pointer-events-none absolute top-1 left-1/2 animate-[envi-xp-float_1100ms_ease-out_forwards] text-sm font-bold text-text-success">
                  +10 XP
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
