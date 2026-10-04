import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookPlus, Layers } from 'lucide-react'
import { WordCard } from '@/components/word/WordCard'
import type { DetailTab, MeaningSource } from '@/types/word'
import { Button, Card, ConfirmDialog, Separator } from '@/components/ui'
import { NoteDialog } from '@/components/word/NoteDialog'
import { PracticeTopBar } from './components/PracticeTopBar'
import { RatingBar, type RatingKey } from './components/RatingBar'
import { FinishedView } from './components/FinishedView'
import * as wordbook from '@/wordbook'
import type { ExtraCounts, ExtraKind, QueueKind, StudyCard } from '@/wordbook'
import { getSettings } from '@/settings'
import type { Settings } from '@/settings'
import type { ExtraGroupSizes } from '@/wordbook'
import { hasWordAudio, playWordAudio, resolveShownAccent } from '@/lib/audio'
import { meaningSourceToDisplay } from '@/hooks/useSettings'

/**
 * Study session (startTodaySession / nextCard / rate / master / extraGroup): reveal-style active recall,
 * top bar with remaining counts / note / mark as known, 3-grade rating bar with interval previews,
 * and a "Study more" screen when done. durationMs = shown → rated. Auto-plays audio if enabled.
 * The session is rebuilt when it crosses the 4:00 day rollover (stale).
 */

type Status = 'loading' | 'studying' | 'finished' | 'empty'
type Accent = 'uk' | 'us'

const RATING_VALUE: Record<RatingKey, number> = { again: 1, hard: 2, good: 3 }

interface Current extends StudyCard {
  dictId: number
  /** Queue kind of the current card (underlined in the top bar). */
  kind: QueueKind
  /** When the card was shown (for durationMs). */
  shownAt: number
}

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
      setCurrent({ ...card, dictId: next.dictId, kind: next.cardKind, shownAt: Date.now() })
      setRevealed(false)
      setTab('example')
      setSource(meaningSourceToDisplay(settingsRef.current?.meaningSource))
      setStatus('studying')
      setNote((await wordbook.getNote(next.dictId)) ?? '')
      // Auto-play pronunciation; for words with only one phonetic, play the accent that's shown.
      const s = settingsRef.current
      if (s?.autoPlayAudio) {
        const accent = resolveShownAccent(
          { hasUS: !!card.word.phoneticUS, hasUK: !!card.word.phoneticUK },
          s.accent,
        )
        void playWordAudio(card.dictRow, accent)
      }
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
  async function rate(key: RatingKey): Promise<void> {
    if (!current || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const durationMs = Date.now() - current.shownAt
      await wordbook.rate({
        dictId: current.dictId,
        rating: RATING_VALUE[key],
        durationMs,
        snapshotReps: current.record.reps,
      })
      await advance()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
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

  // Space / Enter reveals the answer.
  useEffect(() => {
    if (status !== 'studying' || revealed) return
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
  }, [status, revealed, reveal, noteOpen, masterOpen])

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

  return (
    <div className="flex h-full flex-col">
      <PracticeTopBar
        counts={progress}
        current={current.kind}
        collectionName={collectionName}
        onNote={() => setNoteOpen(true)}
        onMaster={() => setMasterOpen(true)}
      />

      {/* Card area: click anywhere to reveal. */}
      <div className="relative min-h-0 flex-1 overflow-y-auto" onClick={() => !revealed && reveal()}>
        <div className="mx-auto max-w-2xl px-6 py-6">
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
        </div>
        {!revealed && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center">
            <span className="text-sm text-text-muted">Click the card or press Space to show the answer</span>
          </div>
        )}
      </div>

      {/* Rating bar, shown after reveal; a 10% spacer lifts it off the window bottom. */}
      {revealed && (
        <>
          <RatingBar onRate={(k) => void rate(k)} preview={current.preview} disabled={busy} />
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
