import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { QuizItem } from '@/episodes'

/** After the episode: the story question, then "what does this word mean?" for the episode's words. */
export function EpisodeQuiz({
  items,
  onDone,
}: {
  items: QuizItem[]
  onDone: (correct: number, total: number) => void
}): React.JSX.Element {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const item = items[i]

  const pick = (k: number): void => {
    if (picked !== null) return
    setPicked(k)
    if (k === item.answer) setCorrect((c) => c + 1)
  }
  const [submitted, setSubmitted] = useState(false)
  const next = (): void => {
    if (submitted) return
    if (i + 1 >= items.length) {
      setSubmitted(true) // one finish, however fast the button is clicked
      onDone(correct, items.length)
    } else {
      setI(i + 1)
      setPicked(null)
    }
  }

  return (
    <section className="rounded-card bg-surface-1 p-7">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="font-semibold text-text-accent">
          {item.kind === 'story' ? 'About the episode' : 'Your words'}
        </span>
        <span className="tabular-nums">
          {i + 1} / {items.length}
        </span>
      </div>
      <p className={cn('mt-3 text-text-primary', item.kind === 'word' ? 'font-serif text-3xl font-semibold' : 'text-xl font-medium')}>
        {item.kind === 'word' ? item.prompt : item.prompt}
      </p>
      {item.kind === 'word' && <p className="mt-1 text-sm text-text-muted">What does it mean here?</p>}
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {item.options.map((o, k) => {
          const isAnswer = k === item.answer
          const state = picked === null ? 'idle' : isAnswer ? 'right' : k === picked ? 'wrong' : 'dim'
          return (
            <button
              key={k}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(k)}
              className={cn(
                'can-focus flex items-center justify-between gap-3 rounded-[12px] border px-4 py-3 text-left text-[15px] transition-colors',
                state === 'idle' && 'border-border bg-surface-2 hover:border-border-strong',
                state === 'right' && 'border-border-success bg-bg-success text-text-success',
                state === 'wrong' && 'envi-shake border-border-danger bg-bg-danger text-text-danger',
                state === 'dim' && 'border-border bg-surface-2 opacity-50',
              )}
            >
              <span>{o}</span>
              {state === 'right' && <Check className="size-4 shrink-0" strokeWidth={3} />}
              {state === 'wrong' && <X className="size-4 shrink-0" strokeWidth={3} />}
            </button>
          )
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <Button disabled={picked === null || submitted} onClick={next}>
          {i + 1 >= items.length ? 'Finish' : 'Next'}
        </Button>
      </div>
    </section>
  )
}
