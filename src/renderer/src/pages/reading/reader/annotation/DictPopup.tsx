import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui'
import { LOOKUP_MAX_WORDS, type LookupTermVerdict } from '@/reading'
import type { MeaningSource, Word } from '@/types/word'
import { hasWordAudio, playWordAudio } from '@/lib/audio'
import { WordHeadline } from '@/components/word/WordHeadline'
import { PhoneticRow } from '@/components/word/PhoneticRow'
import { MeaningSourceToggle } from '@/components/word/MeaningSourceToggle'
import { WordMeaning } from '@/components/word/WordMeaning'
import { meaningSourceToDisplay, useSettings } from '@/hooks/useSettings'
import * as dict from '@/dict'
import type { LocalDictRow } from '@/dict'
import { DEFAULT_SETTINGS } from '@/settings'
import * as wordbook from '@/wordbook'
import { useViewportAnchor } from './useViewportAnchor'

/**
 * Compact lookup card that pops up next to the selection after "Look up" in the annotation
 * toolbar. Sibling of `TranslatorPopup`: same width, anchoring and dismissal.
 *
 * A condensed word card built from the same parts (`WordHeadline` size=sm + `PhoneticRow` +
 * `MeaningSourceToggle` + `WordMeaning`). Forms, examples, notes etc. live in the full entry
 * window ("Full entry"). Vietnamese senses are capped at 3 and the meaning area scrolls, so the
 * card never covers too much text.
 *
 * Accent and meaning source default to the word-card settings; toggling here is local only.
 * No auto-play on hit — it would interrupt TTS read-aloud.
 *
 * Falls back to translation: both the not-found and too-long states offer "Translate this".
 *
 * Dismissal is owned by SelectionAnnotator, hence `data-annotation-layer` and no close button.
 */

export interface DictPopupProps {
  /** Lookup term, already cleaned by the engine (`EngineSelection.lookupTerm`). */
  term: string
  /** `ok` = look up; `too-long` = show the fallback state without querying. */
  verdict: Extract<LookupTermVerdict, 'ok' | 'too-long'>
  /** Anchor x: horizontal center of the selection. */
  x: number
  /** Anchor y: bottom edge of the selection. */
  y: number
  /** Selection height, used to clear the text when flipping above. */
  height: number
  /** "Translate this": switch to the translator (primary action when not found / too long). */
  onTranslate: () => void
  /** "Full entry": host opens the full entry window. */
  onOpenFull: () => void
  /**
   * Temporarily hidden while the full entry window is on top. Stays mounted so closing the
   * full entry doesn't re-run the lookup and flash "Loading…".
   */
  hidden?: boolean
}

/** Card state: loading / hit / not found / unavailable / too long (not queried). */
type State =
  | { kind: 'loading' }
  | { kind: 'hit'; row: LocalDictRow; word: Word; inLibrary: boolean }
  | { kind: 'not-found' }
  | { kind: 'unavailable' }
  | { kind: 'too-long' }

/** Max Vietnamese senses shown; the English view isn't capped and scrolls instead. */
const SENSE_LIMIT = 3

