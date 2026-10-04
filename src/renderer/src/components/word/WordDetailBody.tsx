import { cn } from '@/lib/cn'
import { Button, Separator } from '@/components/ui'
import type { DetailTab, Inflection, MeaningSource, Word } from '@/types/word'
import { playAudioUrl } from '@/lib/audio'
import { SpeakerIcon } from '@/components/common/SpeakerIcon'
import { Highlighted } from '@/components/word/Highlighted'
import { WordMeaning } from '@/components/word/WordMeaning'
import { EmptyState } from '@/components/common/EmptyState'

/**
 * Word card detail body: meanings + inflections + Examples / Related / Synonyms / Phrases tabs.
 * View state (meaning source, tab) is controlled by the parent; the source toggle itself lives
 * in WordCard's phonetic row. Meanings render through `WordMeaning` (shared with DictPopup).
 */

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'example', label: 'Examples' },
  { key: 'derived', label: 'Related' },
  { key: 'synonym', label: 'Synonyms' },
  { key: 'phrase', label: 'Phrases' },
]

export function WordDetailBody({
  entry,
  source,
  tab,
  onChangeTab,
  inflectionSpacing = 'cozy',
  noteSlot,
  hideDetailTabs = false,
}: {
  entry: Word
  source: MeaningSource
  tab: DetailTab
  onChangeTab?: (t: DetailTab) => void
  /**
   * Spacing between meanings and inflections:
   * - 'cozy': container gap-2.5 + inflections mt-1 (word detail / study).
   * - 'legacy': no gap + inflections mt-2.5 (Look up page).
   */
  inflectionSpacing?: 'cozy' | 'legacy'
  /**
   * Slot between meanings and detail tabs (Study injects "My note" here).
   */
  noteSlot?: React.ReactNode
  /**
   * Hide the divider + detail tabs (default false); Study uses it before reveal.
   */
  hideDetailTabs?: boolean
}): React.JSX.Element {
  const handleChangeTab = (t: DetailTab): void => onChangeTab?.(t)

  const legacyInflection = inflectionSpacing === 'legacy'

  return (
    <>
      {/* Meanings + inflections */}
      <div className={cn('flex flex-col', legacyInflection ? 'gap-0' : 'gap-2.5')}>
        <WordMeaning entry={entry} source={source} />
        {entry.inflections.length > 0 && <Inflections items={entry.inflections} topMargin={legacyInflection ? 'mt-2.5' : 'mt-1'} />}
      </div>

      {/* Slot between meanings and detail tabs (Study's "My note") */}
      {noteSlot}

      {/* Detail tabs */}
      {!hideDetailTabs && (
        <>
          <Divider />
          <DetailTabs entry={entry} tab={tab} onChangeTab={handleChangeTab} />
        </>
      )}
    </>
  )
}

function Inflections({ items, topMargin = 'mt-1' }: { items: Inflection[]; topMargin?: string }): React.JSX.Element {
  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3', topMargin)}>
      {items.map((f) => (
        <div key={`${f.label}-${f.value}`} className="flex items-baseline gap-1.5 text-sm text-text-secondary">
          <span className="font-semibold">{f.label}</span>
          <span>{f.value}</span>
        </div>
      ))}
    </div>
  )
}

function DetailTabs({ entry, tab, onChangeTab }: { entry: Word; tab: DetailTab; onChangeTab: (t: DetailTab) => void }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex">
        {DETAIL_TABS.map((t) => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChangeTab(t.key)}
              className="btn-squish flex flex-1 flex-col items-center gap-2 py-1"
            >
              <span className={cn('text-sm', active ? 'font-semibold text-text-primary' : 'text-text-muted')}>{t.label}</span>
              <span className={cn('h-0.5 w-7 rounded-full', active ? 'bg-fill-brand' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>
      <div className="min-h-12">
        <TabContent entry={entry} tab={tab} />
      </div>
    </section>
  )
}

function TabContent({ entry, tab }: { entry: Word; tab: DetailTab }): React.JSX.Element {
  switch (tab) {
    case 'example':
      return entry.examples.length ? (
        <div className="flex flex-col gap-3.5">
          {entry.examples.map((ex, i) => {
            // Example audio comes from the dict's recorded URL; no speaker when missing (no TTS).
            const { audioUrl } = ex
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex flex-1 flex-col gap-1">
                  <Highlighted text={ex.english} className="text-base leading-relaxed text-text-primary" />
                  {ex.translation && <Highlighted text={ex.translation} className="text-sm leading-relaxed text-text-secondary" />}
                </div>
                {audioUrl && (
                  <Button variant="ghost" size="iconSm" aria-label="Play example" className="text-text-muted" onClick={() => void playAudioUrl(audioUrl)}>
                    <SpeakerIcon url={audioUrl} className="size-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <Empty />
      )
    case 'derived':
      return <TwoLineList items={entry.derived} />
    case 'phrase':
      return <TwoLineList items={entry.phraseGroup} />
    case 'synonym':
      return entry.synonymGroups.length ? (
        <div className="flex flex-col gap-4">
          {entry.synonymGroups.map((g, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <span className="text-sm text-text-secondary">{[g.pos, g.meaning].filter(Boolean).join(' ')}</span>
              <div className="flex flex-wrap gap-1.5">
                {g.words.map((w) => (
                  <span key={w} className="rounded-md bg-bg-neutral-chip px-2 py-0.5 text-sm text-text-primary">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty />
      )
  }
}

function TwoLineList({ items }: { items: string[] }): React.JSX.Element {
  if (!items.length) return <Empty />
  return (
    <div className="flex flex-col gap-3">
      {items.map((raw, i) => {
        const [head, ...tail] = raw.split(' — ')
        return (
          <p key={i} className="text-base text-text-primary">
            {head}
            {tail.length > 0 && <span className="ml-2 text-text-secondary">{tail.join(' — ')}</span>}
          </p>
        )
      })}
    </div>
  )
}

function Empty(): React.JSX.Element {
  return <EmptyState title="Nothing here yet" />
}

function Divider(): React.JSX.Element {
  return <Separator className="bg-border-200" />
}
