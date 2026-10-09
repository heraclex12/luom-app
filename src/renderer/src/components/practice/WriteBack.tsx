import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import * as practice from '@/practice'
import { ListenHint, MicButton } from '@/components/speech/MicButton'
import { useListen } from '@/components/speech/useListen'

/**
 * Write back: a situation for your words (a friend's text, an email, a sentence to finish or fix, a Vietnamese line
 * to translate). You reply in your own words; the AI says how natural each word sounds. Conversations go on for a
 * few turns when it fits. When you are done, each word counts as a review (the suggestion is yours to change) and
 * your replies are kept as the word's sentences.
 *
 * Used in the pop quiz card after a round (compact) and on its own page.
 */

const ipcMessage = (e: unknown): string =>
  e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(e)

const VERDICT: Record<practice.Verdict, { label: string; className: string }> = {
  natural: { label: 'Natural', className: 'bg-bg-success-chip text-text-success' },
  understandable: { label: 'Almost', className: 'bg-bg-warning-chip text-text-warning' },
  off: { label: 'Not quite', className: 'bg-bg-danger-chip text-text-danger' },
  missing: { label: 'Not used', className: 'bg-bg-neutral-chip text-text-muted' },
}

const ACTIONS: { id: practice.PracticeAction; label: string }[] = [
  { id: 'good', label: 'Got it' },
  { id: 'hard', label: 'Shaky' },
  { id: 'again', label: 'Again' },
  { id: 'skip', label: 'Don’t count' },
]

type Phase = 'loading' | 'error' | 'writing' | 'checking' | 'review'

