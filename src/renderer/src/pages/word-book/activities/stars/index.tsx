import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { ThreeView } from '@/components/three/ThreeView'
import { cn } from '@/lib/cn'
import * as wordbook from '@/wordbook'
import { ActivityLayout, ActivitySummary, EmptyRound, ignoreGameKey, PanelCard, PanelHeader, useRound } from '../shell'
import { StarScene } from './StarScene'

/**
 * Star Sentences: a real example sentence of one of your words, written in the night sky with the word missing.
 * Pick the word that fits; a right answer draws its constellation. Meeting the word in context teaches how it is
 * used, not just what it means.
 */

const ROUND = 8

type Item = wordbook.StarQuestion & { dictId: number; state: number }

async function loadRound(): Promise<Item[]> {
  const [words, extra] = await Promise.all([wordbook.activityRound(ROUND * 2), wordbook.quizPool(40).catch(() => [])])
  const pool = [...words, ...extra]
  const out: Item[] = []
  for (const w of words) {
    const q = wordbook.starQuestion(w, pool)
    if (q) out.push({ ...q, dictId: w.dictId, state: w.state })
    if (out.length >= ROUND) break
  }
  return out
}

export default function StarSentences(): React.JSX.Element {
  const scene = useRef<StarScene | null>(null)
  const round = useRound(loadRound)
  const { item, index, items, finished } = round
  const [picked, setPicked] = useState<number | null>(null)

  useEffect(() => {
    if (!item) return
    setPicked(null)
    scene.current?.showConstellation(item.dictId)
  }, [item])

  const pick = useCallback(
    (k: number) => {
      // A number key with no option behind it (small pools have 2-3 options) does nothing.
      if (!item || picked !== null || k < 0 || k >= item.options.length) return
      setPicked(k)
      const right = item.options[k] === item.term
      if (right) scene.current?.lightUp()
      else scene.current?.dim()
      void round.answer(right ? 'good' : 'again')
    },
    [item, picked, round],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (ignoreGameKey(e)) return
      if (picked !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        round.next()
      } else if (/^[1-4]$/.test(e.key)) pick(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pick, picked, round])

  const answered = picked !== null
  const sentence = item && (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-8 pb-6 text-center">
      <p className="mx-auto max-w-3xl font-serif text-2xl leading-relaxed text-[#eaf2ff] [text-shadow:0_2px_12px_rgba(0,0,0,.6)]">
        {item.before}
        <span
          className={cn(
            'inline-block border-b-2',
            answered ? 'border-transparent font-semibold text-[#ffd34d]' : 'min-w-24 border-[#ffd34d]/70 text-transparent',
          )}
        >
          {answered ? item.answer : ' '}
        </span>
        {item.after}
      </p>
      {answered && item.vi && <p className="mx-auto mt-2 max-w-3xl text-base text-[#b8c7da]">{item.vi}</p>}
    </div>
  )

  const panel =
    items === null ? null : items.length === 0 ? (
      <EmptyRound what="Star Sentences needs words whose dictionary entry has example sentences." />
    ) : finished ? (
      <ActivitySummary title="Star Sentences" right={round.right} total={items.length} onAgain={round.restart} />
    ) : (
      item && (
        <PanelCard>
          <PanelHeader label="Star Sentences" index={index} total={items.length} />
          <p className="mt-3 text-sm text-text-muted">Which word completes the sentence in the sky?</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {item.options.map((o, k) => {
              const state = picked === null ? 'idle' : o === item.term ? 'right' : k === picked ? 'wrong' : 'dim'
              return (
                <button
                  key={o}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => pick(k)}
                  className={cn(
                    'can-focus flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-serif text-lg transition-colors',
                    state === 'idle' && 'border-border bg-surface-2 hover:border-border-strong',
                    state === 'right' && 'border-border-success bg-bg-success text-text-success',
                    state === 'wrong' && 'border-border-danger bg-bg-danger text-text-danger',
                    state === 'dim' && 'border-border bg-surface-2 opacity-50',
                  )}
                >
                  <span className="font-sans text-xs text-text-muted">{k + 1}</span>
                  {o}
                </button>
              )
            })}
          </div>
          {answered && (
            <div className="mt-4 flex justify-end">
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
      title="Star Sentences"
      scene={
        <ThreeView
          className="absolute inset-0"
          create={(c) => new StarScene(c)}
          onStage={(s) => {
            scene.current = s
            if (s && item) s.showConstellation(item.dictId)
          }}
        >
          {sentence}
        </ThreeView>
      }
      panel={panel}
    />
  )
}
