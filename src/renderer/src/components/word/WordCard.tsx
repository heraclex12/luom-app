import { cn } from '@/lib/cn'
import type { WordAudioColumns } from '@/lib/audio'
import type { DetailTab, MeaningSource, Word } from '@/types/word'
import { WordHeadline } from '@/components/word/WordHeadline'
import { PhoneticRow } from '@/components/word/PhoneticRow'
import { MeaningSourceToggle } from '@/components/word/MeaningSourceToggle'
import { WordActionBar } from '@/components/word/WordActionBar'
import { WordDetailBody } from '@/components/word/WordDetailBody'
import { SayItButton } from '@/components/speech/SayItButton'
import { MySentences } from '@/components/practice/MySentences'

/**
 * Top-level word card: WordHeadline + PhoneticRow + MeaningSourceToggle + WordActionBar
 * (top-right) + WordDetailBody. Shared by Look up, My words and Study; page differences
 * are handled through props.
 *
 * The reading popup (`DictPopup`) composes the sub-components directly instead.
 *
 * - revealed=false (study, not yet revealed): body is blurred and non-interactive;
 *   clicking the card calls onReveal.
 *
 * source / tab / accent / reveal are all controlled by the page; this component is
 * nearly stateless. Action bar switches and callbacks are passed through to WordActionBar.
 */

interface WordCardProps {
  entry: Word

  // ═══ View state (controlled by the page)
  source: MeaningSource
  onChangeSource: (s: MeaningSource) => void
  tab: DetailTab
  onChangeTab: (t: DetailTab) => void

  // ═══ Phonetics and reveal
  /** Current accent */
  accent?: 'uk' | 'us'
  onToggleAccent?: () => void
  /** Whether details are revealed (study; default true) */
  revealed?: boolean
  /** Called when the hidden card is clicked */
  onReveal?: () => void
  /** Spacing between meanings and inflections (passed to WordDetailBody). Look up uses 'legacy'. */
  inflectionSpacing?: 'cozy' | 'legacy'

  /**
   * Speak callback (speaker button, accent toggle, word click). Pages usually pass
   * `(a) => playWordAudio(dictRow, a)`; omitted means silent.
   */
  onSpeak?: (accent: 'us' | 'uk') => void
  /** Whether audio is available (default true); decides whether the speaker button is shown. */
  hasAudio?: boolean
  /** Audio URL columns (usually the dict row) so the speaker can animate while playing. */
  audioRow?: WordAudioColumns

  // ═══ Headline
  /** Show the word headline (default true) */
  showWordHeadline?: boolean
  /** Word click handler (defaults to speaking the word) */
  onWordClick?: () => void

  // ═══ Action bar (passed through to WordActionBar)
  /** Button visibility switches */
  actionBar?: {
    showNote?: boolean
    showLibrary?: boolean
    showMaster?: boolean
  }
  // Controlled values and callbacks (passed to WordActionBar)
  note?: string
  onNoteChange?: (value: string) => void
  noteMode?: 'popover' | 'dialog'
  noteOpen?: boolean
  onNoteOpenChange?: (open: boolean) => void

  inLibrary?: boolean
  onToggleLibrary?: () => void

  mastered?: boolean
  onMasterClick?: () => void

  /** When provided, the action bar shows an "Improve with AI" button */
  onImproveWithAi?: () => void
  improvingWithAi?: boolean
  /** Dict id of the word: enables the "Collections…" action */
  dictId?: number

  // ═══ Custom content (passed to WordActionBar)
  noteContent?: React.ReactNode

  /** Slot between meanings and detail tabs (Study injects "My note" here once revealed). */
  noteSlot?: React.ReactNode
  /** Stop click propagation on headline / phonetics / source toggle (Study's click-to-reveal). */
  stopClickPropagation?: boolean

  /** Extra class names for the root */
  className?: string
}

