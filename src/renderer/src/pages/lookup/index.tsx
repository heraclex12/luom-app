import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui'
import { WordLookupPanel } from '@/components/word/WordLookupPanel'
import { TopBar } from '@/components/layout/TopBar'
import { useAsyncData } from '@/hooks/useAsyncData'
import { suggestBridge } from '@/platform'
import * as lookup from '@/lookup'
import type { LookupHistoryRow } from '@/lookup'

/**
 * Look up page: search-as-you-type suggestions + Enter to look up + local lookup history
 * (lookup_history; only hits are recorded, using the canonical spelling).
 *
 * This page only owns the search box, suggestions and history. Everything from term to result
 * (states, word card, audio, notes, add / remove) is the shared `WordLookupPanel`, also used by
 * the reading page's full-entry popup. The panel records history; this page refreshes the list on hit.
 */

/** Suggestion debounce window. */
const SUGGEST_DEBOUNCE_MS = 250

// ─────────────────────────── Root ───────────────────────────

export default function WordLookup(): React.JSX.Element {
  const [query, setQuery] = useState('')
  // Submitted query (empty = nothing looked up yet, show history). The panel fetches the result.
  const [submittedTerm, setSubmittedTerm] = useState('')

  // Deep link (#/lookup?q=word) from the capture popup's "Details" or a notification.
  const [params] = useSearchParams()
  const linkedTerm = params.get('q') ?? ''
  useEffect(() => {
    if (linkedTerm) {
      setQuery(linkedTerm)
      setSubmittedTerm(linkedTerm)
    }
  }, [linkedTerm])

  // Lookup history (newest first, with a meaning snapshot); reloaded via the panel's onHit.
  const history = useAsyncData(() => lookup.listHistory(), [])
  const historyRows = history.data ?? []

  // Suggestions: debounced + sequence guard (only the latest request counts; failures are silent).
  const [suggestions, setSuggestions] = useState<SuggestEntry[]>([])
  const suggestTimer = useRef<number | null>(null)
  const suggestSeq = useRef(0)

  useEffect(
    () => () => {
      if (suggestTimer.current != null) window.clearTimeout(suggestTimer.current)
    },
    [],
  )

  /** Close suggestions and expire in-flight responses. */
  function closeSuggest(): void {
    if (suggestTimer.current != null) window.clearTimeout(suggestTimer.current)
    suggestSeq.current++
    setSuggestions([])
  }

  /** Input change: debounce then query suggestions; empty input clears them; failures clear silently. */
  function handleQueryChange(text: string): void {
    setQuery(text)
    if (suggestTimer.current != null) window.clearTimeout(suggestTimer.current)
    const q = text.trim()
    if (!q) {
      suggestSeq.current++
      setSuggestions([])
      return
    }
    suggestTimer.current = window.setTimeout(() => {
      const seq = ++suggestSeq.current
      suggestBridge.query(q).then(
        (entries) => {
          if (seq === suggestSeq.current) setSuggestions(entries)
        },
        () => {
          if (seq === suggestSeq.current) setSuggestions([])
        },
      )
    }, SUGGEST_DEBOUNCE_MS)
  }

  /** Submit: normalise input and hand it to the panel. */
  function runSearch(raw: string): void {
    const term = raw.trim()
    if (!term) return
    setQuery(term)
    closeSuggest()
    setSubmittedTerm(term)
  }

  function clearInput(): void {
    setQuery('')
    setSubmittedTerm('')
    closeSuggest()
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['Dictionary']} />
      {/* Search bar */}
      <header className="shrink-0">
        <form
          className="mx-auto w-full max-w-2xl px-6 pb-4 pt-6"
          onSubmit={(e) => {
            e.preventDefault()
            runSearch(query)
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              // Blur goes through closeSuggest (clears the timer and bumps seq so in-flight responses
              // can't reopen the list). List items preventDefault on mousedown so picking still works.
              onBlur={() => closeSuggest()}
              placeholder="Type a word or phrase, then press Enter"
              autoFocus
              data-lookup-search
              className="h-11 rounded-[14px] pl-10 pr-10 text-base"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear"
                onClick={clearInput}
                className="btn-squish absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-text-muted hover:bg-bg-400 hover:text-text-secondary"
              >
                <X className="size-4" />
              </button>
            )}
            {/* Suggestions: word + short meaning; picking one looks up the entry's exact text */}
            {suggestions.length > 0 && (
              <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-card bg-surface-3 shadow-panel">
                <ul className="max-h-80 overflow-y-auto p-1.5">
                  {suggestions.map((s) => (
                    <li key={s.entry}>
                      <button
                        type="button"
                        // keep the input from blurring and closing the list before the click
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runSearch(s.entry)}
                        className="flex w-full items-baseline gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-bg-400"
                      >
                        <span className="shrink-0 text-sm font-medium text-text-primary">{s.entry}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-text-muted">{s.explain}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </form>
      </header>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 pb-12">
          {submittedTerm ? (
            <WordLookupPanel
              term={submittedTerm}
              className="pt-2"
              onHit={() => void history.reload()}
            />
          ) : (
            <EmptyState
              history={historyRows}
              onPick={runSearch}
              onClearHistory={() => {
                void lookup.clearHistory().then(() => history.reload())
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────── Empty state: recent lookups ───────────────────────────

function EmptyState({
  history,
  onPick,
  onClearHistory,
}: {
  history: LookupHistoryRow[]
  onPick: (w: string) => void
  onClearHistory: () => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-8 pt-4">
      {history.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Recent lookups</span>
            <button
              type="button"
              onClick={onClearHistory}
              className="btn-squish text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              Clear
            </button>
          </div>
          <HistoryList rows={history} onPick={onPick} />
        </section>
      )}
    </div>
  )
}

/**
 * Recent lookups: same row style as the suggestion list (word + truncated first meaning); clicking
 * a row looks it up again. When there's no meaning snapshot only the word is shown.
 */
function HistoryList({
  rows,
  onPick,
}: {
  rows: LookupHistoryRow[]
  onPick: (w: string) => void
}): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-0.5">
      {rows.map((r) => (
        <li key={r.term}>
          <button
            type="button"
            onClick={() => onPick(r.term)}
            className="flex w-full items-baseline gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-bg-400"
          >
            <span className="shrink-0 text-sm font-medium text-text-primary">{r.term}</span>
            {r.explain && (
              <span className="min-w-0 flex-1 truncate text-xs text-text-muted">{r.explain}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
