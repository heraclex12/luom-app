import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Mic, Volume2 } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button, Card } from '@/components/ui'
import { playAudioUrl } from '@/lib/audio'
import { ListenHint, MicButton } from '@/components/speech/MicButton'
import { SayItResult } from '@/components/speech/SayItResult'
import { ShadowLine, shadowSummary } from '@/components/speech/ShadowLine'
import { useListen } from '@/components/speech/useListen'
import * as practice from '@/practice'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../../shared/speech'

/**
 * Say it: say each of your words, then shadow a short example sentence (listen, then read it aloud). The Mac's
 * on-device speech recognition shows whether the word came across as that word, and which words of the sentence
 * came through. Pronunciation practice never changes the review schedule.
 */

const WORDS = 6
const SENTENCES = 3
const MAX_SENTENCE_WORDS = 14

type Step =
  | { kind: 'word'; word: wordbook.ActivityWord }
  | { kind: 'sentence'; word: wordbook.ActivityWord; sentence: string }

function buildSteps(words: wordbook.ActivityWord[]): Step[] {
  let sentences = 0
  return words.flatMap((word): Step[] => {
    const ex = word.examples.map((e) => e.sentence.replace(/<[^>]*>/g, '').trim()).find((s) => s && s.split(/\s+/).length <= MAX_SENTENCE_WORDS)
    if (ex && sentences < SENTENCES) {
      sentences++
      return [{ kind: 'word', word }, { kind: 'sentence', word, sentence: ex }]
    }
    return [{ kind: 'word', word }]
  })
}

export default function SayItPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [round, setRound] = useState(0)
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [index, setIndex] = useState(0)
  const [wordResult, setWordResult] = useState<practice.WordCheck | null>(null)
  const [shadow, setShadow] = useState<{ tokens: practice.ShadowToken[]; score: number } | null>(null)
  const [results, setResults] = useState<{ clear: number; words: number; scores: number[] }>({ clear: 0, words: 0, scores: [] })
  const step = steps?.[index] ?? null
  const voice = useListen(step?.kind === 'sentence' ? { maxMs: 15_000, silenceMs: 1500 } : { maxMs: 6000, silenceMs: 900 })

  useEffect(() => {
    let alive = true
    setSteps(null)
    setIndex(0)
    setResults({ clear: 0, words: 0, scores: [] })
    void wordbook.activityRound(WORDS).then((w) => alive && setSteps(buildSteps(w)))
    return () => {
      alive = false
    }
  }, [round])

  useEffect(() => {
    setWordResult(null)
    setShadow(null)
    voice.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, round])

  const listenUrl = useMemo(() => (step ? speechUrl(step.kind === 'word' ? step.word.term : step.sentence, 'us') : ''), [step])

  const tryIt = async (): Promise<void> => {
    if (!step) return
    setWordResult(null)
    setShadow(null)
    const heard = await voice.listen()
    if (!heard) return
    if (step.kind === 'word') {
      const check = await practice.checkSpokenWord(step.word, heard)
      setWordResult(check)
    } else {
      setShadow(practice.alignSentence(step.sentence, heard.text))
    }
  }

  const next = (): void => {
    if (step?.kind === 'word' && wordResult)
      setResults((r) => ({
        ...r,
        words: r.words + 1,
        clear: r.clear + (wordResult.ok && (wordResult.confidence ?? 1) >= practice.CLEAR_CONFIDENCE ? 1 : 0),
      }))
    if (step?.kind === 'sentence' && shadow) setResults((r) => ({ ...r, scores: [...r.scores, shadow.score] }))
    setIndex((i) => i + 1)
  }

  const finished = steps !== null && index >= steps.length
  const avg = results.scores.length ? Math.round((results.scores.reduce((a, b) => a + b, 0) / results.scores.length) * 100) : null

  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['Play', 'Say it']} backTo="/wordbook/play" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-8 pb-16 pt-8 lg:px-10">
          <header className="mb-6 space-y-1.5">
            <h1 className="font-serif text-3xl font-bold text-text-primary">Say it</h1>
            <p className="text-sm text-text-secondary">
              Say your words and read short sentences aloud, then see what came across. Nothing leaves this Mac.
            </p>
          </header>

          {steps !== null && steps.length === 0 ? (
            <Card className="px-8 py-12 text-center text-sm text-text-secondary">Add a few words to My words first.</Card>
          ) : finished ? (
            <Card className="flex flex-col items-center gap-4 px-8 py-12 text-center">
              <Mic className="size-6 text-text-accent" />
              <p className="font-serif text-xl font-bold text-text-primary">Round done.</p>
              <p className="text-sm text-text-secondary">
                {results.clear} of {results.words} words came through clearly
                {avg !== null ? `, and ${avg}% of the sentence words` : ''}.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate('/wordbook/play/pairs')}>
                  Misheard pairs
                </Button>
                <Button onClick={() => setRound((r) => r + 1)}>Another round</Button>
              </div>
            </Card>
          ) : step ? (
            <Card className="space-y-6 px-8 py-8">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="font-semibold text-text-accent">{step.kind === 'word' ? 'Say the word' : 'Shadow the sentence'}</span>
                <span className="tabular-nums">
                  {index + 1} / {steps!.length}
                </span>
              </div>

              {step.kind === 'word' ? (
                <div className="space-y-1 text-center">
                  <p className="font-serif text-5xl font-bold text-text-primary">{step.word.term}</p>
                  {step.word.phonetic && <p className="text-base text-text-secondary">/{step.word.phonetic}/</p>}
                  <p className="text-sm text-text-muted">{step.word.meaning}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-text-muted">Listen first, then read it aloud at the same pace.</p>
                  <p className="font-serif text-2xl leading-relaxed text-text-primary">
                    {shadow ? <ShadowLine tokens={shadow.tokens} /> : step.sentence}
                  </p>
                </div>
              )}

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-4">
                  <Button variant="secondary" size="icon" aria-label="Listen" onClick={() => void playAudioUrl(listenUrl)}>
                    <Volume2 className="size-5" />
                  </Button>
                  <MicButton size="lg" state={voice.state} onStart={() => void tryIt()} onStop={voice.stop} />
                </div>
                {step.kind === 'word' && wordResult && voice.state.kind === 'idle' ? (
                  <SayItResult term={step.word.term} check={wordResult} />
                ) : step.kind === 'sentence' && shadow && voice.state.kind === 'idle' ? (
                  <p className="text-sm font-medium text-text-secondary">{shadowSummary(shadow.tokens)}</p>
                ) : (
                  <ListenHint
                    state={voice.state}
                    idle={step.kind === 'word' ? 'Tap the microphone and say the word.' : 'Tap the microphone and read the sentence.'}
                    onOpenSettings={(p) => void practice.openPrivacySettings(p)}
                  />
                )}
              </div>

              <div className="flex justify-end">
                <Button variant={wordResult || shadow ? 'primary' : 'ghost'} className="gap-1.5" onClick={next}>
                  {wordResult || shadow ? 'Next' : 'Skip'}
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
