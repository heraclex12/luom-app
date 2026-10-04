import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { ThreeView } from '@/components/three/ThreeView'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../../../shared/speech'
import { ActivityLayout, ActivitySummary, EmptyRound, ignoreGameKey, PanelCard, PanelHeader, useRound } from '../shell'
import { FireflyScene } from './FireflyScene'

/**
 * Firefly Night: hear a word, then catch the firefly carrying its spelling among close look-alikes. The right one
 * flies into your jar, which glows brighter with every catch. Trains listening and exact spelling recognition.
 */

const ROUND = 8

export default function FireflyNight(): React.JSX.Element {
  const scene = useRef<FireflyScene | null>(null)
  const labelEls = useRef<(HTMLElement | null)[]>([])
  const [pool, setPool] = useState<{ dictId: number; term: string }[]>([])
  const round = useRound(async () => {
    const [words, extra] = await Promise.all([wordbook.activityRound(ROUND), wordbook.quizPool(120).catch(() => [])])
    setPool([...words, ...extra])
    return words
  })
  const { item, index, items, finished } = round
  const [picked, setPicked] = useState<number | null>(null)

  const question = useMemo(() => (item ? wordbook.lookalikeOptions(item, pool, 4) : null), [item, pool])

  const listen = useCallback(() => {
    if (!item) return
    scene.current?.listen()
    void playAudioUrl(speechUrl(item.term))
  }, [item])

  useEffect(() => {
    if (index === 0) scene.current?.emptyJar()
  }, [items, index])

  useEffect(() => {
    if (!question) return
    setPicked(null)
    scene.current?.setFlies(question.options.length)
    const id = setTimeout(listen, 600)
    return () => clearTimeout(id)
  }, [question, listen])

  const pick = useCallback(
    (k: number) => {
      if (!question || picked !== null || k >= question.options.length) return
      setPicked(k)
      const right = k === question.answer
      if (right) void scene.current?.catchFly(k)
      else {
        scene.current?.missFly(k)
        scene.current?.hint(question.answer)
      }
      void round.answer(right ? 'good' : 'again')
    },
    [question, picked, round],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (ignoreGameKey(e)) return
      if (picked !== null) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          round.next()
        }
        return
      }
      if (e.key === ' ' || e.key.toLowerCase() === 'r') {
        e.preventDefault()
        listen()
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= 4) pick(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pick, picked, round, listen])

  const labelRefs = useMemo(
    () =>
      [0, 1, 2, 3].map((i) => (el: HTMLElement | null) => {
        labelEls.current[i] = el
        scene.current?.setLabels([...labelEls.current])
      }),
    [],
  )

  const panel =
    items === null ? null : items.length === 0 ? (
      <EmptyRound what="Firefly Night needs words with a Vietnamese meaning in My words." />
    ) : finished ? (
      <ActivitySummary
        title="Firefly Night"
        right={round.right}
        total={items.length}
        note={`Your jar holds ${round.right} ${round.right === 1 ? 'firefly' : 'fireflies'}. Every answer counted as a review.`}
        onAgain={round.restart}
      />
    ) : (
      item &&
      question && (
        <PanelCard>
          <PanelHeader label="Firefly Night" index={index} total={items.length} />
          <div className="mt-4 flex items-center gap-3">
            <Button variant="secondary" className="gap-2" onClick={listen}>
              <Volume2 className="size-4" />
              Hear it again
            </Button>
            <p className="text-sm text-text-muted">Catch the firefly with the word you hear.</p>
          </div>
          {picked === null ? (
            <p className="mt-5 text-xs text-text-muted">
              Click a firefly or press 1 to {question.options.length}. Space or R plays the word again.
            </p>
          ) : (
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                {picked === question.answer ? 'Into the jar! ' : 'It flew away. '}
                <span className="font-serif text-lg font-semibold text-text-primary">{item.term}</span>
                <span className="ml-2">{item.meaning}</span>
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
      title="Firefly Night"
      scene={
        <ThreeView
          className="absolute inset-0"
          create={(c) => new FireflyScene(c)}
          onStage={(s) => {
            scene.current = s
            if (!s) return
            s.setLabels([...labelEls.current])
            if (question) s.setFlies(question.options.length)
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
                  'absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 font-serif text-base font-semibold transition-[opacity,background-color] duration-300',
                  picked === null
                    ? 'bg-[#2c3566]/85 text-[#f6ffc2] ring-1 ring-[#f6ff9a]/40 hover:bg-[#3a4580]'
                    : k === question.answer
                      ? 'bg-[#f6ff9a] text-[#2c3566]'
                      : 'bg-[#2c3566]/70 text-[#f6ffc2]/60',
                )}
              >
                <span className="font-sans text-[10px] opacity-70">{k + 1}</span>
                {o}
              </button>
            ))}
        </ThreeView>
      }
      panel={panel}
    />
  )
}
