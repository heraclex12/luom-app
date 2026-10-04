import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { ThreeView } from '@/components/three/ThreeView'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../../../shared/speech'
import { ActivityLayout, ActivitySummary, EmptyRound, PanelCard, PanelHeader, useRound } from '../shell'
import { CaveScene } from './CaveScene'

/**
 * Echo Cave: hear one of your words, type what you heard. Right = its crystal lights up, a near miss (small typo)
 * counts as Hard, wrong = Again. Ties the sound of a word to its spelling.
 */

const ROUND = 8
const plainSentence = (s: string): string => s.replace(/<[^>]+>/g, '')

export default function EchoCave(): React.JSX.Element {
  const scene = useRef<CaveScene | null>(null)
  const round = useRound(() => wordbook.activityRound(ROUND))
  const { item, index, items, finished } = round
  const [value, setValue] = useState('')
  const [result, setResult] = useState<'correct' | 'typo' | 'wrong' | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const play = useCallback(() => {
    if (!item) return
    scene.current?.ripple()
    void playAudioUrl(speechUrl(item.term))
  }, [item])

  useEffect(() => {
    if (items) scene.current?.setup(items.length)
  }, [items])

  useEffect(() => {
    if (!item) return
    setValue('')
    setResult(null)
    scene.current?.setFocus(index)
    const t = setTimeout(play, 350)
    input.current?.focus()
    return () => clearTimeout(t)
  }, [item, index, play])

  const check = (): void => {
    if (!item || result || !value.trim()) return
    const g = wordbook.gradeTyped(value, item.term)
    setResult(g.result)
    scene.current?.mark(index, g.result === 'correct' ? 'lit' : g.result === 'typo' ? 'near' : 'dark')
    void round.answer(g.result === 'correct' ? 'good' : g.result === 'typo' ? 'hard' : 'again')
  }

  const example = item?.examples[0]

  const panel =
    items === null ? null : items.length === 0 ? (
      <EmptyRound what="Echo Cave needs words in My words." />
    ) : finished ? (
      <ActivitySummary title="Echo Cave" right={round.right} total={items.length} onAgain={round.restart} />
    ) : (
      item && (
        <PanelCard>
          <PanelHeader label="Echo Cave" index={index} total={items.length} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="gap-2" onClick={play}>
              <Volume2 className="size-4" />
              Hear the word
            </Button>
            {example && (
              <Button variant="ghost" size="sm" onClick={() => void playAudioUrl(speechUrl(plainSentence(example.sentence)))}>
                Hear it in a sentence
              </Button>
            )}
          </div>
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (result) round.next()
              else check()
            }}
          >
            <input
              ref={input}
              value={value}
              readOnly={!!result}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type what you heard"
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
                  <span className="font-serif text-lg font-semibold text-text-primary">{item.term}</span>
                  {item.phonetic && <span className="ml-2 text-text-muted">/{item.phonetic}/</span>}
                  <span className="ml-2">{item.meaning}</span>
                </p>
                <Button size="sm" type="submit">
                  Next
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-text-muted">Press Enter to check. A small typo still counts (as Hard).</p>
                <Button size="sm" type="submit" disabled={!value.trim()}>
                  Check
                </Button>
              </div>
            )}
          </form>
        </PanelCard>
      )
    )

  return (
    <ActivityLayout
      title="Echo Cave"
      scene={
        <ThreeView
          className="absolute inset-0"
          create={(c) => new CaveScene(c)}
          onStage={(s) => {
            scene.current = s
            if (s && items) {
              s.setup(items.length)
              s.setFocus(index)
            }
          }}
        />
      }
      panel={panel}
    />
  )
}
