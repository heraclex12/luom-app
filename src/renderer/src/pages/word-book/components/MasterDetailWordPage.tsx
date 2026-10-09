import { useEffect, useState } from 'react'
import { WordList } from './WordList'
import { WordDetail, EmptyDetail } from './WordDetail'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useWordNote } from '@/hooks/useWordNote'
import { meaningSourceToDisplay, useSettings } from '@/hooks/useSettings'
import { hasWordAudio, playWordAudio } from '@/lib/audio'
import { toast } from '@/lib/toast'
import * as dict from '@/dict'
import * as wordbook from '@/wordbook'
import type { WordListItem } from '@/wordbook'
import type { DetailTab, MeaningSource } from '@/types/word'

/**
 * Shared master-detail shell for Today / My words: selection + card loading + master/remove / Improve with AI actions.
 * Data fetching stays in each page.
 * - lookupRow: resolves selectedId to a row from the caller's data.
 * - reload: refetch after master/remove.
 * selectWord also resets the meaning source / tab.
 */
export function useMasterDetailWordPage({
  lookupRow,
  reload,
  initialSelectedId = null,
}: {
  lookupRow: (id: number | null) => WordListItem | null
  reload: () => Promise<void>
  initialSelectedId?: number | null
}) {
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId)

  // Defaults from settings: meaning source and accent (still switchable manually).
  const settings = useSettings()
  const defaultSource = meaningSourceToDisplay(settings?.meaningSource)
  const [source, setSource] = useState<MeaningSource>('simple')
  const [accent, setAccent] = useState<'uk' | 'us'>('us')
  const [tab, setTab] = useState<DetailTab>('example')
  useEffect(() => setSource(defaultSource), [defaultSource])
  useEffect(() => {
    if (settings) setAccent(settings.accent)
  }, [settings])

  const selectedRow = lookupRow(selectedId)

  // Tag the load with its dictId so a stale card is never shown for a newly selected word.
  const card = useAsyncData(() => {
    if (!selectedRow) return Promise.resolve(null)
    const forDictId = selectedRow.dictId
    return wordbook.loadWordCard(selectedRow).then((data) => ({ ...data, forDictId }))
  }, [selectedRow?.dictId, selectedRow?.state, selectedRow?.due])
  const note = useWordNote(selectedId)

  // Improve with AI: rewrite the saved word's entry (natural Vietnamese meanings, bilingual examples), as in Dictionary.
  const [hasAi, setHasAi] = useState(false)
  const [improving, setImproving] = useState(false)
  useEffect(() => {
    let alive = true
    void dict.aiReady().then((v) => alive && setHasAi(v))
    return () => {
      alive = false
    }
  }, [])
  async function improveWithAi(): Promise<void> {
    const term = selectedRow?.term
    if (!term || improving) return
    setImproving(true)
    try {
      await dict.improveWithAi(term)
      await card.reload()
      toast.success(`Updated “${term}”`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setImproving(false)
    }
  }

  function selectWord(dictId: number): void {
    setSelectedId(dictId)
    setSource(defaultSource)
    setTab('example')
  }

  /** Mark/unmark as known (WordDetail handles confirmation), then reload. */
  async function toggleMastered(): Promise<void> {
    if (selectedId == null || !selectedRow) return
    await (selectedRow.state === 4 ? wordbook.unmaster(selectedId) : wordbook.master(selectedId))
    await reload()
  }

  /** Remove from My words (WordDetail handles confirmation), then reload. */
  async function removeFromLibrary(): Promise<void> {
    if (selectedId == null) return
    await wordbook.removeWord(selectedId)
    await reload()
  }

  return {
    selectedId,
    setSelectedId,
    selectedRow,
    selectWord,
    source,
    tab,
    accent,
    setSource,
    setTab,
    toggleAccent: () => setAccent((a) => (a === 'uk' ? 'us' : 'uk')),
    card,
    note,
    onToggleMastered: () => void toggleMastered(),
    onRemove: () => void removeFromLibrary(),
    onImproveWithAi: hasAi ? () => void improveWithAi() : undefined,
    improving,
  }
}

export type MasterDetailWordPage = ReturnType<typeof useMasterDetailWordPage>

/**
 * Master-detail body (word list + word card), shared by Today / My words.
 * The card renders only once the selected word's data has loaded.
 */
export function WordMasterDetailBody({
  rows,
  page,
}: {
  rows: WordListItem[]
  page: MasterDetailWordPage
}): React.JSX.Element {
  const {
    selectedId,
    selectedRow,
    selectWord,
    source,
    tab,
    accent,
    setSource,
    setTab,
    toggleAccent,
    card,
    note,
    onToggleMastered,
    onRemove,
    onImproveWithAi,
    improving,
  } = page
  return (
    <div className="flex min-h-0 flex-1">
      {/* Left: words in the current segment */}
      <WordList words={rows} selectedId={selectedId} onSelect={selectWord} />

      {/* Right: word detail */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {selectedRow && card.data && card.data.forDictId === selectedRow.dictId ? (
          <div className="mx-auto max-w-2xl px-8 py-6">
            <WordDetail
              dictId={selectedRow.dictId}
              entry={card.data.word}
              source={source}
              tab={tab}
              note={note.note}
              accent={accent}
              onToggleAccent={toggleAccent}
              onSpeak={card.data.dictRow ? (a) => void playWordAudio(card.data!.dictRow!, a) : undefined}
              hasAudio={!!card.data.dictRow && hasWordAudio(card.data.dictRow)}
              audioRow={card.data.dictRow ?? undefined}
              onChangeSource={setSource}
              onChangeTab={setTab}
              onToggleMastered={onToggleMastered}
              onRemove={onRemove}
              onChangeNote={note.update}
              onImproveWithAi={onImproveWithAi}
              improvingWithAi={improving}
            />
          </div>
        ) : (
          <EmptyDetail />
        )}
      </main>
    </div>
  )
}
