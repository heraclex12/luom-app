import { useCallback, useEffect, useRef, useState } from 'react'
import { Coins } from 'lucide-react'
import { Button } from '@/components/ui'
import { ThreeView } from '@/components/three/ThreeView'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../../../shared/speech'
import { readBest, submitBest } from '../../play/common'
import {
  ActivityLayout,
  ActivitySummary,
  EmptyRound,
  ignoreGameKey,
  PanelCard,
  PanelHeader,
  SpellingSlots,
  useRound,
} from '../shell'
import { TeaScene } from './TeaScene'

/**
 * Bubble Tea Shop: animal customers order by the Vietnamese meaning; type the English word to fill their cup, one
 * pearl per letter. The customer's patience drains slowly and with each wrong letter; a patient customer tips more.
 * Two misses on a letter reveal it (Hard); "Show me" serves the drink anyway (Again).
 */

const ROUND = 8

type Outcome = 'serving' | 'done' | 'gave-up' | null

export default function BubbleTea(): React.JSX.Element {
  const scene = useRef<TeaScene | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const round = useRound(() => wordbook.activityRound(ROUND))
  const { item, index, items, finished } = round
  const [spell, setSpell] = useState<wordbook.Spelling | null>(null)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [misses, setMisses] = useState(0)
  const [arrivedAt, setArrivedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [coins, setCoins] = useState(0)
  const [tip, setTip] = useState(0)
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null)

  // New customer: fresh spelling, empty cup; the patience clock starts when they reach the counter.
  useEffect(() => {
    if (!item) return
    const s = wordbook.newSpelling(item.term)
    setSpell(s)
    setOutcome(null)
    setMisses(0)
    setArrivedAt(null)
    let alive = true
    const arrived = scene.current?.newOrder(s.letters.length, item.dictId) ?? Promise.resolve()
    void arrived.then(() => alive && setArrivedAt(Date.now()))
    return () => {
      alive = false
    }
  }, [item])

  useEffect(() => {
    if (index === 0 && !finished) setCoins(0)
  }, [items, index, finished])

  // Patience ticks while waiting.
  useEffect(() => {
    if (arrivedAt === null || outcome) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [arrivedAt, outcome])

  const patience = spell && arrivedAt !== null ? wordbook.patienceLeft(now - arrivedAt, spell.letters.length, misses) : 1
  const patienceRef = useRef(patience)
  if (!outcome) patienceRef.current = patience

  useEffect(() => {
    if (!outcome) scene.current?.setMood(patience < 0.3 ? 'sad' : 'idle')
  }, [patience < 0.3, outcome]) // eslint-disable-line react-hooks/exhaustive-deps

  const serve = useCallback(
    async (gaveUp: boolean, hinted: boolean) => {
      if (!item) return
      const o = { patience: patienceRef.current, hinted, gaveUp }
      const t = wordbook.teaTip(o)
      setTip(t)
      setCoins((c) => c + t)
      setOutcome('serving')
      void playAudioUrl(speechUrl(item.term))
      await Promise.all([scene.current?.serve(!gaveUp, t), round.answer(wordbook.teaRating(o))])
      setOutcome(gaveUp ? 'gave-up' : 'done')
    },
    [item, round],
  )

  const press = useCallback(
    (key: string) => {
      if (!spell || outcome) return
      const { state, event } = wordbook.applyKey(spell, key)
      if (event === 'ignored') return
      setSpell(state)
      if (event === 'crack') {
        setMisses((m) => m + 1)
        scene.current?.miss()
        return
      }
      if (event === 'hint') setMisses((m) => m + 1)
      scene.current?.pearl()
      if (event === 'done') void serve(false, state.hinted)
    },
    [spell, outcome, serve],
  )

  const giveUp = (): void => {
    if (!spell || outcome) return
    for (let i = spell.pos; i < spell.letters.length; i++) scene.current?.pearl()
    setSpell({ ...spell, pos: spell.letters.length, done: true, hinted: true })
    void serve(true, true)
  }

  const next = useCallback(() => {
    if (items && index + 1 >= items.length) setBest(submitBest('tea', coins))
    round.next()
  }, [items, index, coins, round])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (ignoreGameKey(e)) return
      if ((outcome === 'done' || outcome === 'gave-up') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
        return
      }
      press(e.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, outcome, next])

  const bindBubble = useCallback((el: HTMLDivElement | null) => {
    bubbleRef.current = el
    scene.current?.setBubble(el)
  }, [])

  const restart = (): void => {
    setBest(null)
    round.restart()
  }

  const panel =
    items === null ? null : items.length === 0 ? (
      <EmptyRound what="The tea shop needs words with a Vietnamese meaning in My words." />
    ) : finished ? (
      <ActivitySummary
        title="Bubble Tea Shop"
        right={round.right}
        total={items.length}
        note={`You earned ${coins} ${coins === 1 ? 'coin' : 'coins'} in tips${best?.isNew ? ', a new best' : best ? ` (best ${best.best})` : ''}. Every order counted as a review.`}
        onAgain={restart}
      />
    ) : (
      item &&
      spell && (
        <PanelCard>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <PanelHeader label="Bubble Tea Shop" index={index} total={items.length} />
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-text-warning">
              <Coins className="size-4" />
              {coins}
            </span>
          </div>
          <p className="mt-4 text-sm text-text-muted">The customer wants the English word for</p>
          <p className="mt-1 text-2xl font-semibold leading-snug text-text-primary">{item.meaning}</p>
          <SpellingSlots spell={spell} />
          {outcome === null || outcome === 'serving' ? (
            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-text-muted">Type to drop the pearls in. Two misses reveal a letter.</p>
              <Button variant="ghost" size="sm" disabled={!!outcome} onClick={giveUp}>
                Show me
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                {outcome === 'gave-up'
                  ? 'Served with a sigh. This word will come back soon.'
                  : tip >= 8
                    ? `A happy customer: +${tip} coins.`
                    : `Served: +${tip} ${tip === 1 ? 'coin' : 'coins'}.`}{' '}
                {item.phonetic && <span className="text-text-muted">/{item.phonetic}/</span>}
              </p>
              <Button size="sm" onClick={next}>
                Next
              </Button>
            </div>
          )}
        </PanelCard>
      )
    )

  return (
    <ActivityLayout
      title="Bubble Tea Shop"
      scene={
        <ThreeView
          className="absolute inset-0"
          create={(c) => new TeaScene(c)}
          onStage={(s) => {
            scene.current = s
            if (!s) return
            s.setBubble(bubbleRef.current)
            if (spell && item) void s.newOrder(spell.letters.length, item.dictId).then(() => setArrivedAt(Date.now()))
          }}
        >
          {item && !finished && (
            <div
              ref={bindBubble}
              className="pointer-events-none absolute left-0 top-0 pb-3 transition-opacity duration-200"
            >
              <div className="relative max-w-[16rem] rounded-2xl bg-white px-4 py-2.5 text-center shadow-[0_6px_18px_rgb(120_60_80/0.18)]">
                <p className="text-[15px] font-semibold leading-snug text-[#3a2b33]">{item.meaning}</p>
                <div className="mx-auto mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-[#f6dbe2]">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-200',
                      patience > 0.5 ? 'bg-[#5cc49a]' : patience > 0.25 ? 'bg-[#f2b84b]' : 'bg-[#ef6f6c]',
                    )}
                    style={{ width: `${Math.round((outcome ? patienceRef.current : patience) * 100)}%` }}
                  />
                </div>
                <span className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 bg-white" />
              </div>
            </div>
          )}
        </ThreeView>
      }
      panel={panel}
    />
  )
}
