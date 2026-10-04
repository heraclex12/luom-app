import { useEffect, useMemo, useReducer } from 'react'
import { ArrowRight, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { GameFlow, Kbd, Stat, useSpeak, type GameResult } from './shell'
import {
  buildSoundQuestions,
  initialSound,
  soundDone,
  soundReducer,
  soundScore,
  soundXp,
  type SoundQuestion,
} from './sound'

/** Sound Check: hear a word, pick its spelling from close lookalikes. Rules in ./sound. */
export default function SoundPage(): React.JSX.Element {
  return (
    <GameFlow
      id="sound"
      build={(pool) => buildSoundQuestions(pool)}
      play={(questions, finish) => <Game questions={questions} onFinish={finish} />}
    />
  )
}

function Game({
  questions,
  onFinish,
}: {
  questions: SoundQuestion[]
  onFinish: (r: GameResult) => void
}): React.JSX.Element {
  const reducer = useMemo(() => soundReducer(questions), [questions])
  const [s, dispatch] = useReducer(reducer, initialSound)
  const done = soundDone(s, questions)
  const q = questions[s.index]
  const speak = useSpeak()
  const answered = s.picked !== null

  // Play each word as its question appears.
  useEffect(() => {
    if (q) speak(q.target.term)
  }, [q, speak])

  useEffect(() => {
    if (!done) return
    onFinish({
      score: soundScore(s),
      xp: soundXp(s, questions.length),
      stats: [
        { label: 'Correct', value: `${s.correct} / ${questions.length}` },
        { label: 'Accuracy', value: `${Math.round((s.correct / questions.length) * 100)}%` },
      ],
    })
  }, [done, s, questions.length, onFinish])

  useEffect(() => {
    if (done || !q) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= q.options.length) dispatch({ type: 'pick', option: n - 1 })
      else if (e.key === 'r' || e.key === 'R' || e.key === ' ') speak(q.target.term)
      else if (e.key === 'Enter') dispatch({ type: 'next' })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, q, speak])

  if (!q) return <div />

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stat label="Question" value={`${s.index + 1} of ${questions.length}`} />
        <Stat label="Correct" value={s.correct} />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="secondary" size="iconLg" round onClick={() => speak(q.target.term)} tabIndex={-1} aria-label="Play the word again">
          <Volume2 className="size-5" />
        </Button>
        <div>
          <p className="text-lg font-medium text-text-primary">Which word did you hear?</p>
          <p className="flex items-center gap-1.5 text-sm text-text-muted">
            <Kbd>R</Kbd> or <Kbd>Space</Kbd> to hear it again
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answerIndex
          const isPicked = i === s.picked
          return (
            <button
              key={`${s.index}:${opt}`}
              type="button"
              tabIndex={-1}
              disabled={answered}
              onClick={() => dispatch({ type: 'pick', option: i })}
              className={cn(
                'btn-squish flex h-16 items-center gap-3 rounded-card px-4 text-left shadow-card-ring',
                !answered && 'bg-surface-1 text-text-primary transition-colors hover:bg-surface-2',
                answered && isAnswer && 'bg-bg-success text-text-success',
                answered && isPicked && !isAnswer && 'bg-bg-danger text-text-danger',
                answered && !isAnswer && !isPicked && 'bg-surface-1 text-text-muted'
              )}
            >
              <Kbd>{i + 1}</Kbd>
              <span className="text-2xl font-medium tracking-tight">{opt}</span>
            </button>
          )
        })}
      </div>

      <div className="flex min-h-11 items-center gap-4 border-t-[0.5px] border-border-200 pt-5">
        {answered && (
          <>
            <p className="min-w-0 flex-1 text-base text-text-secondary">
              <span className="font-medium text-text-primary">{q.target.term}</span>, {q.target.meaning}
            </p>
            <Button variant="brand" size="lg" onClick={() => dispatch({ type: 'next' })} autoFocus tabIndex={-1}>
              {s.index + 1 < questions.length ? 'Next' : 'See results'}
              <ArrowRight />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