export function WordCard({
  entry,
  source,
  onChangeSource,
  tab,
  onChangeTab,
  accent = 'us',
  onToggleAccent,
  revealed = true,
  onReveal,
  inflectionSpacing = 'cozy',
  onSpeak,
  hasAudio = true,
  audioRow,
  showWordHeadline = true,
  onWordClick,
  actionBar,
  note,
  onNoteChange,
  noteMode = 'popover',
  noteOpen,
  onNoteOpenChange,
  inLibrary,
  onToggleLibrary,
  mastered,
  onMasterClick,
  onImproveWithAi,
  improvingWithAi,
  dictId,
  noteContent,
  noteSlot,
  stopClickPropagation = false,
  className,
}: WordCardProps): React.JSX.Element {
  const collinsAvailable = entry.collinsEntries.length > 0

  // Any action buttons? If so they sit beside the word; otherwise the word takes the full row.
  const hasActionBar =
    (!!actionBar && (actionBar.showNote || actionBar.showLibrary || actionBar.showMaster)) ||
    !!onImproveWithAi ||
    dictId != null

  // Speak via the page's onSpeak; silent when not provided (no TTS fallback).
  const handleSpeak = (a: 'us' | 'uk'): void => {
    onSpeak?.(a)
  }

  const headline = showWordHeadline ? (
    <WordHeadline
      word={entry.word}
      onWordClick={onWordClick ?? (() => handleSpeak(accent))}
      stopClickPropagation={stopClickPropagation}
    />
  ) : null

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Headline: word + action bar on the right */}
      {hasActionBar ? (
        <div className="flex items-start justify-between gap-3">
          {headline}
          <WordActionBar
            word={entry.word}
            showNote={actionBar?.showNote}
            noteValue={note}
            noteMode={noteMode}
            onNoteChange={onNoteChange}
            noteOpen={noteOpen}
            onNoteOpenChange={onNoteOpenChange}
            noteContent={noteContent}
            showLibrary={actionBar?.showLibrary}
            inLibrary={inLibrary}
            onToggleLibrary={onToggleLibrary}
            showMaster={actionBar?.showMaster}
            mastered={mastered}
            onMasterClick={onMasterClick}
            onImproveWithAi={onImproveWithAi}
            improvingWithAi={improvingWithAi}
            collectionsDictId={dictId}
          />
        </div>
      ) : (
        headline
      )}

      {/* Phonetic row: accent toggle + phonetics + meaning source toggle on the right */}
      <div className="flex items-center gap-2.5">
        <PhoneticRow
          phoneticUK={entry.phoneticUK}
          phoneticUS={entry.phoneticUS}
          accent={accent}
          onToggleAccent={onToggleAccent}
          // Use the locale from the toggle if given, else the current accent.
          // Leave undefined when the page has no onSpeak so the row knows there is no audio.
          onSpeak={onSpeak ? (locale) => handleSpeak(locale ? (locale === 'en-GB' ? 'uk' : 'us') : accent) : undefined}
          hasAudio={hasAudio}
          audioRow={audioRow}
          stopClickPropagation={stopClickPropagation}
        />
        {/* Say it: one of your words (needs its dict id to remember the try) */}
        {dictId != null && <SayItButton dictId={dictId} term={entry.word} phonetic={entry.phoneticUS || entry.phoneticUK} />}
        <MeaningSourceToggle
          className="ml-auto"
          source={source}
          onChange={onChangeSource}
          collinsAvailable={collinsAvailable}
          stopClickPropagation={stopClickPropagation}
        />
      </div>

      {/* Body: meanings + inflections + detail tabs. When not revealed (study) it is
          wrapped in a blurred layer; clicking reveals it. */}
      {revealed ? (
        <WordDetailBody
          entry={entry}
          source={source}
          tab={tab}
          onChangeTab={onChangeTab}
          inflectionSpacing={inflectionSpacing}
          noteSlot={
            dictId != null ? (
              <>
                {noteSlot}
                <MySentences dictId={dictId} term={entry.word} />
              </>
            ) : (
              noteSlot
            )
          }
        />
      ) : (
        <div
          aria-hidden
          className="flex flex-col gap-4 pointer-events-none select-none blur-sm transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation()
            onReveal?.()
          }}
        >
          <WordDetailBody
            entry={entry}
            source={source}
            tab={tab}
            onChangeTab={onChangeTab}
            inflectionSpacing={inflectionSpacing}
            hideDetailTabs
          />
        </div>
      )}
    </div>
  )
}
