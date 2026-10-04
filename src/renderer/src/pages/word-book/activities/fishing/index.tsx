import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fish } from 'lucide-react'
import { Button } from '@/components/ui'
import { ThreeView } from '@/components/three/ThreeView'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../../../shared/speech'
import { ActivityLayout, ActivitySummary, EmptyRound, ignoreGameKey, PanelCard, PanelHeader, useRound } from '../shell'
import { FishingScene } from './FishingScene'

/**
 * Word Fishing: a Vietnamese meaning, four fish carrying English words. Click (or press 1-4) the fish with the right
 * word to reel it in; it moves into your aquarium, where it grows as you learn the word. A wrong fish swims off.
 */

const ROUND = 8

type Pool = { dictId: number; term: string; meaning: string }[]

export default function WordFishing(): React.JSX.Element {
  const navigate = useNavigate()
  const scene = useRef<FishingScene | null>(null)
  const labelEls = useRef<(HTMLElement | null)[]>([])
  const [pool, setPool] = useState<Pool>([])
  const round = useRound(async () => {
    const [words, extra] = await Promise.all([wordbook.activityRound(ROUND), wordbook.quizPool(60).catch(() => [])])
    setPool([...words, ...extra])
    return words
  })
  const { item, index, items, finished } = round
  const [picked, setPicked] = useState<number | null>(null)
  const [caught, setCaught] = useState(0)

  const question = useMemo(() => (item ? wordbook.rescueQuestion(item, pool) : null), [item, pool])
  const optionIds = useMemo(() => {
    const byTerm = new Map(pool.map((p) => [p.term, p.dictId]))
    return question?.options.map((o) => byTerm.get(o) ?? o.length) ?? []
  }, [question, pool])

  useEffect(() => {
    if (!question) return
    setPicked(null)
    scene.current?.calm()
    scene.current?.setFish(optionIds.map((id) => wordbook.fishLook(id, 2)))
  }, [question, optionIds])

  useEffect(() => {
    if (index === 0) setCaught(0)
  }, [items, index])

  const pick = useCallback(
    (k: number) => {
      if (!item || !question || picked !== null || k >= question.options.length) return
      setPicked(k)
      const right = k === question.answer
      void playAudioUrl(speechUrl(item.term))
      if (right) {
        setCaught((c) => c + 1)
        void scene.current?.catch(k)
        void wordbook.addToAquarium(item.dictId)
      } else {
        scene.current?.escape(k)
        scene.current?.highlight(question.answer)
      }
      void round.answer(right ? 'good' : 'again')
    },
    [item, question, picked, round],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (ignoreGameKey(e)) return
      if (picked !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        round.next()
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= 4) pick(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pick, picked, round])

  const labelRefs = useMemo(
    () =>
      [0, 1, 2, 3].map((i) => (el: HTMLElement | null) => {
        labelEls.current[i] = el
        scene.current?.setLabels([...labelEls.current])
      }),
    [],
  )

  const aquariumButton = (
    <Button variant="secondary" className="gap-1.5" onClick={() => navigate('/wordbook/play/aquarium')}>
      <Fish className="size-4" />
      Aquarium
    </Button>
  )

  const panel =
    items === null ? null : items.length === 0 ? (
      <EmptyRound what="Word Fishing needs words with a Vietnamese meaning in My words." />
    ) : finished ? (
      <ActivitySummary
        title="Word Fishing"
        right={round.right}
        total={items.length}
        note={`${caught} fish swam into your aquarium. They grow as you learn their words.`}
        onAgain={round.restart}
        extra={aquariumButton}
      />
    ) : (
      item &&
      question && (
        <PanelCard>
          <PanelHeader label="Word Fishing" index={index} total={items.length} />
          <p className="mt-4 text-sm text-text-muted">Catch the fish that means</p>
          <p className="mt-1 text-2xl font-semibold leading-snug text-text-primary">{question.meaning}</p>
          {picked === null ? (
            <p className="mt-5 text-xs text-text-muted">Click a fish, or press 1 to {question.options.length}.</p>
          ) : (
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                {picked === question.answer ? 'Caught! ' : 'That one got away. '}
                <span className="font-serif text-lg font-semibold text-text-primary">{item.term}</span>
                {item.phonetic && <span className="ml-2 text-text-muted">/{item.phonetic}/</span>}
              </p>
              <Button size="sm" onClick={round.next}>
                Next
              </Button>
            </div>
          )}
        </PanelCard>
      )
    )

  return (
    <ActivityLayout
      title="Word Fishing"
      scene={
        <ThreeView
          className="absolute inset-0"
          create={(c) => new FishingScene(c)}
          onStage={(s) => {
            scene.current = s
            if (!s) return
            s.setLabels([...labelEls.current])
            if (question) s.setFish(optionIds.map((id) => wordbook.fishLook(id, 2)))
          }}
        >
          {question &&
            !finished &&
            question.options.map((o, k) => (
              <button
                key={`${index}-${k}`}
                ref={labelRefs[k]}
                type="button"
                disabled={picked !== null}
                onClick={() => pick(k)}
                className={cn(
                  'absolute left-0 top-0 mb-1 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold shadow-[0_4px_12px_rgb(20_60_70/0.2)] transition-[opacity,background-color] duration-300',
                  picked === null
                    ? 'bg-white/95 text-[#24424b] hover:bg-white'
                    : k === question.answer
                      ? 'bg-[#fff1a8] text-[#5a4300]'
                      : k === picked
                        ? 'bg-[#ffd6d2] text-[#7a2620]'
                        : 'bg-white/80 text-[#24424b]/60',
                )}
              >
                <span className="grid size-4 place-items-center rounded-full bg-[#24424b]/10 text-[10px]">{k + 1}</span>
                {o}
              </button>
            ))}
        </ThreeView>
      }
      panel={panel}
    />
  )
}
