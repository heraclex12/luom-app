import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Droplets, X } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui'
import { WordGarden, type GardenHandle } from '@/components/garden/WordGarden'
import { cn } from '@/lib/cn'
import * as wordbook from '@/wordbook'

/**
 * Garden rescue: the wilting plants are today's due words. Each one asks for the English word of a Vietnamese
 * meaning; a right answer waters it (it perks up as a sprout), a wrong one makes it shudder. Every answer is a real
 * review (Good / Again), so watering the garden is the same as doing today's reviews, just greener.
 */

interface Target {
  dictId: number
  term: string
  meaning: string
}

const MAX_PLANTS = 15
const XP_PER_PLANT = 6

export default function GardenRescue(): React.JSX.Element {
  const navigate = useNavigate()
  const garden = useRef<GardenHandle>(null)
  const [plants, setPlants] = useState<wordbook.Plant[] | null>(null)
  const [targets, setTargets] = useState<Target[]>([])
  const [pool, setPool] = useState<Target[]>([])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [saved, setSaved] = useState(0)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    void (async () => {
      const all = await wordbook.loadGarden()
      const thirsty = all.filter((p) => p.stage === 'thirsty').slice(0, MAX_PLANTS)
      const [own, extra] = await Promise.all([
        wordbook.meaningsOf(thirsty.map((p) => p.dictId)),
        wordbook.quizPool(60).catch(() => []),
      ])
      const byId = new Map(own.map((o) => [o.dictId, o]))
      setPlants(all)
      setTargets(thirsty.map((p) => byId.get(p.dictId)).filter((t): t is Target => !!t))
      setPool([...own, ...extra])
    })()
  }, [])

  // XP once the round is over (saved is final by then).
  useEffect(() => {
    if (finished && saved > 0) void wordbook.recordGame(saved * XP_PER_PLANT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  const target = targets[i]
  const question = useMemo(() => (target ? wordbook.rescueQuestion(target, pool) : null), [target, pool])

  // Keep the view still and point at the plant being asked about.
  useEffect(() => {
    garden.current?.setAutoRotate(finished || !target)
    garden.current?.focus(finished || !target ? null : target.dictId)
  }, [target, finished, plants])

  const next = (): void => {
    setPicked(null)
    if (i + 1 >= targets.length) setFinished(true)
    else setI(i + 1)
  }

  const answer = async (k: number): Promise<void> => {
    if (!question || !target || picked !== null) return
    setPicked(k)
    const right = k === question.answer
    void wordbook.quickRate(target.dictId, right ? 'good' : 'again')
    if (right) {
      setSaved((s) => s + 1)
      await garden.current?.water(target.dictId)
      setTimeout(next, 350)
    } else {
      await garden.current?.shake(target.dictId)
    }
  }

  const done = finished || (plants !== null && targets.length === 0)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar segments={['My words', 'Garden rescue']} />
      <div className="flex min-h-0 flex-1 flex-col gap-6 px-8 pb-8 pt-4 lg:flex-row">
        <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-2xl bg-surface-1">
          {plants && <WordGarden handleRef={garden} plants={plants} className="absolute inset-0" />}
        </div>

        <aside className="flex w-full shrink-0 flex-col lg:w-[360px]">
          {plants === null ? null : done ? (
            <Summary
              total={targets.length}
              saved={saved}
              onStudy={() => navigate('/wordbook/study')}
              onHome={() => navigate('/wordbook')}
            />
          ) : (
            question &&
            target && (
              <section className="rounded-2xl border border-border bg-surface-1 p-6">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-text-accent">
                    <Droplets className="size-3.5" />
                    Thirsty plant
                  </span>
                  <span className="tabular-nums">
                    {i + 1} / {targets.length}
                  </span>
                </div>
                <p className="mt-4 text-sm text-text-muted">Which word means</p>
                <p className="mt-1 text-2xl font-semibold leading-snug text-text-primary">{question.meaning}</p>
                <div className="mt-5 grid gap-2.5">
                  {question.options.map((o, k) => {
                    const state =
                      picked === null ? 'idle' : k === question.answer ? 'right' : k === picked ? 'wrong' : 'dim'
                    return (
                      <button
                        key={o}
                        type="button"
                        disabled={picked !== null}
                        onClick={() => void answer(k)}
                        className={cn(
                          'can-focus flex items-center justify-between rounded-xl border px-4 py-3 text-left font-serif text-lg transition-colors',
                          state === 'idle' && 'border-border bg-surface-2 hover:border-border-strong',
                          state === 'right' && 'border-border-success bg-bg-success text-text-success',
                          state === 'wrong' && 'border-border-danger bg-bg-danger text-text-danger',
                          state === 'dim' && 'border-border bg-surface-2 opacity-50',
                        )}
                      >
                        {o}
                        {state === 'right' && <Check className="size-4" strokeWidth={3} />}
                        {state === 'wrong' && <X className="size-4" strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
                {picked !== null && picked !== question.answer && (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-text-secondary">It will come back soon so you can save it.</p>
                    <Button size="sm" onClick={next}>
                      Next
                    </Button>
                  </div>
                )}
              </section>
            )
          )}
        </aside>
      </div>
    </div>
  )
}

function Summary({
  total,
  saved,
  onStudy,
  onHome,
}: {
  total: number
  saved: number
  onStudy: () => void
  onHome: () => void
}): React.JSX.Element {
  if (total === 0)
    return (
      <section className="rounded-2xl border border-border bg-surface-1 p-6">
        <p className="text-lg font-semibold text-text-primary">Nothing is thirsty right now</p>
        <p className="mt-2 text-sm text-text-secondary">
          Plants droop when their words are due for review. Come back when you see a drop over one.
        </p>
        <Button className="mt-5" variant="secondary" onClick={onHome}>
          Back to My words
        </Button>
      </section>
    )
  return (
    <section className="rounded-2xl border border-border bg-surface-1 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-accent">Garden rescue</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
        {saved === total ? 'Every plant saved' : `${saved} of ${total} plants saved`}
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        {saved > 0 ? `+${saved * XP_PER_PLANT} XP. ` : ''}
        {saved < total ? 'The ones you missed come back soon.' : 'Your garden is green again.'}
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={onStudy}>Study more</Button>
        <Button variant="secondary" onClick={onHome}>
          Done
        </Button>
      </div>
    </section>
  )
}
