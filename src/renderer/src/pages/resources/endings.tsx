import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import { speechUrl } from '../../../../shared/speech'
import { ENDINGS, type EndingSet } from './data/sounds'
import { pickQuestion, type Question } from './logic'
import { Speak } from './parts'

/**
 * Word endings: how -s / -es and -ed sound (three sounds each, decided by the sound before), with playable examples
 * and a quiz per set ("Which ending do you hear in 'watched'?").
 */
export function EndingsContent(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-10">
      {ENDINGS.map((set) => (
        <section key={set.id} className="flex flex-col gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-text-primary">{set.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">{set.intro}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {set.groups.map((g) => (
              <article key={g.sound} className="flex flex-col gap-2 rounded-card bg-surface-1 p-4">
                <p className="font-serif text-2xl font-bold text-text-accent">{g.sound}</p>
                <p className="text-xs leading-relaxed text-text-muted">{g.rule}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {g.words.map((w) => (
                    <Speak key={w} text={w} label={<span className="text-sm text-text-primary">{w}</span>} />
                  ))}
                </div>
              </article>
            ))}
          </div>
          <EndingQuiz set={set} />
        </section>
      ))}
    </div>
  )
}

function EndingQuiz({ set }: { set: EndingSet }): React.JSX.Element {
  const words = useMemo(() => set.groups.flatMap((g, gi) => g.words.map((w) => ({ w, gi }))), [set])
  const [q, setQ] = useState<Question>(() => pickQuestion(words.length, Math.random, null))
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, asked: 0 })
  const item = words[q.index]
  const answer = (gi: number): void => {
    if (picked !== null) return
    setPicked(gi)
    setScore((s) => ({ right: s.right + (gi === item.gi ? 1 : 0), asked: s.asked + 1 }))
    void playAudioUrl(speechUrl(item.w, 'us'))
  }
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card bg-bg-accent/50 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-secondary">
          Which ending do you hear in <span className="font-serif text-lg font-bold text-text-primary">{item.w}</span>?
        </p>
        <p className="text-xs text-text-muted">{score.asked ? `${score.right} of ${score.asked} right` : 'Say it to yourself first, then pick.'}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {set.groups.map((g, gi) => {
          const right = picked !== null && gi === item.gi
          const wrong = picked === gi && gi !== item.gi
          return (
            <button
              key={g.sound}
              type="button"
              onClick={() => answer(gi)}
              disabled={picked !== null}
              className={cn(
                'can-focus inline-flex h-9 min-w-16 items-center justify-center gap-1 rounded-full px-3.5 font-serif text-base font-bold transition-colors',
                right ? 'bg-fill-brand text-on-brand' : wrong ? 'bg-bg-danger text-text-danger' : 'bg-surface-0 text-text-primary hover:bg-fill-control-hover',
              )}
            >
              {right && <Check className="size-4" />}
              {wrong && <X className="size-4" />}
              {g.sound}
            </button>
          )
        })}
        {picked !== null && (
          <Button
            variant="brand"
            size="sm"
            onClick={() => {
              setQ(pickQuestion(words.length, Math.random, q))
              setPicked(null)
            }}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