export function WriteBack({
  words,
  compact = false,
  initialSituation,
  onDone,
  onClose,
}: {
  words: practice.PracticeWord[]
  /** A situation already being written (the pop quiz starts it early so it is ready when the round ends). */
  initialSituation?: Promise<practice.Situation>
  compact?: boolean
  /** After Done: the reviews are saved (`practised` = reviews that changed the schedule). */
  onDone: (result: { practised: number }) => void
  /** Leave without saving anything (compact card's Not now). */
  onClose?: () => void
}): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')
  const [situation, setSituation] = useState<practice.Situation | null>(null)
  /** Conversation after the opening message: your replies and their follow-ups. */
  const [turns, setTurns] = useState<practice.Turn[]>([])
  const [records, setRecords] = useState<practice.TurnRecord[]>([])
  const [draft, setDraft] = useState('')
  const [actions, setActions] = useState<Record<string, practice.PracticeAction>>({})
  const [saving, setSaving] = useState(false)
  const voice = useListen({ maxMs: 30_000, silenceMs: 2000 })
  const input = useRef<HTMLTextAreaElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const wordsKey = words.map((w) => w.dictId).join(',')
  const early = useRef(initialSituation)

  const load = (): void => {
    setPhase('loading')
    setTurns([])
    setRecords([])
    setDraft('')
    setError('')
    // The early situation once; Try again writes a new one.
    const pending = early.current ?? practice.situationFor(words)
    early.current = undefined
    void pending
      .then((s) => {
        setSituation(s)
        setPhase('writing')
      })
      .catch((e) => {
        setError(ipcMessage(e))
        setPhase('error')
      })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [wordsKey])

  // Keep the newest message in view, and the reply box ready.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    if (phase === 'writing') input.current?.focus()
  }, [phase, turns.length])

  const send = async (): Promise<void> => {
    const reply = draft.trim()
    if (!situation || !reply || phase !== 'writing') return
    const nextTurns: practice.Turn[] = [...turns, { role: 'you', text: reply }]
    setTurns(nextTurns)
    setDraft('')
    setError('')
    setPhase('checking')
    try {
      const feedback = await practice.feedbackFor(situation, nextTurns, records)
      const nextRecords = [...records, { reply, feedback }]
      setRecords(nextRecords)
      if (feedback.followUp) {
        setTurns([...nextTurns, { role: 'them', text: feedback.followUp }])
        setPhase('writing')
      } else {
        setActions(practice.suggestedActions(words, nextRecords))
        setPhase('review')
      }
    } catch (e) {
      // Give the reply back so nothing typed is lost.
      setTurns(turns)
      setDraft(reply)
      setError(ipcMessage(e))
      setPhase('writing')
    }
  }

  const wrapUp = (): void => {
    setActions(practice.suggestedActions(words, records))
    setPhase('review')
  }

  const done = async (): Promise<void> => {
    if (!situation) return
    setSaving(true)
    try {
      onDone({ practised: await practice.finishPractice(words, situation, records, actions) })
    } catch (e) {
      setError(ipcMessage(e))
      setSaving(false)
    }
  }

  const speak = async (): Promise<void> => {
    const heard = await voice.listen()
    if (heard?.text) setDraft((d) => (d.trim() ? `${d.trim()} ${heard.text}` : heard.text))
  }

  const pad = compact ? 'px-4' : 'px-6'
  const exercise = situation && !practice.CONVERSATION_KINDS.has(situation.kind) && situation.kind !== 'email'
  // Feedback belongs right under the reply it is about.
  const feedbackAfter = new Map<number, practice.Feedback>()
  let you = 0
  turns.forEach((t, i) => {
    if (t.role === 'you') {
      const r = records[you++]
      if (r) feedbackAfter.set(i, r.feedback)
    }
  })

  return (
    <div className="flex min-h-0 flex-col">
      {/* Words to use, with the sense to practise */}
      <div className={cn('flex flex-wrap gap-1.5 pb-3', pad)}>
        {words.map((w) => (
          <span key={w.dictId} className="inline-flex items-baseline gap-1.5 rounded-full bg-bg-accent-chip px-2.5 py-0.5 text-xs">
            <b className="font-semibold text-text-accent">{w.term}</b>
            <span className="text-text-secondary">{w.meaning}</span>
          </span>
        ))}
      </div>

      <div data-scroll className={cn('min-h-0 flex-1 overflow-y-auto pb-2', pad)}>
        {phase === 'loading' && <Writing compact={compact} />}

        {phase === 'error' && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-text-danger">{error || 'Could not write a situation.'}</p>
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={load}>
              Try again
            </Button>
          </div>
        )}

        {situation && phase !== 'loading' && phase !== 'error' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-display text-base text-text-primary">{situation.title}</h3>
              {situation.setup && <p className="mt-1 text-sm italic text-text-secondary">{situation.setup}</p>}
            </div>

            {exercise ? (
              <p className={cn('whitespace-pre-wrap rounded-[14px] bg-surface-1 px-4 py-3 font-serif leading-relaxed text-text-primary', compact ? 'text-base' : 'text-lg')}>
                {situation.prompt}
              </p>
            ) : (
              <Bubble who={situation.speaker || 'Them'} text={situation.prompt} />
            )}

            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                {t.role === 'you' ? <Bubble mine text={t.text} /> : <Bubble who={situation.speaker || 'Them'} text={t.text} />}
                {feedbackAfter.has(i) && <FeedbackCard feedback={feedbackAfter.get(i)!} compact={compact} />}
              </div>
            ))}

            {phase === 'checking' && <p className="animate-pulse text-xs text-text-muted">Reading your reply…</p>}

            {phase === 'writing' && turns.length === 0 && <p className="text-sm font-medium text-text-primary">{situation.task}</p>}

            {phase === 'review' && (
              <section className="space-y-2 rounded-[14px] bg-surface-1 p-3">
                <p className="text-sm font-semibold text-text-primary">How did each word go?</p>
                <p className="text-xs text-text-muted">This counts as the word’s review. Change it if it feels wrong.</p>
                {words.map((w) => (
                  <div key={w.dictId} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text-primary">{w.term}</span>
                    <div className="flex gap-1" role="radiogroup" aria-label={`Review for ${w.term}`}>
                      {ACTIONS.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          role="radio"
                          aria-checked={actions[w.term] === a.id}
                          onClick={() => setActions((s) => ({ ...s, [w.term]: a.id }))}
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                            actions[w.term] === a.id
                              ? 'border-border-accent bg-bg-accent-chip font-semibold text-text-accent'
                              : 'border-border text-text-secondary hover:border-border-strong',
                          )}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
            <div ref={end} />
          </div>
        )}
      </div>

      {/* Reply box / finish */}
      {situation && (phase === 'writing' || phase === 'checking') && (
        <div className={cn('space-y-1.5 border-t border-border pb-3 pt-3', pad)}>
          <div className="flex items-end gap-2">
            <Textarea
              ref={input}
              rows={compact ? 2 : 3}
              value={draft}
              disabled={phase === 'checking'}
              placeholder={exercise ? 'Your answer in English…' : 'Your reply in English…'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Not while an input method (Vietnamese Telex, …) is still composing a word.
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && (e.metaKey || !e.shiftKey)) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <div className="flex shrink-0 flex-col gap-1.5">
              <MicButton size="sm" state={voice.state} label="Say your reply" onStart={() => void speak()} onStop={voice.stop} />
              <Button size="iconSm" aria-label="Send" disabled={!draft.trim() || phase === 'checking'} onClick={() => void send()}>
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {error ? (
              <p className="text-xs text-text-danger">{error}</p>
            ) : voice.state.kind !== 'idle' ? (
              <ListenHint state={voice.state} idle="" onOpenSettings={(p) => void practice.openPrivacySettings(p)} />
            ) : (
              <p className="text-xs text-text-muted">Enter to send · Shift+Enter for a new line</p>
            )}
            {records.length > 0 ? (
              <Button size="sm" variant="ghost" disabled={phase === 'checking'} onClick={wrapUp}>
                Finish
              </Button>
            ) : (
              onClose && (
                <Button size="sm" variant="ghost" onClick={onClose}>
                  Not now
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className={cn('flex items-center justify-between gap-2 border-t border-border pb-3 pt-3', pad)}>
          {error ? <p className="text-xs text-text-danger">{error}</p> : <span />}
          <Button size="sm" className="gap-1.5" disabled={saving} onClick={() => void done()}>
            <Check className="size-4" />
            Done
          </Button>
        </div>
      )}
    </div>
  )
}

function Bubble({ who, text, mine = false }: { who?: string; text: string; mine?: boolean }): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-0.5', mine ? 'items-end' : 'items-start')}>
      {!mine && who && <span className="px-1 text-[11px] font-semibold text-text-muted">{who}</span>}
      <p
        className={cn(
          'max-w-[85%] whitespace-pre-wrap rounded-[10px] px-3 py-2 text-sm leading-relaxed',
          mine ? 'rounded-br-[6px] bg-fill-brand text-on-brand' : 'rounded-bl-[6px] border border-border bg-surface-2 text-text-primary',
        )}
      >
        {text}
      </p>
    </div>
  )
}

function FeedbackCard({ feedback, compact }: { feedback: practice.Feedback; compact: boolean }): React.JSX.Element {
  return (
    <section className={cn('anim-pop space-y-2 rounded-[14px] bg-surface-1', compact ? 'p-3' : 'p-4')}>
      {feedback.summary && <p className="text-sm text-text-primary">{feedback.summary}</p>}
      <ul className="space-y-1.5">
        {feedback.words.map((w) => (
          <li key={w.term} className="flex items-start gap-2 text-sm">
            <span className={cn('mt-px shrink-0 rounded-full px-2 py-px text-[11px] font-semibold', VERDICT[w.verdict].className)}>
              {VERDICT[w.verdict].label}
            </span>
            <span className="min-w-0 text-text-secondary">
              <b className="font-semibold text-text-primary">{w.term}</b>
              {w.note ? ` · ${w.note}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {feedback.better && (
        <div className="border-l-2 border-border-accent pl-3">
          <p className="text-[11px] font-semibold text-text-muted">A native speaker might say</p>
          <p className="font-serif text-[15px] leading-relaxed text-text-primary">{feedback.better}</p>
        </div>
      )}
      {feedback.tip && (
        <p className="text-xs leading-relaxed text-text-secondary">
          <b className="font-semibold text-text-primary">Tip</b> · {feedback.tip}
        </p>
      )}
    </section>
  )
}

/** While the AI writes the situation: a little ink pen at work. */
function Writing({ compact }: { compact: boolean }): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-3 text-sm text-text-muted', compact ? 'py-4' : 'py-8')}>
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-pulse rounded-full bg-text-muted" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </span>
      Writing a situation for your words…
    </div>
  )
}
