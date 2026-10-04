import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { ThreeView } from '@/components/three/ThreeView'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../../../shared/speech'
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
import { BridgeScene } from './BridgeScene'

/**
 * Word Bridge: see the Vietnamese meaning, type the English word letter by letter. Each right letter lays a plank;
 * a wrong one falls into the river; two misses reveal the letter (the answer then counts as Hard). Producing the
 * spelling yourself is the strongest kind of recall.
 */

const ROUND = 8

export default function WordBridge(): React.JSX.Element {
  const scene = useRef<BridgeScene | null>(null)
  const round = useRound(() => wordbook.activityRound(ROUND))
  const { item, index, items, finished } = round
  const [spell, setSpell] = useState<wordbook.Spelling | null>(null)
  const [outcome, setOutcome] = useState<'walking' | 'done' | 'gave-up' | null>(null)

  // New word: fresh spelling + empty bridge.
  useEffect(() => {
    if (!item) return
    const s = wordbook.newSpelling(item.term)
    setSpell(s)
    setOutcome(null)
    scene.current?.startWord(s.letters.length)
  }, [item])

  const finishWord = useCallback(
    async (hinted: boolean) => {
      if (!item) return
      setOutcome('walking')
      void playAudioUrl(speechUrl(item.term))
      await Promise.all([scene.current?.complete(), round.answer(wordbook.activityRating({ correct: true, hinted }))])
      setOutcome('done')
    },
    [item, round],
  )

  const press = useCallback(
    (key: string) => {
      if (!spell || outcome) return
      const { state, event } = wordbook.applyKey(spell, key)
      if (event === 'ignored') return
      setSpell(state)
      if (event === 'crack') scene.current?.crack(spell.pos)
      else scene.current?.layPlank(spell.pos, spell.letters[spell.pos], event === 'hint')
      if (event === 'done') void finishWord(state.hinted)
    },
    [spell, outcome, finishWord],
  )

  const giveUp = async (): Promise<void> => {
    if (!spell || !item || outcome) return
    for (let i = spell.pos; i < spell.letters.length; i++) scene.current?.layPlank(i, spell.letters[i], true)
    setSpell({ ...spell, pos: spell.letters.length, done: true, hinted: true })
    setOutcome('gave-up')
    void playAudioUrl(speechUrl(item.term))
    await round.answer('again')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (ignoreGameKey(e)) return
      if ((outcome === 'done' || outcome === 'gave-up') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        round.next()
        return
      }
      press(e.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, outcome, round])

  const panel =
    items === null ? null : items.length === 0 ? (
      <EmptyRound what="Word Bridge needs words with a Vietnamese meaning in My words." />
    ) : finished ? (
      <ActivitySummary title="Word Bridge" right={round.right} total={items.length} onAgain={round.restart} />
    ) : (
      item &&
      spell && (
        <PanelCard>
          <PanelHeader label="Word Bridge" index={index} total={items.length} />
          <p className="mt-4 text-sm text-text-muted">Type the English word for</p>
          <p className="mt-1 text-2xl font-semibold leading-snug text-text-primary">{item.meaning}</p>
          <SpellingSlots spell={spell} />
          {outcome === null ? (
            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-text-muted">Just start typing. Two misses reveal a letter.</p>
              <Button variant="ghost" size="sm" onClick={() => void giveUp()}>
                Show me
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                {outcome === 'gave-up'
                  ? 'It will come back soon.'
                  : spell.hinted
                    ? 'Across, with a little help.'
                    : 'Across in one go.'}{' '}
                {item.phonetic && <span className="text-text-muted">/{item.phonetic}/</span>}
              </p>
              <Button size="sm" disabled={outcome === 'walking'} onClick={round.next}>
                Next
              </Button>
            </div>
          )}
        </PanelCard>
      )
    )

  return (
    <ActivityLayout
      title="Word Bridge"
      scene={
        <ThreeView
          className="absolute inset-0"
          create={(c) => new BridgeScene(c)}
          onStage={(s) => {
            scene.current = s
            if (s && spell) s.startWord(spell.letters.length)
          }}
        />
      }
      panel={panel}
    />
  )
}
