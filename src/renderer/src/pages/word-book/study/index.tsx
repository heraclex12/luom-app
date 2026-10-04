import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookPlus, Layers } from 'lucide-react'
import { WordCard } from '@/components/word/WordCard'
import { cn } from '@/lib/cn'
import type { DetailTab, MeaningSource } from '@/types/word'
import { Button, Card, ConfirmDialog, Separator } from '@/components/ui'
import { NoteDialog } from '@/components/word/NoteDialog'
import { PracticeTopBar } from './components/PracticeTopBar'
import { RatingBar, type RatingKey } from './components/RatingBar'
import { FinishedView } from './components/FinishedView'
import { AnswerFx, type AnswerFxEvent } from './components/AnswerFx'
import { ChoiceExercise } from './exercises/ChoiceExercise'
import { TypeExercise } from './exercises/TypeExercise'
import { ListenExercise } from './exercises/ListenExercise'
import { ClozeExercise } from './exercises/ClozeExercise'
import { nextCombo, pickCloze, resolveExercise, type PickedCloze } from './exercises/logic'
import type { ExerciseAnswer } from './exercises/shared'
import * as wordbook from '@/wordbook'
import type { Choice, ExerciseKind, ExtraCounts, ExtraKind, LearningMode, QueueKind, StudyCard } from '@/wordbook'
import { getSettings } from '@/settings'
import type { Settings } from '@/settings'
import type { ExtraGroupSizes } from '@/wordbook'
import { hasWordAudio, playWordAudio, resolveShownAccent, resolveWordAudioUrl } from '@/lib/audio'
import { meaningSourceToDisplay } from '@/hooks/useSettings'

/**
 * Study session (startTodaySession / nextCard / rate / master / extraGroup): reveal-style active recall,
 * top bar with remaining counts / note / mark as known, 3-grade rating bar with interval previews,
 * and a "Study more" screen when done. durationMs = shown → rated (or answered). Auto-plays audio if enabled.
 * The session is rebuilt when it crosses the 4:00 day rollover (stale).
 *
 * Each card is practised with the exercise picked by the learning mode (exerciseFor): flip (reveal +
 * rating bar) or an auto-graded one — choice / type / listen / cloze — which reveals the card after the
 * answer and rates it with the computed rating on Continue. Exercises that can't be built fall back
 * (resolveExercise). Play mode adds a combo counter + XP float on choice and confetti when finished.
 */

type Status = 'loading' | 'studying' | 'finished' | 'empty'
type Accent = 'uk' | 'us'

const RATING_VALUE: Record<RatingKey, number> = { again: 1, hard: 2, good: 3 }
const RATING_LABEL: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good' }

/** The accent the card shows (words with one phonetic pin to it) — also what auto-play speaks. */
function shownAccentOf(card: Pick<StudyCard, 'word'>, preferred: Accent): Accent {
  return resolveShownAccent({ hasUS: !!card.word.phoneticUS, hasUK: !!card.word.phoneticUK }, preferred)
}

interface Current extends StudyCard {
  dictId: number
  /** Queue kind of the current card (underlined in the top bar). */
  kind: QueueKind
  /** When the card was shown (for durationMs). */
  shownAt: number
  /** How this card is practised. */
  exercise: ExerciseKind
  /** Options for 'choice'. */
  choices: Choice[]
  /** Sentence for 'cloze'. */
  cloze: PickedCloze | null
}

/** Distractor pool size for multiple choice (random sample of My words, loaded once per session). */
const QUIZ_POOL_SIZE = 60

