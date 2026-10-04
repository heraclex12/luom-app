import { useState } from 'react'
import type { DetailTab, MeaningSource, Word } from '@/types/word'
import type { WordAudioColumns } from '@/lib/audio'
import { WordCard } from '@/components/word/WordCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/ui'

/**
 * Detail pane: renders the shared `WordCard` (same card as Study, minus the rating bar).
 * Action bar = note + more (⋯) with Mark as known / Unmark as known and Remove from My words.
 * Marking as known and removing both ask for confirmation here; unmarking is immediate.
 */

export function WordDetail({
  entry,
  source,
  tab,
  note,
  accent,
  onToggleAccent,
  onSpeak,
  hasAudio,
  audioRow,
  onChangeSource,
  onChangeTab,
  onToggleMastered,
  onRemove,
  onChangeNote,
}: {
  entry: Word
  source: MeaningSource
  tab: DetailTab
  note: string
  /** Current accent (owned by the parent, defaults to the setting). */
  accent: 'uk' | 'us'
  onToggleAccent: () => void
  /** Play pronunciation; omitted when no audio is available. */
  onSpeak?: (accent: 'us' | 'uk') => void
  /** Whether audio exists; hides the speaker button otherwise. */
  hasAudio?: boolean
  /** Audio URL columns, used to animate the speaker while playing. */
  audioRow?: WordAudioColumns
  onChangeSource: (s: MeaningSource) => void
  onChangeTab: (t: DetailTab) => void
  /** Toggle known state (parent runs master/unmaster + refresh). */
  onToggleMastered: () => void
  /** Remove from My words (parent runs removeWord + refresh). */
  onRemove: () => void
  onChangeNote: (v: string) => void
}): React.JSX.Element {
  const mastered = entry.state === 'mastered'
  // Confirm before marking as known (unmarking is immediate).
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Confirm before removing (also discards study progress).
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

  const handleMasterClick = (): void => {
    if (mastered) onToggleMastered()
    else setConfirmOpen(true)
  }
  
  return (
    <>
      <WordCard
        entry={entry}
        inflectionSpacing="legacy"
        accent={accent}
        onToggleAccent={onToggleAccent}
        onSpeak={onSpeak}
        hasAudio={hasAudio}
        audioRow={audioRow}
        source={source}
        onChangeSource={onChangeSource}
        tab={tab}
        onChangeTab={onChangeTab}
        actionBar={{ showNote: true, showMaster: true, showLibrary: true }}
        note={note}
        onNoteChange={onChangeNote}
        noteMode="dialog"
        mastered={mastered}
        onMasterClick={handleMasterClick}
        inLibrary
        onToggleLibrary={() => setConfirmRemoveOpen(true)}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Mark "${entry.word}" as known?`}
        description="It won't appear in Study or Review anymore. You can unmark it later under Mastered."
        confirmText="Mark as known"
        confirmVariant="primary"
        onConfirm={onToggleMastered}
      />

      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title={`Remove "${entry.word}" from My words?`}
        description="The word and its study progress will be removed. You can add it again later and start over."
        confirmText="Remove"
        confirmVariant="danger"
        onConfirm={onRemove}
      />
    </>
  )
}

/** Empty detail pane when no word is selected. */
export function EmptyDetail(): React.JSX.Element {
  return <EmptyState variant="detail" title="Select a word on the left to see details" />
}
