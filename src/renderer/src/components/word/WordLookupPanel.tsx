import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchX, WifiOff } from 'lucide-react'
import { toast } from '@/lib/toast'
import type { Word, MeaningSource, DetailTab } from '@/types/word'
import { Button, ConfirmDialog } from '@/components/ui'
import { WordCard } from '@/components/word/WordCard'
import { useWordNote } from '@/hooks/useWordNote'
import { meaningSourceToDisplay, useSettings } from '@/hooks/useSettings'
import { hasWordAudio, playWordAudio } from '@/lib/audio'
import * as dict from '@/dict'
import type { LocalDictRow } from '@/dict'
import * as lookup from '@/lookup'
import { getSettings } from '@/settings'
import * as wordbook from '@/wordbook'

/**
 * Lookup result panel: given a term, look it up and show one of three states. Shared by
 * the Look up page and the reading page's full-entry popup.
 *
 * Scope: term → result only. Search box, suggestions and history list belong to the
 * caller. Hits are recorded in `lookup_history` here; `onHit` lets the caller refresh.
 *
 * When the term changes, the previous result stays until the new one arrives (no blank
 * flash); the loading placeholder only shows when there has never been a result.
 *
 * Default accent / meaning source come from settings; switching on the card does not
 * write back. Lookups never auto-play audio (only Study does).
 */

type Accent = 'uk' | 'us'

/** Three result states (hit / not found / unavailable). */
type Result =
  | { kind: 'hit'; row: LocalDictRow; word: Word; inLibrary: boolean }
  | { kind: 'not-found'; term: string }
  | { kind: 'unavailable'; term: string }

export interface WordLookupPanelProps {
  /** Term to look up; empty string does nothing. Re-queries on change. */
  term: string
  /** Called on a hit (history is already recorded; lets the caller refresh its list). */
  onHit?: (row: LocalDictRow, word: Word) => void
  /** Extra action shown in the not-found state (e.g. "Translate" on the reading page). */
  notFoundAction?: React.ReactNode
  /** Extra class names for the root. */
  className?: string
}