export default function WordStudy(): React.JSX.Element {
  const navigate = useNavigate()
  // Optional scope: #/wordbook/study?collection=ID studies only that collection's words.
  const [params] = useSearchParams()
  const collectionId = Number(params.get('collection')) || undefined
  const [collectionName, setCollectionName] = useState<string | null>(null)
  useEffect(() => {
    if (collectionId == null) return setCollectionName(null)
    void wordbook.listCollections().then((all) => setCollectionName(all.find((c) => c.collectionId === collectionId)?.name ?? null))
  }, [collectionId])
  const [status, setStatus] = useState<Status>('loading')
  const [current, setCurrent] = useState<Current | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [tab, setTab] = useState<DetailTab>('example')
  const [accent, setAccent] = useState<Accent>('us')
  const [source, setSource] = useState<MeaningSource>('simple')

  // Top bar "remaining today" counts, derived from the session queue before each card.
  const [progress, setProgress] = useState({ new: 0, learning: 0, review: 0 })

  const [finishData, setFinishData] = useState<{ counts: ExtraCounts; sizes: ExtraGroupSizes } | null>(null)

  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [masterOpen, setMasterOpen] = useState(false)
  // In-flight lock: prevents double-clicks from skipping cards. Ref blocks sync re-entry; state disables buttons.
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const settingsRef = useRef<Settings | null>(null)
  const [mode, setMode] = useState<LearningMode>('standard')
  // Cards shown so far (rotates Focus exercises).
  const seqRef = useRef(0)
  // Distractor meanings for multiple choice; null = not loaded yet.
  const poolRef = useRef<{ dictId: number; term: string; meaning: string }[] | null>(null)
  // Auto-graded answer awaiting Continue (rating + time to answer).
  const [answer, setAnswer] = useState<{ rating: number; durationMs: number } | null>(null)
  // Play mode: consecutive correct choices.
  const [combo, setCombo] = useState(0)
  // Right / wrong answer effect (leaves + check, or a shake).
  const [fx, setFx] = useState<AnswerFxEvent | null>(null)

  // Load the next card: rebuild if stale, finish if done, skip missing cards (loop, no recursion).
  const advance = useCallback(async (): Promise<void> => {
    for (;;) {
      // Refresh counts before each card so the top bar matches the card on screen.
      setProgress(wordbook.sessionCounts())
      const next = wordbook.nextCard()
      if (next.kind === 'stale') {
        await wordbook.startTodaySession(collectionId)
        continue
      }
      if (next.kind === 'done') {
        const [counts, sizes, seg] = await Promise.all([
          wordbook.extraCounts(),
          wordbook.getGroupSizes(),
          wordbook.segmentCounts(collectionId),
        ])
        setCurrent(null)
        // Nothing left to learn or review → prompt to add words; otherwise show "Study more".
        if (seg.new === 0 && counts.learn === 0 && counts.review === 0 && counts.ahead === 0) {
          setStatus('empty')
        } else {
          setFinishData({ counts, sizes })
          setStatus('finished')
        }
        return
      }
      const card = await wordbook.loadStudyCard(next.dictId)
      if (!card) {
        // Missing/deleted → drop from the session, otherwise nextCard would keep returning it.
        wordbook.skipCard(next.dictId)
        continue
      }
      const s = settingsRef.current
      const learningMode = s?.learningMode ?? 'standard'
      const planned = wordbook.exerciseFor(
        learningMode,
        { kind: next.cardKind, reps: card.record.reps, hasExample: card.word.examples.length > 0 },
        seqRef.current++,
      )
      const meaning = card.word.simpleSenses[0] ?? ''
      let choices: Choice[] = []
      if (planned === 'choice' && meaning) {
        if (poolRef.current == null) poolRef.current = await wordbook.quizPool(QUIZ_POOL_SIZE)
        choices = wordbook.buildChoices({ dictId: next.dictId, meaning }, poolRef.current, 4)
      }
      const cloze = planned === 'cloze' ? pickCloze(card.word.examples, card.word.word) : null
      const exercise = resolveExercise(planned, {
        distractors: Math.max(0, choices.length - 1),
        hasCloze: cloze != null,
        hasMeaning: !!meaning,
        hasAudio: hasWordAudio(card.dictRow),
      })
      setCurrent({ ...card, dictId: next.dictId, kind: next.cardKind, shownAt: Date.now(), exercise, choices, cloze })
      setAnswer(null)
      // A shake belongs to the old card; a leaf burst may finish over the next one.
      setFx((f) => (f?.kind === 'wrong' ? null : f))
      setRevealed(false)
      setTab('example')
      setSource(meaningSourceToDisplay(settingsRef.current?.meaningSource))
      setStatus('studying')
      setNote((await wordbook.getNote(next.dictId)) ?? '')
      // Auto-play pronunciation; for words with only one phonetic, play the accent that's shown.
      // Listen always plays (it's the prompt); type / cloze never do (the audio would give the answer away).
      const autoPlay = exercise === 'listen' || (s?.autoPlayAudio && (exercise === 'flip' || exercise === 'choice'))
      if (autoPlay) void playWordAudio(card.dictRow, shownAccentOf(card, s?.accent ?? 'us'))
      return
    }
  }, [collectionId])

  // On enter: load settings → start today's session → show the first card.
  useEffect(() => {
    let alive = true
    void (async () => {
      const s = await getSettings()
      if (!alive) return
      settingsRef.current = s
      setAccent(s.accent)
      setMode(s.learningMode)
      await wordbook.startTodaySession(collectionId)
      if (!alive) return
      await advance()
    })()
    return () => {
      alive = false
    }
  }, [advance, collectionId])

  const reveal = useCallback(() => setRevealed(true), [])

  /** Rate the card, then advance. Guarded by the in-flight lock. */
  async function rate(rating: number, durationMs: number): Promise<void> {
    if (!current || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await wordbook.rate({
        dictId: current.dictId,
        rating,
        durationMs,
        snapshotReps: current.record.reps,
      })
      await advance()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  /** An auto-graded exercise was answered: keep the rating for Continue, reveal the card. */
  const onAnswer = useCallback(
    (a: ExerciseAnswer) => {
      if (!current) return
      setAnswer({ rating: a.rating, durationMs: Date.now() - current.shownAt })
      setFx({ id: Date.now(), kind: a.correct ? 'right' : 'wrong' })
      setRevealed(true)
      if (a.typed && a.correct) void wordbook.recordTypedCorrect()
      if (current.exercise === 'choice' && mode === 'play') setCombo((c) => nextCombo(c, a.correct))
      // After a typed answer, say the word (reinforces the spelling ↔ sound link).
      if (a.typed && current.exercise !== 'listen' && settingsRef.current?.autoPlayAudio)
        void playWordAudio(current.dictRow, shownAccentOf(current, accent))
    },
    [current, mode, accent],
  )

  function continueAfterAnswer(): void {
    if (answer) void rate(answer.rating, answer.durationMs)
  }

  /** Mark as known (after confirmation): removes the card from the session, then advance. */
  async function doMaster(): Promise<void> {
    if (!current || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setMasterOpen(false)
    try {
      await wordbook.master(current.dictId)
      await advance()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  /** Save note: setNote if non-empty, otherwise clearNote. */
  async function saveNote(text: string): Promise<void> {
    if (!current) return
    const t = text.trim()
    await (t ? wordbook.setNote(current.dictId, t) : wordbook.clearNote(current.dictId))
    setNote(t)
    setNoteOpen(false)
  }

  /** Study more: append an extra group to the session and resume if anything was added. */
  async function startExtra(kind: ExtraKind, size: number): Promise<void> {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const added = await wordbook.extraGroup(kind, size)
      if (added > 0) {
        setStatus('loading')
        await advance()
      }
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  /** Persist group size (used as the default next time). */
  function changeSize(kind: ExtraKind, size: number): void {
    setFinishData((prev) => {
      if (!prev) return prev
      const sizes = { ...prev.sizes, [kind]: size }
      void wordbook.setGroupSizes(sizes)
      return { ...prev, sizes }
    })
  }

  // Space / Enter reveals the answer (flip cards).
  useEffect(() => {
    if (status !== 'studying' || revealed || current?.exercise !== 'flip') return
    function onKeyDown(e: KeyboardEvent): void {
      // Guard 1: ignore while a dialog (note / mark as known) is open — keys still bubble to window.
      if (noteOpen || masterOpen) return
      // Guard 2: ignore while focus is in a text field.
      const el = document.activeElement
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        reveal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [status, revealed, reveal, noteOpen, masterOpen, current?.exercise])

  // Enter / Space → Continue after an auto-graded answer (the answer field is blurred on submit).
  // Re-registered every render so it always calls the current continueAfterAnswer.
  useEffect(() => {
    if (status !== 'studying' || !answer) return
    function onKeyDown(e: KeyboardEvent): void {
      if (noteOpen || masterOpen) return
      const el = document.activeElement
      if (el instanceof HTMLElement && (el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (el instanceof HTMLInputElement && !el.readOnly) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        continueAfterAnswer()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (status === 'loading') {
    return <div className="grid h-full place-items-center text-sm text-text-muted">Loading…</div>
  }

  if (status === 'empty') {
    return (
      <div className="grid h-full place-items-center px-6">
        <Card className="flex max-w-md flex-col items-center gap-3 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-card bg-bg-neutral text-text-primary">
            <Layers className="size-7" />
          </span>
          <h3 className="text-xl font-medium text-text-primary">No new words to study</h3>
          <Button variant="brand" size="lg" className="mt-1 gap-2" onClick={() => navigate('/wordbook/books')}>
            <BookPlus />
            Add from word lists
          </Button>
        </Card>
      </div>
    )
  }

  if (status === 'finished' && finishData) {
    return (
      <FinishedView
        celebrate={mode === 'play'}
        counts={finishData.counts}
        sizes={finishData.sizes}
        onSizeChange={changeSize}
        onStart={(kind, size) => void startExtra(kind, size)}
      />
    )
  }

  if (!current) {
    return <div className="grid h-full place-items-center text-sm text-text-muted">Loading…</div>
  }

  const trimmedNote = note.trim()
  const isFlip = current.exercise === 'flip'
  const shownAccent = shownAccentOf(current, accent)
  const speak = (): void => void playWordAudio(current.dictRow, shownAccent)
  const audioUrl = hasWordAudio(current.dictRow) ? resolveWordAudioUrl(current.dictRow, shownAccent) : null
  const keysEnabled = !noteOpen && !masterOpen && !busy
  const exerciseKey = `${current.dictId}:${current.shownAt}`
  const meaningPhonetic = (shownAccent === 'uk' ? current.word.phoneticUK : current.word.phoneticUS) || current.word.phoneticUS || current.word.phoneticUK

  return (
    <div className="flex h-full flex-col">
      <PracticeTopBar
        counts={progress}
        current={current.kind}
        collectionName={collectionName}
        mode={mode}
        onNote={() => setNoteOpen(true)}
        onMaster={() => setMasterOpen(true)}
      />

      {/* Card area: flip cards reveal on click anywhere; exercises show the prompt, then the card after answering. */}
      <div
        className="relative min-h-0 flex-1 overflow-y-auto"
        onClick={() => isFlip && !revealed && reveal()}
      >
        <AnswerFx fx={fx} />
        <div className={cn('mx-auto flex max-w-2xl flex-col gap-6 px-6 py-6', fx?.kind === 'wrong' && 'envi-shake')}>
          {current.exercise === 'choice' && (
            <ChoiceExercise
              key={exerciseKey}
              headword={current.word.word}
              phonetic={meaningPhonetic}
              choices={current.choices}
              shownAt={current.shownAt}
              onAnswer={onAnswer}
              onSpeak={speak}
              audioUrl={audioUrl}
              keysEnabled={keysEnabled}
              play={mode === 'play' ? { combo } : undefined}
            />
          )}
          {current.exercise === 'type' && (
            <TypeExercise
              key={exerciseKey}
              senses={current.word.simpleSenses}
              hint={current.word.examples[0]?.translation || undefined}
              target={current.word.word}
              onAnswer={onAnswer}
            />
          )}
          {current.exercise === 'listen' && (
            <ListenExercise
              key={exerciseKey}
              target={current.word.word}
              audioUrl={audioUrl}
              onPlay={speak}
              onAnswer={onAnswer}
            />
          )}
          {current.exercise === 'cloze' && current.cloze && (
            <ClozeExercise key={exerciseKey} cloze={current.cloze} onAnswer={onAnswer} />
          )}
          {(isFlip || answer) && (
            <WordCard
              dictId={current.dictId}
              entry={current.word}
              inflectionSpacing="legacy"
              revealed={revealed}
              onReveal={reveal}
              stopClickPropagation
              accent={accent}
              source={source}
              tab={tab}
              onToggleAccent={() => setAccent((a) => (a === 'uk' ? 'us' : 'uk'))}
              onSpeak={(a) => void playWordAudio(current.dictRow, a)}
              hasAudio={hasWordAudio(current.dictRow)}
              audioRow={current.dictRow}
              onChangeSource={setSource}
              onChangeTab={setTab}
              noteSlot={
                trimmedNote ? (
                  <>
                    <Separator className="bg-border-200" />
                    <section className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-text-muted">My note</span>
                      <p className="text-sm leading-relaxed text-text-primary">{trimmedNote}</p>
                    </section>
                  </>
                ) : undefined
              }
            />
          )}
        </div>
        {isFlip && !revealed && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center">
            <span className="text-sm text-text-muted">Click the card or press Space to show the answer</span>
          </div>
        )}
      </div>

      {/* Flip: rating bar after reveal. Exercises: Continue after answering (rated automatically).
          A 10% spacer lifts it off the window bottom. */}
      {isFlip && revealed && (
        <>
          <RatingBar
            onRate={(k) => {
              // Knew it (Good / Easy): the same little leaf burst as a right answer.
              if (RATING_VALUE[k] >= 3) setFx({ id: Date.now(), kind: 'right' })
              void rate(RATING_VALUE[k], Date.now() - current.shownAt)
            }}
            preview={current.preview}
            disabled={busy}
          />
          <div aria-hidden className="h-[10%] shrink-0" />
        </>
      )}
      {!isFlip && answer && (
        <>
          <div className="shrink-0 bg-bg-100">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-4">
              <span className="text-xs text-text-muted">
                Rated <span className="font-semibold text-text-secondary">{RATING_LABEL[answer.rating] ?? ''}</span>{' '}
                · press Enter
              </span>
              <Button variant="primary" size="lg" disabled={busy} onClick={continueAfterAnswer}>
                Continue
              </Button>
            </div>
          </div>
          <div aria-hidden className="h-[10%] shrink-0" />
        </>
      )}

      <NoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        word={current.word.word}
        initial={note}
        onSave={(t) => void saveNote(t)}
      />
      <ConfirmDialog
        open={masterOpen}
        onOpenChange={setMasterOpen}
        title={`Mark "${current.word.word}" as known?`}
        description="It won't appear in Study or Review anymore. You can unmark it later under Mastered."
        confirmText="Mark as known"
        confirmVariant="primary"
        onConfirm={() => void doMaster()}
      />
    </div>
  )
}
