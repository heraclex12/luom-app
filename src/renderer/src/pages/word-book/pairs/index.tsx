import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Ear, Volume2 } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { playAudioUrl } from '@/lib/audio'
import { ListenHint, MicButton } from '@/components/speech/MicButton'
import { SayItResult } from '@/components/speech/SayItResult'
import { useListen } from '@/components/speech/useListen'
import * as practice from '@/practice'
import { speechUrl } from '../../../../../shared/speech'

/**
 * Misheard pairs: your own minimal pairs, from the words the Mac heard as another word in Say it (resilient →
 * resident). First hear the difference (which one was it?), then say your word again.
 */

const MAX_PAIRS = 8

type Pair = { dictId: number; target: string; heard: string }

export default function MisheardPairsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [round, setRound] = useState(0)
  const [pairs, setPairs] = useState<Pair[] | null>(null)
  const [index, setIndex] = useState(0)
  /** The word played in the listening step, and the two choices in their shown order. */
  const [played, setPlayed] = useState<string>('')
  const [choices, setChoices] = useState<string[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [check, setCheck] = useState<practice.WordCheck | null>(null)
  const [heardRight, setHeardRight] = useState(0)
  const voice = useListen({ maxMs: 6000, silenceMs: 900 })
  const pair = pairs?.[index] ?? null

  useEffect(() => {
    let alive = true
    setPairs(null)
    setIndex(0)
    setHeardRight(0)
    void practice.misheardPairs().then((p) => alive && setPairs(p.slice(0, MAX_PAIRS)))
    return () => {
      alive = false
    }
  }, [round])

  useEffect(() => {
    if (!pair) return
    const both = [pair.target, pair.heard]
    const play = both[Math.random() < 0.5 ? 0 : 1]!
    setPlayed(play)
    setChoices(Math.random() < 0.5 ? both : [...both].reverse())
    setPicked(null)
    setCheck(null)
    voice.cancel()
    void playAudioUrl(speechUrl(play, 'us'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair?.target, pair?.heard, index])

  const pick = (c: string): void => {
    if (picked) return
    setPicked(c)
    if (c === played) setHeardRight((n) => n + 1)
  }

  const say = async (): Promise<void> => {
    if (!pair) return
    setCheck(null)
    const heard = await voice.listen()
    if (heard) setCheck(await practice.checkSpokenWord({ dictId: pair.dictId, term: pair.target }, heard))
  }

  const finished = pairs !== null && pairs.length > 0 && index >= pairs.length

  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['Play', 'Misheard pairs']} backTo="/wordbook/play" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-8 pb-16 pt-8 lg:px-10">
          <header className="mb-6 space-y-1.5">
            <h1 className="font-serif text-3xl font-bold text-text-primary">Misheard pairs</h1>
            <p className="text-sm text-text-secondary">
              Words your Mac heard as another word when you said them. Hear the difference, then say yours again.
            </p>
          </header>

          {pairs !== null && pairs.length === 0 ? (
            <Card className="flex flex-col items-center gap-4 px-8 py-12 text-center">
              <Ear className="size-6 text-text-muted" />
              <p className="max-w-sm text-sm text-text-secondary">
                No pairs yet. When the Mac hears one of your words as a different word in Say it, the two show up here to
                practise.
              </p>
              <Button onClick={() => navigate('/wordbook/play/say')}>Go to Say it</Button>
            </Card>
          ) : finished ? (
            <Card className="flex flex-col items-center gap-4 px-8 py-12 text-center">
              <Ear className="size-6 text-text-accent" />
              <p className="font-serif text-xl font-bold text-text-primary">All pairs done.</p>
              <p className="text-sm text-text-secondary">
                You heard {heardRight} of {pairs!.length} right.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate('/wordbook/play')}>
                  Back to Play
                </Button>
                <Button onClick={() => setRound((r) => r + 1)}>Again</Button>
              </div>
            </Card>
          ) : pair ? (
            <Card className="space-y-6 px-8 py-8">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="font-semibold text-text-accent">{picked ? 'Now say your word' : 'Which one did you hear?'}</span>
                <span className="tabular-nums">
                  {index + 1} / {pairs!.length}
                </span>
              </div>

              <div className="flex justify-center">
                <Button variant="secondary" className="gap-1.5" onClick={() => void playAudioUrl(speechUrl(played, 'us'))}>
                  <Volume2 className="size-4" />
                  Play again
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {choices.map((c) => {
                  const state = !picked ? 'idle' : c === played ? 'right' : c === picked ? 'wrong' : 'dim'
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={!!picked}
                      onClick={() => pick(c)}
                      className={cn(
                        'rounded-[6px] border px-4 py-4 font-serif text-2xl font-bold transition-colors',
                        state === 'idle' && 'border-border bg-surface-2 text-text-primary hover:border-border-strong',
                        state === 'right' && 'border-border-success bg-bg-success text-text-success',
                        state === 'wrong' && 'border-border-danger bg-bg-danger text-text-danger',
                        state === 'dim' && 'border-border bg-surface-2 text-text-muted',
                      )}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>

              {picked && (
                <div className="flex justify-center gap-2">
                  {choices.map((c) => (
                    <Button key={c} size="sm" variant="ghost" className="gap-1.5" onClick={() => void playAudioUrl(speechUrl(c, 'us'))}>
                      <Volume2 className="size-3.5" />
                      {c}
                    </Button>
                  ))}
                </div>
              )}

              {picked && (
                <div className="flex flex-col items-center gap-3 border-t border-border pt-5">
                  <p className="text-sm text-text-secondary">
                    Say <b className="font-semibold text-text-primary">{pair.target}</b>, the word you are learning.
                  </p>
                  <MicButton size="lg" state={voice.state} label={`Say ${pair.target}`} onStart={() => void say()} onStop={voice.stop} />
                  {check && voice.state.kind === 'idle' ? (
                    <SayItResult term={pair.target} check={check} />
                  ) : (
                    <ListenHint state={voice.state} idle="Tap the microphone and say it." onOpenSettings={(p) => void practice.openPrivacySettings(p)} />
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button variant={picked ? 'primary' : 'ghost'} className="gap-1.5" onClick={() => setIndex((i) => i + 1)}>
                  {picked ? 'Next' : 'Skip'}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <p className="text-sm text-text-muted">Loading…</p>
          )}
        </div>
      </div>
    </div>
  )
}
