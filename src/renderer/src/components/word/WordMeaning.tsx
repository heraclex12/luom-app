import { cn } from '@/lib/cn'
import type { CollinsEntry, MeaningSource, Word } from '@/types/word'
import { Highlighted } from '@/components/word/Highlighted'

/**
 * Word card meanings: Vietnamese meanings ('simple') or English definitions with Vietnamese
 * translations and examples ('collins'). Shared by WordDetailBody and DictPopup.
 *
 * Two sizes: `base` for full cards (default), `compact` for the reading popup.
 *
 * Source is controlled; if the word has no English definitions it falls back to Vietnamese
 * so the card is never empty.
 */

/** Text sizes for sense lines, part-of-speech labels and examples. */
const SIZES = {
  base: { sense: 'text-base', pos: 'text-sm', example: 'text-sm' },
  compact: { sense: 'text-sm', pos: 'text-xs', example: 'text-xs' },
} as const

type SizeSet = (typeof SIZES)[keyof typeof SIZES]

export function WordMeaning({
  entry,
  source,
  simpleLimit,
  size = 'base',
}: {
  entry: Word
  source: MeaningSource
  /**
   * Max number of Vietnamese meanings (default: all). The compact card shows only the first few.
   */
  simpleLimit?: number
  /** Size (default 'base'): full card / compact popup. */
  size?: keyof typeof SIZES
}): React.JSX.Element {
  const sizes = SIZES[size]
  const effectiveSource: MeaningSource =
    source === 'collins' && entry.collinsEntries.length > 0 ? 'collins' : 'simple'
  if (effectiveSource === 'collins') return <CollinsMeaning entries={entry.collinsEntries} sizes={sizes} />
  const senses = simpleLimit == null ? entry.simpleSenses : entry.simpleSenses.slice(0, simpleLimit)
  return <SimpleMeaning senses={senses} sizes={sizes} />
}

function SimpleMeaning({ senses, sizes }: { senses: string[]; sizes: SizeSet }): React.JSX.Element {
  if (senses.length === 0) return <p className={cn(sizes.sense, 'text-text-muted')}>No Vietnamese meaning yet</p>
  return (
    <div className="flex flex-col gap-2">
      {senses.map((s, i) => (
        <p key={i} className={cn(sizes.sense, 'text-text-primary')}>
          {s}
        </p>
      ))}
    </div>
  )
}

function CollinsMeaning({ entries, sizes }: { entries: CollinsEntry[]; sizes: SizeSet }): React.JSX.Element {
  if (entries.length === 0) return <p className={cn(sizes.sense, 'text-text-muted')}>No English definition yet</p>
  return (
    <div className="flex flex-col gap-3.5">
      {entries.map((e, i) => (
        <div key={i} className="flex flex-col gap-2">
          <p className={cn(sizes.sense, 'text-text-primary')}>
            {e.pos && <span className={cn('mr-1.5 font-serif italic text-text-muted', sizes.pos)}>{e.pos}</span>}
            <Highlighted text={e.tran} />
          </p>
          {e.tranVi && <p className={cn('-mt-1 text-text-secondary', sizes.example)}>{e.tranVi}</p>}
          {e.examples.map((ex, j) => (
            <div key={j} className={cn('flex gap-2 pl-1 text-text-secondary', sizes.example)}>
              <span className="text-text-muted">•</span>
              <div className="flex flex-col gap-0.5">
                <Highlighted text={ex.en} />
                {ex.vi && <span>{ex.vi}</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
