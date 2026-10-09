import { useMemo, useState } from 'react'
import { Check, Play, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import { speechUrl } from '../../../../shared/speech'
import { SOUND_CONTRASTS } from './data/sounds'
import { pickQuestion, type Question } from './logic'
import { Speak } from './parts'

/**
 * Sound pairs: minimal pairs Vietnamese speakers often mix up, by contrast (ship / sheep, light / night…), each with
 * a tip and both words playable; a listening quiz plays one word of a pair and asks which it was.
 */
export function SoundPairsContent(): React.JSX.Element {
  const [only, setOnly] = useState<string | null>(null)
  const contrasts = only ? SOUND_CONTRASTS.filter((c) => c.id === only) : SOUND_CONTRASTS
  return (
    <div className="flex flex-col gap-8">
      <Quiz key={only ?? 'all'} contrastId={only} />
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[null, ...SOUND_CONTRASTS.map((c) => c.id)].map((id) => {
            const c = SOUND_CONTRASTS.find((x) => x.id === id)
            return (
              <button
                key={id ?? 'all'}
                type="button"
                onClick={() => setOnly(id)}
                className={cn(
                  'can-focus rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  only === id ? 'bg-fill-brand text-on-brand' : 'bg-fill-control text-text-secondary hover:bg-fill-control-hover',
                )}
              >
                {!c ? 'All sounds' : c.sounds ? `/${c.sounds[0]}/ – /${c.sounds[1]}/` : c.chip}
              </button>
            )
          })}
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))]">
          {contrasts.map((c) => (
            <article key={c.id} className="flex flex-col gap-3 rounded-card bg-surface-1 p-4">
              <header>
                {c.sounds ? (
                  <>
                    <p className="font-serif text-lg font-bold text-text-primary">
                      /{c.sounds[0]}/ <span className="text-text-muted">or</span> /{c.sounds[1]}/
                    </p>
                    <p className="text-sm font-medium text-text-secondary">{c.title}</p>
                  </>
                ) : (
                  <p className="font-serif text-lg font-bold text-text-primary">{c.title}</p>
                )}
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{c.tip}</p>
              </header>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {c.pairs.map(([a, b]) => (
                  <li key={a + b} className="col-span-2 grid grid-cols-subgrid">
                    <Speak text={a} label={<span className="text-sm text-text-primary">{a}</span>} className="justify-self-start" />
                    <Speak text={b} label={<span className="text-sm text-text-primary">{b}</span>} className="justify-self-start" />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

/** "Which word did you hear?" over the chosen contrast (or all of them). */
function Quiz({ contrastId }: { contrastId: string | null }): React.JSX.Element {
  const pairs = useMemo(
    () => SOUND_CONTRASTS.filter((c) => !contrastId || c.id === contrastId).flatMap((c) => c.pairs),
    [contrastId],
  )
  const [q, setQ] = useState<Question>(() => pickQuestion(pairs.length, Math.random, null))
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, asked: 0 })
  const pair = pairs[q.index]
  const word = pair[q.side]
  const play = (): void => void playAudioUrl(speechUrl(word, 'us'))
  const answer = (side: number): void => {
    if (picked !== null) return
    setPicked(side)
    setScore((s) => ({ right: s.right + (side === q.side ? 1 : 0), asked: s.asked + 1 }))
  }
  const next = (): void => {
    const nq = pickQuestion(pairs.length, Math.random, q)
    setQ(nq)
    setPicked(null)
    void playAudioUrl(speechUrl(pairs[nq.index][nq.side], 'us'))
  }
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-card bg-bg-accent/50 p-5">
      <div className="min-w-0 flex-1">
        <p className="font-hand text-lg leading-none text-text-accent">Listening quiz</p>
        <p className="mt-1 font-serif text-lg font-bold text-text-primary">Which word did you hear?</p>
        <p className="mt-0.5 text-xs text-text-muted">
          {score.asked ? `${score.right} of ${score.asked} right` : 'Play the word, then pick one. Play it as often as you like.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={play}>
          <Play className="size-3.5" />
          Play
        </Button>
        {pair.map((w, side) => {
          const right = picked !== null && side === q.side
          const wrong = picked === side && side !== q.side
          return (
            <button
              key={w}
              type="button"
              onClick={() => answer(side)}
              disabled={picked !== null}
              className={cn(
                'can-focus inline-flex h-9 min-w-24 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
                right ? 'bg-fill-brand text-on-brand' : wrong ? 'bg-bg-danger text-text-danger' : 'bg-surface-0 text-text-primary hover:bg-fill-control-hover',
              )}
            >
              {right && <Check className="size-4" />}
              {wrong && <X className="size-4" />}
              {w}
            </button>
          )
        })}
        {picked !== null && (
          <Button variant="brand" size="sm" onClick={next}>
            Next
          </Button>
        )}
      </div>
    </section>
  )
}