export function WordLookupPanel({
  term,
  onHit,
  notFoundAction,
  className,
}: WordLookupPanelProps): React.JSX.Element | null {
  const [result, setResult] = useState<Result | null>(null)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)
  const [hasAi, setHasAi] = useState(false)
  const [improving, setImproving] = useState(false)

  useEffect(() => {
    let alive = true
    void dict.hasAiKey().then((v) => {
      if (alive) setHasAi(v)
    })
    return () => {
      alive = false
    }
  }, [])

  // Card view state: meaning source and tab reset per term; accent is kept.
  const [accent, setAccent] = useState<Accent>('us')
  const [source, setSource] = useState<MeaningSource>('simple')
  const [tab, setTab] = useState<DetailTab>('example')

  // Default accent from settings (arrives once after mount); manual switches are not overridden.
  const settings = useSettings()
  useEffect(() => {
    if (settings) setAccent(settings.accent)
  }, [settings])

  // Word note (keyed by dictId, independent of My words).
  const note = useWordNote(result?.kind === 'hit' ? result.row.dictId : null)

  // Race guard: only the latest query wins.
  const seqRef = useRef(0)
  // Keep onHit in a ref: callers usually pass inline arrows, which would otherwise make
  // runLookup change every render and loop the query effect.
  const onHitRef = useRef(onHit)
  useEffect(() => {
    onHitRef.current = onHit
  })

  /** Build the hit state: row → study state (in My words?) → Word view model. */
  const buildHit = async (row: LocalDictRow): Promise<Extract<Result, { kind: 'hit' }>> => {
    const states = await wordbook.getWordStates([row.dictId])
    const brief = states.get(row.dictId) ?? null
    return { kind: 'hit', row, word: wordbook.wordFromDictRow(row, brief), inLibrary: brief != null }
  }

  /**
   * Run a lookup. Hits are recorded in history using the canonical spelling (row.term);
   * not-found / unavailable are not recorded.
   */
  const runLookup = useCallback(
    async (raw: string): Promise<void> => {
      const q = raw.trim()
      if (!q) return
      const seq = ++seqRef.current
      // Read the meaning source from settings on every query (this callback can't see settings
      // state); fetched in parallel with the lookup so it never adds latency.
      const [res, s] = await Promise.all([dict.lookup(q), getSettings()])
      if (seq !== seqRef.current) return // stale response
      setSource(meaningSourceToDisplay(s.meaningSource))
      setTab('example')
      if (res.status === 'hit') {
        const hit = await buildHit(res.row)
        if (seq !== seqRef.current) return
        setResult(hit)
        // Snapshot of the first short meaning for the history list (empty if none).
        await lookup.recordLookup(res.row.term, hit.word.simpleSenses[0] ?? '')
        onHitRef.current?.(res.row, hit.word)
      } else if (res.status === 'not-found') {
        setResult({ kind: 'not-found', term: q })
      } else {
        setResult({ kind: 'unavailable', term: q })
      }
    },
    [],
  )

  useEffect(() => {
    if (!term.trim()) {
      seqRef.current++ // expire in-flight results
      setResult(null)
      return
    }
    void runLookup(term)
  }, [term, runLookup])

  /** Refresh in-library state after add / remove. */
  const refreshHit = async (): Promise<void> => {
    if (result?.kind !== 'hit') return
    const hit = await buildHit(result.row)
    setResult(hit)
  }

  const addWord = async (): Promise<void> => {
    if (result?.kind !== 'hit') return
    await wordbook.addWords([result.row.dictId])
    await refreshHit()
  }

  const removeWord = async (): Promise<void> => {
    if (result?.kind !== 'hit') return
    await wordbook.removeWord(result.row.dictId)
    await refreshHit()
  }

  const improveWithAi = async (): Promise<void> => {
    if (result?.kind !== 'hit' || improving) return
    const term = result.row.term
    setImproving(true)
    try {
      const row = await dict.improveWithAi(term)
      const hit = await buildHit(row)
      setResult(hit)
      toast.success(`Updated “${term}”`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setImproving(false)
    }
  }

  // No result yet = first query in flight: show a placeholder instead of blank.
  if (result == null) return term.trim() ? <Pending className={className} /> : null

  return (
    <>
      {result.kind === 'hit' ? (
        <WordCard
          entry={result.word}
          className={className}
          inflectionSpacing="legacy"
          accent={accent}
          source={source}
          tab={tab}
          onToggleAccent={() => setAccent((a) => (a === 'uk' ? 'us' : 'uk'))}
          onSpeak={(a) => void playWordAudio(result.row, a)}
          hasAudio={hasWordAudio(result.row)}
          audioRow={result.row}
          onChangeSource={setSource}
          onChangeTab={setTab}
          actionBar={{ showNote: true, showLibrary: true }}
          note={note.note}
          onNoteChange={note.update}
          noteMode="dialog"
          onImproveWithAi={hasAi ? () => void improveWithAi() : undefined}
          improvingWithAi={improving}
          inLibrary={result.inLibrary}
          onToggleLibrary={() => {
            if (result.inLibrary) setConfirmRemoveOpen(true)
            else void addWord()
          }}
        />
      ) : result.kind === 'not-found' ? (
        <NotFound term={result.term} action={notFoundAction} className={className} />
      ) : (
        <Unavailable
          term={result.term}
          className={className}
          onRetry={() => void runLookup(result.term)}
        />
      )}

      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title={`Remove “${result.kind === 'hit' ? result.word.word : ''}” from My words?`}
        description="The word and its study progress will be removed from My words and all study / review queues. You can add it again later (starting from scratch)."
        confirmText="Remove"
        confirmVariant="danger"
        onConfirm={() => void removeWord()}
      />
    </>
  )
}

// ─────────────────────────── Loading (first query only) ───────────────────────────

function Pending({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={className}>
      <p className="pt-16 text-center text-sm text-text-muted">Looking up…</p>
    </div>
  )
}

// ─────────────────────────── Not found ───────────────────────────

function NotFound({
  term,
  action,
  className,
}: {
  term: string
  action?: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-3 pt-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-bg-neutral-chip">
          <SearchX className="size-6 text-text-muted" />
        </div>
        <p className="text-base text-text-primary">
          No entry for “<span className="font-semibold">{term}</span>”
        </p>
        {action}
      </div>
    </div>
  )
}

// ─────────────────────────── Unavailable (offline / service error) ───────────────────────────

function Unavailable({
  term,
  onRetry,
  className,
}: {
  term: string
  onRetry: () => void
  className?: string
}): React.JSX.Element {
  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-3 pt-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-bg-neutral-chip">
          <WifiOff className="size-6 text-text-muted" />
        </div>
        <p className="text-base text-text-primary">
          Couldn’t look up “<span className="font-semibold">{term}</span>”. Please try again.
        </p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  )
}
