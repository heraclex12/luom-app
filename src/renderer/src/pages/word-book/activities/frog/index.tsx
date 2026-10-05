import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, Zap } from 'lucide-react'
import { Button } from '@/components/ui'
import { ThreeView } from '@/components/three/ThreeView'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../../../shared/speech'
import { submitBest } from '../../play/common'
import { ActivityLayout, ActivitySummary, EmptyRound, ignoreGameKey, PanelCard, PanelHeader, useRound } from '../shell'
import { FrogScene } from './FrogScene'

/**
 * Frog Hop: get the frog home across the pond. Each row of lily pads shows three meanings; hop onto the one that
 * matches the English word. Quick answers are big spinning leaps that build a combo; a wrong pad sinks and the frog
 * swims back. Trains fast recognition of meaning.
 */

const ROUND = 8

type Phase = 'ready' | 'hopping' | 'landed' | 'missed' | 'moving'

export default function FrogHop(): React.JSX.Element {
  const scene = useRef<FrogScene | null>(null)
  const labelEls = useRef<(HTMLElement | null)[]>([])
  const [pool, setPool] = useState<{ dictId: number; meaning: string }[]>([])
  const round = useRound(async () => {
    const [words, extra] = await Promise.all([wordbook.activityRound(ROUND), wordbook.quizPool(60).catch(() => [])])
    setPool([...words, ...extra])
    return words
  })
  const { item, index, items, finished } = round
  const [phase, setPhase] = useState<Phase>('ready')
  const [picked, setPicked] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null)
  const askedAt = useRef(Date.now())

  const choices = useMemo(() => (item ? wordbook.buildChoices(item, pool, 3) : []), [item, pool])
  const answer = choices.findIndex((c) => c.correct)

  useEffect(() => {
    if (!items) return
    scene.current?.setRows(items.length)
    setCombo(0)
    setBestCombo(0)
    setBest(null)
  }, [items])

  useEffect(() => {
    if (!item) return
    setPicked(null)
    setPhase('ready')
    askedAt.current = Date.now()
    void playAudioUrl(speechUrl(item.term))
  }, [item])

  const pick = useCallback(
    async (k: number) => {
      if (!item || phase !== 'ready' || k >= choices.length) return
      const right = choices[k].correct
      const elapsedMs = Date.now() - askedAt.current
      const nextCombo = wordbook.frogCombo(combo, { correct: right, elapsedMs })
      setPicked(k)
      setPhase('hopping')
      setCombo(nextCombo)
      setBestCombo((b) => Math.max(b, nextCombo))
      void round.answer(right ? 'good' : 'again')
      await scene.current?.jump(index, k, right, right && elapsedMs <= wordbook.FROG_FAST_MS)
      if (right) setPhase('landed')
      else {
        scene.current?.glow(index, answer)
        setPhase('missed')
      }
    },
    [item, phase, choices, combo, round, index, answer],
  )

  const next = useCallback(async () => {
    if (!items || (phase !== 'landed' && phase !== 'missed')) return
    if (phase === 'missed') {
      setPhase('moving')
      await scene.current?.moveTo(index, answer)
    }
    if (index + 1 >= items.length) {
      setBest(submitBest('frog', bestCombo))
      void scene.current?.finish()
    }
    round.next()
  }, [items, phase, index, answer, bestCombo, round])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (ignoreGameKey(e)) return
      if (phase === 'landed' || phase === 'missed') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          void next()
        }
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= 3) void pick(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pick, next, phase])

  const row = useRef(index)
  row.current = index
  const labelRefs = useMemo(
    () =>
      [0, 1, 2].map((i) => (el: HTMLElement | null) => {
        labelEls.current[i] = el
        scene.current?.setLabels([...labelEls.current], row.current)
      }),
    [],
  )
  useEffect(() => {
    scene.current?.setLabels([...labelEls.current], index)
  }, [index])

  const panel =
    items === null ? null : items.length === 0 ? (
      <EmptyRound what="Frog Hop needs words with a Vietnamese meaning in My words." />
    ) : finished ? (
      <ActivitySummary
        title="Frog Hop"
        right={round.right}
        total={items.length}
        note={`The frog made it home. Longest combo: ${bestCombo}${best?.isNew ? ', a new best' : best ? ` (best ${best.best})` : ''}.`}
        onAgain={round.restart}
      />
    ) : (
      item && (
        <PanelCard>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <PanelHeader label="Frog Hop" index={index} total={items.length} />
            </div>
            {combo > 1 && (
              <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-text-accent">
                <Zap className="size-4" />
                {combo} combo
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <p className="font-serif text-3xl font-semibold text-text-primary">{item.term}</p>
            <button
              type="button"
              aria-label="Play pronunciation"
              className="rounded-md p-1 text-text-muted hover:text-text-primary"
              onClick={() => void playAudioUrl(speechUrl(item.term))}
            >
              <Volume2 className="size-4" />
            </button>
          </div>
          {phase === 'ready' || phase === 'hopping' ? (
            <p className="mt-4 text-xs text-text-muted">
              Hop onto the pad with its meaning: click it, or press 1 to {choices.length}. Answer within{' '}
              {wordbook.FROG_FAST_MS / 1000} seconds for a big leap.
            </p>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                {phase === 'landed' ? 'Hop! ' : 'Splash! It means '}
                <span className="font-medium text-text-primary">{item.meaning}</span>
                {item.phonetic && <span className="ml-2 text-text-muted">/{item.phonetic}/</span>}
              </p>
              <Button size="sm" disabled={phase === 'moving'} onClick={() => void next()}>
                {index + 1 >= items.length ? 'Hop home' : 'Next'}
              </Button>
            </div>
          )}
        </PanelCard>
      )
    )

  return (
    <ActivityLayout
      title="Frog Hop"
      scene={
        <ThreeView
          className="absolute inset-0"
          create={(c) => new FrogScene(c)}
          onStage={(s) => {
            scene.current = s
            if (!s) return
            if (items) s.setRows(items.length)
            s.setLabels([...labelEls.current], index)
          }}
        >
          {item &&
            !finished &&
            choices.map((c, k) => (
              <button
                key={`${index}-${k}`}
                ref={labelRefs[k]}
                type="button"
                disabled={phase !== 'ready'}
                onClick={() => void pick(k)}
                className={cn(
                  'absolute left-0 top-0 flex w-max items-start gap-1.5 rounded-xl px-2.5 py-1.5 text-left text-[13px] font-semibold leading-tight shadow-[0_4px_12px_rgb(20_70_50/0.2)] transition-[opacity,background-color] duration-300',
                  picked === null
                    ? 'bg-white/95 text-[#23463a] hover:bg-white'
                    : k === answer
                      ? 'bg-[#fff1a8] text-[#5a4300]'
                      : k === picked
                        ? 'bg-[#ffd6d2] text-[#7a2620]'
                        : 'bg-white/80 text-[#23463a]/60',
                )}
              >
                <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-[#23463a]/10 text-[10px]">{k + 1}</span>
                <span className="min-w-0 break-words">{c.text}</span>
              </button>
            ))}
        </ThreeView>
      }
      panel={panel}
    />
  )
}