export function DictPopup({
  term,
  verdict,
  x,
  y,
  height,
  onTranslate,
  onOpenFull,
  hidden = false,
}: DictPopupProps): React.JSX.Element {
  const { ref, left, top } = useViewportAnchor<HTMLDivElement>(x, y, height)
  const [state, setState] = useState<State>(verdict === 'too-long' ? { kind: 'too-long' } : { kind: 'loading' })
  // Retry counter: the term doesn't change, so bump a dependency to re-run the lookup effect.
  const [retry, setRetry] = useState(0)

  // View state defaults to word-card settings; local toggles aren't written back.
  // Start from registry defaults, sync once settings load. Host keys by term, so each popup starts fresh.
  const [accent, setAccent] = useState<'us' | 'uk'>(DEFAULT_SETTINGS.accent)
  const [source, setSource] = useState<MeaningSource>(meaningSourceToDisplay(DEFAULT_SETTINGS.meaningSource))
  const settings = useSettings()
  useEffect(() => {
    if (!settings) return
    setAccent(settings.accent)
    setSource(meaningSourceToDisplay(settings.meaningSource))
  }, [settings])

  // Look up + library state. `alive` guard drops stale results when the term changes.
  useEffect(() => {
    if (verdict === 'too-long') {
      setState({ kind: 'too-long' })
      return
    }
    let alive = true
    setState({ kind: 'loading' })
    void (async () => {
      const res = await dict.lookup(term)
      if (!alive) return
      if (res.status !== 'hit') {
        setState({ kind: res.status === 'not-found' ? 'not-found' : 'unavailable' })
        return
      }
      const states = await wordbook.getWordStates([res.row.dictId])
      if (!alive) return
      const brief = states.get(res.row.dictId) ?? null
      setState({
        kind: 'hit',
        row: res.row,
        word: wordbook.wordFromDictRow(res.row, brief),
        inLibrary: brief != null,
      })
    })()
    return () => {
      alive = false
    }
  }, [term, verdict, retry])

  /** Add to My words and refresh state (removing is done from the full entry). */
  const addWord = async (): Promise<void> => {
    if (state.kind !== 'hit') return
    await wordbook.addWords([state.row.dictId])
    setState({ ...state, inLibrary: true })
  }

  return (
    <div
      ref={ref}
      // Exempts this layer from the host's click-outside dismissal (see SelectionAnnotator).
      data-annotation-layer=""
      className={cn(
        'anim-pop fixed z-50 w-[380px] -translate-x-1/2 select-text rounded-card bg-surface-3 text-text-primary shadow-popover',
        hidden && 'invisible',
      )}
      style={{ left, top }}
      onMouseDown={(e) => e.preventDefault()} // keep the selection when clicking the popup
    >
      {state.kind === 'hit' ? (
        <Hit
          row={state.row}
          word={state.word}
          inLibrary={state.inLibrary}
          accent={accent}
          onToggleAccent={() => setAccent((a) => (a === 'uk' ? 'us' : 'uk'))}
          source={source}
          onChangeSource={setSource}
          onAdd={() => void addWord()}
          onOpenFull={onOpenFull}
        />
      ) : (
        <div className="px-4 py-3.5">
          {state.kind === 'loading' && (
            <p className="text-[15px] leading-relaxed text-text-muted">Loading…</p>
          )}

          {state.kind === 'not-found' && (
            <>
              <p className="text-[15px] leading-relaxed text-text-primary">
                No entry for “<span className="font-semibold">{term}</span>”
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                This word isn't in the dictionary. For a sentence, try Translate.
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={onTranslate}>
                Translate this
              </Button>
            </>
          )}

          {state.kind === 'too-long' && (
            <>
              <p className="text-[15px] leading-relaxed text-text-primary">Selection too long</p>
              <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                Look up handles up to {LOOKUP_MAX_WORDS} words. Use Translate for sentences.
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={onTranslate}>
                Translate this
              </Button>
            </>
          )}

          {state.kind === 'unavailable' && (
            <>
              <p className="text-[15px] leading-relaxed text-text-primary">You seem to be offline</p>
              <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                This word isn't cached locally. Check your connection and try again.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setRetry((n) => n + 1)}
              >
                Retry
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Hit state: headword / phonetics + source toggle / meanings / actions. */
function Hit({
  row,
  word,
  inLibrary,
  accent,
  onToggleAccent,
  source,
  onChangeSource,
  onAdd,
  onOpenFull,
}: {
  row: LocalDictRow
  word: Word
  inLibrary: boolean
  /** Current accent (PhoneticRow pins to the available side if only one exists). */
  accent: 'us' | 'uk'
  onToggleAccent: () => void
  source: MeaningSource
  onChangeSource: (s: MeaningSource) => void
  onAdd: () => void
  onOpenFull: () => void
}): React.JSX.Element {
  // No audio URL → no speaker button; a silent button is worse.
  const hasAudio = hasWordAudio(row)

  return (
    <>
      <div className="flex flex-col gap-2.5 px-4 pt-3.5">
        {/* Clicking the headword plays the current accent. */}
        <WordHeadline size="sm" word={word.word} onWordClick={() => void playWordAudio(row, accent)} />

        {/* Phonetic row (rules live in PhoneticRow) + meaning source toggle */}
        <div className="flex items-center gap-2.5">
          <PhoneticRow
            phoneticUK={word.phoneticUK}
            phoneticUS={word.phoneticUS}
            accent={accent}
            onToggleAccent={onToggleAccent}
            // Use the given locale if any, else the current accent — same as WordCard.
            onSpeak={(locale) => void playWordAudio(row, locale ? (locale === 'en-GB' ? 'uk' : 'us') : accent)}
            hasAudio={hasAudio}
            audioRow={row}
          />
          <MeaningSourceToggle
            className="ml-auto"
            source={source}
            onChange={onChangeSource}
            collinsAvailable={word.collinsEntries.length > 0}
          />
        </div>
      </div>

      {/* Meanings: compact size; Vietnamese capped at SENSE_LIMIT, English scrolls. */}
      <div className="mt-3 max-h-[40vh] overflow-y-auto px-4">
        <WordMeaning entry={word} source={source} simpleLimit={SENSE_LIMIT} size="compact" />
      </div>

      <div className="mx-4 my-3 h-px bg-border-300" />

      <div className="flex items-center justify-between gap-2 px-4 pb-3">
        {inLibrary ? (
          <span className="text-xs text-text-muted">In My words</span>
        ) : (
          <Button variant="secondary" size="sm" onClick={onAdd}>
            Add to My words
          </Button>
        )}
        <button
          type="button"
          onClick={onOpenFull}
          className="btn-squish shrink-0 text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          Full entry
        </button>
      </div>
    </>
  )
}
