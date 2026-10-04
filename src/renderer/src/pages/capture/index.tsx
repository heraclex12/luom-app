import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, Loader2, SearchX, Sparkles, Trash2, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { Highlighted } from '@/components/word/Highlighted'
import { SpeakerIcon } from '@/components/common/SpeakerIcon'
import { playAudioUrl } from '@/lib/audio'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'
import { appBridge } from '@/platform'
import { notifyWordsChanged } from '@/app'
import { getSettings } from '@/settings'
import * as dict from '@/dict'
import * as lookup from '@/lookup'
import * as wordbook from '@/wordbook'
import type { Word } from '@/types/word'
import { runCapture, type CaptureOutcome } from './captureFlow'

/**
 * Quick-capture popup (its own small always-on-top window, opened by the global hotkey).
 * Select a word anywhere → hotkey → this looks it up, saves it to My words, and shows the essentials:
 * pronunciation, Vietnamese meanings and a couple of bilingual examples. Esc / clicking away closes it.
 */

type View = { phase: 'loading' } | { phase: 'done'; outcome: CaptureOutcome; word?: Word }

const initialTerm = (): string => {
  const query = window.location.hash.split('?')[1] ?? ''
  return new URLSearchParams(query).get('term') ?? ''
}

export default function CapturePage(): React.JSX.Element {
  const [term, setTerm] = useState(initialTerm)
  const [input, setInput] = useState(initialTerm)
  const [view, setView] = useState<View>({ phase: 'done', outcome: { kind: 'idle' } })
  const [accent, setAccent] = useState<'us' | 'uk'>('us')
  const [hasKey, setHasKey] = useState(false)
  const [improving, setImproving] = useState(false)
  const [removed, setRemoved] = useState(false)
  const seq = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = (): void => void appBridge.hideCapture()

  const run = useCallback(async (raw: string) => {
    const mine = ++seq.current
    setRemoved(false)
    if (!raw.trim()) {
      setView({ phase: 'done', outcome: { kind: 'idle' } })
      inputRef.current?.focus()
      return
    }
    setView({ phase: 'loading' })
    const settings = await getSettings()
    setAccent(settings.accent)
    const outcome = await runCapture(raw, {
      lookup: dict.lookup,
      getState: async (id) => (await wordbook.getWordStates([id])).get(id) ?? null,
      addWord: (id) => wordbook.addWords([id]),
      recordHistory: (row) => lookup.recordLookup(row.term, wordbook.firstMeaning(row.entry)),
    })
    if (mine !== seq.current) return
    if (outcome.kind === 'hit') {
      if (outcome.saved === 'added') notifyWordsChanged()
      const word = wordbook.wordFromDictRow(outcome.row, null)
      setView({ phase: 'done', outcome, word })
      // Hearing the word right away helps memory; the URL is cached after the first play.
      const url = settings.accent === 'uk' ? outcome.row.ukAudioUrl : outcome.row.usAudioUrl
      if (url && settings.autoPlayAudio) void playAudioUrl(url)
    } else {
      setView({ phase: 'done', outcome })
    }
  }, [])

  // First term from the URL, then new terms pushed by main when the popup is reused.
  useEffect(() => {
    void run(term)
  }, [term, run])
  useEffect(
    () =>
      appBridge.onCaptureTerm((t) => {
        setInput(t)
        setTerm(t)
        if (t === term) void run(t) // same word again: re-run
      }),
    [run, term],
  )
  useEffect(() => {
    // The popup window is transparent; let the rounded card float on the desktop.
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    void dict.hasAiKey().then(setHasKey)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const outcome = view.phase === 'done' ? view.outcome : null
  const hit = outcome?.kind === 'hit' ? outcome : null
  const word = view.phase === 'done' ? view.word : undefined

  const removeWord = async (): Promise<void> => {
    if (!hit) return
    await wordbook.removeWord(hit.row.dictId)
    setRemoved(true)
    notifyWordsChanged()
  }
  const addBack = async (): Promise<void> => {
    if (!hit) return
    await wordbook.addWords([hit.row.dictId])
    setRemoved(false)
    notifyWordsChanged()
  }
  const improve = async (): Promise<void> => {
    if (!hit) return
    setImproving(true)
    try {
      const row = await dict.improveWithAi(hit.row.term)
      setView({ phase: 'done', outcome: { ...hit, row }, word: wordbook.wordFromDictRow(row, null) })
      notifyWordsChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setImproving(false)
    }
  }

  const audioUrl = hit ? (accent === 'uk' ? hit.row.ukAudioUrl : hit.row.usAudioUrl) : null
  const phonetic = word ? (accent === 'uk' ? word.phoneticUK || word.phoneticUS : word.phoneticUS || word.phoneticUK) : ''

  return (
    <div className="h-screen w-screen p-2">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-200 bg-surface-popover shadow-popover">
        {/* Header: draggable, with the editable term. */}
        <div className="flex items-center gap-2 border-b border-border-200 px-3 py-2.5 [-webkit-app-region:drag]">
          <form
            className="flex-1 [-webkit-app-region:no-drag]"
            onSubmit={(e) => {
              e.preventDefault()
              setTerm(input)
              if (input === term) void run(input)
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type an English word…"
              autoFocus={!input}
              spellCheck={false}
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </form>
          <Button variant="ghost" size="iconXs" aria-label="Close" className="[-webkit-app-region:no-drag]" onClick={close}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
          {view.phase === 'loading' && (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-text-muted">
              <Loader2 className="size-4 animate-spin" /> Looking up…
            </div>
          )}
          {outcome?.kind === 'idle' && (
            <p className="pt-8 text-center text-sm text-text-muted">
              Type a word and press Enter.
              <br />
              Tip: select a word in any app and press your capture hotkey.
            </p>
          )}
          {outcome?.kind === 'not-found' && (
            <div className="flex flex-col items-center gap-2 pt-8 text-center text-sm text-text-muted">
              <SearchX className="size-6" />
              No dictionary entry for “{outcome.term}”.
            </div>
          )}
          {outcome?.kind === 'unavailable' && (
            <div className="flex flex-col items-center gap-2 pt-8 text-center text-sm text-text-muted">
              <WifiOff className="size-6" />
              You seem to be offline. Try again when connected.
            </div>
          )}

          {hit && word && (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="break-words font-serif text-2xl font-semibold text-text-primary">{word.word}</h1>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                    <button
                      type="button"
                      onClick={() => setAccent((a) => (a === 'us' ? 'uk' : 'us'))}
                      className="rounded-full border border-border-200 px-1.5 text-[11px] font-semibold uppercase text-text-muted"
                      title="Switch accent"
                    >
                      {accent}
                    </button>
                    {phonetic && <span className="font-mono">{phonetic}</span>}
                    {audioUrl && (
                      <Button variant="ghost" size="iconXs" aria-label="Play pronunciation" onClick={() => void playAudioUrl(audioUrl)}>
                        <SpeakerIcon url={audioUrl} className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <SavedBadge saved={removed ? 'removed' : hit.saved} />
              </div>

              {word.simpleSenses.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {word.simpleSenses.slice(0, 4).map((s, i) => (
                    <p key={i} className="text-[15px] text-text-primary">
                      {s}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No Vietnamese meaning yet.</p>
              )}

              {word.examples.length > 0 && (
                <div className="flex flex-col gap-2.5 border-t border-border-200 pt-3">
                  {word.examples.slice(0, 3).map((ex, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Highlighted text={ex.english} className="text-sm leading-relaxed text-text-primary" />
                        {ex.translation && <span className="text-[13px] leading-relaxed text-text-secondary">{ex.translation}</span>}
                      </div>
                      {ex.audioUrl && (
                        <Button variant="ghost" size="iconXs" aria-label="Read example" onClick={() => void playAudioUrl(ex.audioUrl!)}>
                          <SpeakerIcon url={ex.audioUrl} className="size-3.5 text-text-muted" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {hit && (
          <div className="flex items-center gap-2 border-t border-border-200 px-3 py-2">
            {removed ? (
              <Button variant="secondary" size="sm" onClick={() => void addBack()}>
                Save again
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => void removeWord()}>
                <Trash2 className="size-3.5" /> Remove
              </Button>
            )}
            {hasKey && (
              <Button variant="ghost" size="sm" loading={improving} onClick={() => void improve()}>
                <Sparkles className="size-3.5" /> Improve with AI
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void appBridge.show(`/lookup?q=${encodeURIComponent(hit.row.term)}`)
                close()
              }}
            >
              <ExternalLink className="size-3.5" /> Details
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function SavedBadge({ saved }: { saved: 'added' | 'existing' | 'removed' }): React.JSX.Element {
  const label = saved === 'added' ? 'Saved' : saved === 'existing' ? 'In my words' : 'Removed'
  return (
    <span
      className={cn(
        'mt-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        saved === 'removed' ? 'bg-bg-neutral text-text-muted' : 'bg-bg-success text-text-success',
      )}
    >
      {saved !== 'removed' && <Check className="size-3" strokeWidth={3} />}
      {label}
    </span>
  )
}
