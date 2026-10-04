import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { ThreeView } from '@/components/three/ThreeView'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../../../shared/speech'
import { ActivityLayout, ActivitySummary, EmptyRound, PanelCard, PanelHeader, useRound } from '../shell'
import { PalaceScene, SPOT_NAME, SPOTS, type Spot } from './PalaceScene'

/**
 * Memory Palace: your words live on the objects of a room, always the same word on the same object. New words get a
 * short tour (see and hear each one on its object); then you walk the room along a fixed route and recall the word
 * at each object. Tying a word to a place is one of the oldest ways to remember things for a long time.
 */

type Item = { dictId: number; spot: Spot; word: wordbook.ActivityWord }

const TOURED_KEY = 'luom.palace.toured'

function readToured(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(TOURED_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

async function loadPalace(): Promise<Item[]> {
  const placed = await wordbook.palacePlacements(SPOTS)
  return placed.map((p) => ({ dictId: p.word.dictId, spot: p.spot as Spot, word: p.word }))
}

export default function MemoryPalace(): React.JSX.Element {
  const scene = useRef<PalaceScene | null>(null)
  const round = useRound(loadPalace)
  const { item, index, items, finished } = round
  const labelEls = useRef(new Map<Spot, HTMLElement>())
  // Tour: placements new since the last visit.
  const tour = useMemo(() => {
    const seen = readToured()
    return (items ?? []).filter((p) => seen[p.spot] !== p.dictId)
  }, [items])
  const [tourStep, setTourStep] = useState(0)
  const touring = items !== null && tourStep < tour.length
  const [value, setValue] = useState('')
  const [hinted, setHinted] = useState(false)
  const [result, setResult] = useState<'correct' | 'typo' | 'wrong' | null>(null)
  const [answered, setAnswered] = useState<Set<Spot>>(new Set())

  useEffect(() => {
    setTourStep(0)
    setAnswered(new Set())
  }, [items])

  const current = touring ? tour[tourStep] : item

  // Camera + audio follow the current object.
  useEffect(() => {
    if (!current) {
      scene.current?.visit(null)
      return
    }
    scene.current?.visit(current.spot)
    if (touring) void playAudioUrl(speechUrl(current.word.term))
    setValue('')
    setHinted(false)
    setResult(null)
  }, [current, touring])

  useEffect(() => {
    if (finished) scene.current?.visit(null)
  }, [finished])

  const endTour = (): void => {
    const seen = readToured()
    for (const p of tour) seen[p.spot] = p.dictId
    try {
      localStorage.setItem(TOURED_KEY, JSON.stringify(seen))
    } catch {
      // not remembered: the tour shows again next time
    }
    setTourStep(tour.length)
  }

  const check = (): void => {
    if (!item || result || !value.trim()) return
    const g = wordbook.gradeTyped(value, item.word.term)
    setResult(g.result)
    setAnswered((s) => new Set(s).add(item.spot))
    if (g.result !== 'wrong') scene.current?.celebrate(item.spot)
    void playAudioUrl(speechUrl(item.word.term))
    void round.answer(g.result === 'wrong' ? 'again' : g.result === 'typo' || hinted ? 'hard' : 'good')
  }

  const bindLabel = useCallback((spot: Spot) => (el: HTMLDivElement | null) => {
    if (el) labelEls.current.set(spot, el)
    else labelEls.current.delete(spot)
    scene.current?.setLabels(new Map(labelEls.current))
  }, [])

  const showLabel = (p: Item): boolean =>
    (touring && current?.spot === p.spot) || answered.has(p.spot) || finished

  const labels = (items ?? []).map((p) => (
    <div
      key={p.spot}
      ref={bindLabel(p.spot)}
      className={cn(
        'pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-lg bg-surface-2/95 px-2.5 py-1 text-center shadow-[0_4px_14px_rgb(17_22_20/0.18)] ring-1 ring-border transition-opacity duration-300',
        showLabel(p) ? 'opacity-100' : '!opacity-0',
      )}
    >
      <div className="font-serif text-base font-semibold text-text-primary">{p.word.term}</div>
      <div className="text-[11px] text-text-muted">{p.word.meaning}</div>
    </div>
  ))

  let panel: React.ReactNode = null
  if (items === null) panel = null
  else if (items.length === 0)
    panel = <EmptyRound what="The Memory Palace needs words with a Vietnamese meaning in My words." />
  else if (finished)
    panel = (
      <ActivitySummary
        title="Memory Palace"
        right={round.right}
        total={items.length}
        note="Your words stay on the same objects: next time, picture the room before you answer."
        onAgain={round.restart}
      />
    )
  else if (touring && current)
    panel = (
      <PanelCard>
        <PanelHeader label="Placing new words" index={tourStep} total={tour.length} />
        <p className="mt-4 text-sm text-text-muted">On {SPOT_NAME[current.spot]} lives</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="font-serif text-3xl font-semibold text-text-primary">{current.word.term}</p>
          <button
            type="button"
            aria-label="Play pronunciation"
            className="rounded-md p-1 text-text-muted hover:text-text-primary"
            onClick={() => void playAudioUrl(speechUrl(current.word.term))}
          >
            <Volume2 className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-base text-text-secondary">{current.word.meaning}</p>
        <p className="mt-4 text-sm text-text-muted">Picture it there for a second: the stranger, the better.</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => (tourStep + 1 >= tour.length ? endTour() : setTourStep(tourStep + 1))}>
            {tourStep + 1 >= tour.length ? 'Walk the room' : 'Next object'}
          </Button>
        </div>
      </PanelCard>
    )
  else if (item)
    panel = (
      <PanelCard>
        <PanelHeader label="Walk the room" index={index} total={items.length} />
        <p className="mt-4 text-xl font-semibold text-text-primary">Which word lives on {SPOT_NAME[item.spot]}?</p>
        {hinted && !result && <p className="mt-1 text-sm text-text-secondary">It means: {item.word.meaning}</p>}
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (result) round.next()
            else check()
          }}
        >
          <input
            autoFocus
            value={value}
            readOnly={!!result}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type the word"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'h-12 w-full rounded-xl border bg-surface-2 px-4 font-serif text-2xl outline-none transition-colors',
              result === null && 'border-border focus:border-border-accent',
              result === 'correct' && 'border-border-success text-text-success',
              result === 'typo' && 'border-border-warning text-text-warning',
              result === 'wrong' && 'border-border-danger text-text-danger line-through',
            )}
          />
          {result ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                <span className="font-serif text-lg font-semibold text-text-primary">{item.word.term}</span>
                <span className="ml-2">{item.word.meaning}</span>
              </p>
              <Button size="sm" type="submit">
                Next
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="gap-1.5"
                disabled={hinted}
                onClick={() => setHinted(true)}
              >
                <Eye className="size-3.5" />
                Show meaning
              </Button>
              <Button size="sm" type="submit" disabled={!value.trim()}>
                Check
              </Button>
            </div>
          )}
        </form>
      </PanelCard>
    )

  return (
    <ActivityLayout
      title="Memory Palace"
      scene={
        <ThreeView
          className="absolute inset-0"
          create={(c) => new PalaceScene(c)}
          onStage={(s) => {
            scene.current = s
            if (s) {
              s.setLabels(new Map(labelEls.current))
              if (current) s.visit(current.spot)
            }
          }}
        >
          {labels}
        </ThreeView>
      }
      panel={panel}
    />
  )
}
