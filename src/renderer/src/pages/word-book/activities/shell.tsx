import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { appBridge } from '@/platform'
import * as wordbook from '@/wordbook'

/**
 * Shared frame of the 3D activities: the scene (top), a question panel (below), the end-of-round summary,
 * and a round hook that loads the words (due first), records every answer as a review and awards XP once.
 */

export const XP_PER_RIGHT = 6

/**
 * Game shortcuts must not react to typing elsewhere: an input / textarea / editable field, or any open dialog
 * (Settings can open over the game from the menu bar).
 */
export function ignoreGameKey(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return true
  const t = e.target as HTMLElement | null
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return true
  return !!document.querySelector('[role="dialog"], [role="alertdialog"]')
}

export function ActivityLayout({
  title,
  scene,
  panel,
}: {
  title: string
  scene: React.ReactNode
  panel: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar segments={['Play', title]} backTo="/wordbook/play" />
      {/* Scenes are wide (a river, a sky, a cave, a room): stage on top, question below. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 pb-8 pt-4">
        <div className="relative h-[46vh] min-h-[280px] shrink-0 overflow-hidden rounded-card">{scene}</div>
        <aside className="mx-auto w-full max-w-2xl shrink-0">{panel}</aside>
      </div>
    </div>
  )
}

export function PanelCard({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <section className="rounded-card border border-border bg-surface-1 p-6">{children}</section>
}

export function PanelHeader({ label, index, total }: { label: string; index: number; total: number }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between text-xs text-text-muted">
      <span className="font-semibold text-text-accent">{label}</span>
      <span className="tabular-nums">
        {Math.min(index + 1, total)} / {total}
      </span>
    </div>
  )
}

export function ActivitySummary({
  title,
  right,
  total,
  note,
  onAgain,
  extra,
}: {
  title: string
  right: number
  total: number
  note?: string
  onAgain: () => void
  /** An extra action next to "Another round" (e.g. open the aquarium). */
  extra?: React.ReactNode
}): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <PanelCard>
      <p className="font-serif text-2xl font-bold text-text-primary">
        {right === total ? `All ${total} right` : `${right} of ${total} right`}
      </p>
      <p className="mt-1 text-xs text-text-muted">{title}</p>
      <p className="mt-2 text-sm text-text-secondary">
        {right > 0 ? `+${right * XP_PER_RIGHT} XP. ` : ''}
        {note ?? 'Every answer counted as a review: the ones you missed come back soon.'}
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={onAgain}>Another round</Button>
        {extra}
        <Button variant="secondary" onClick={() => navigate('/wordbook/play')}>
          Done
        </Button>
      </div>
    </PanelCard>
  )
}

export function EmptyRound({ what }: { what: string }): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <PanelCard>
      <p className="text-lg font-semibold text-text-primary">Not enough words yet</p>
      <p className="mt-2 text-sm text-text-secondary">{what}</p>
      <Button className="mt-5" variant="secondary" onClick={() => navigate('/wordbook/books')}>
        Add words
      </Button>
    </PanelCard>
  )
}

/**
 * One round: `load` picks the items (from activity words, due first). `answer` records a review for the current
 * item; `next` moves on; XP is recorded once when the round ends. `restart` loads a fresh round.
 */
export function useRound<T extends { dictId: number; state?: number }>(load: () => Promise<T[]>) {
  const [items, setItems] = useState<T[] | null>(null)
  const [index, setIndex] = useState(0)
  const [right, setRight] = useState(0)
  const [finished, setFinished] = useState(false)
  const loadRef = useRef(load)
  loadRef.current = load

  const restart = useCallback(() => {
    setItems(null)
    setIndex(0)
    setRight(0)
    setFinished(false)
    void loadRef.current().then(setItems)
  }, [])
  useEffect(() => restart(), [restart])

  useEffect(() => {
    if (finished && right > 0) void wordbook.recordGame(right * XP_PER_RIGHT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  /** Record the current item's review (resolves when saved). */
  const answer = useCallback(
    async (review: wordbook.ActivityReview): Promise<void> => {
      const item = items?.[index]
      if (!item) return
      if (review !== 'again') setRight((r) => r + 1)
      // A word never studied (state 0) is an exposure here: rating it would start it outside the daily new-word
      // limit. Words being learned get a real review.
      if (item.state === 0) return
      await wordbook.quickRate(item.dictId, review)
      void appBridge.wordsChanged()
    },
    [items, index],
  )

  const next = useCallback(() => {
    if (!items) return
    if (index + 1 >= items.length) setFinished(true)
    else setIndex(index + 1)
  }, [items, index])

  return { items, item: items?.[index] ?? null, index, right, finished, answer, next, restart }
}

/** The word as slots: typed letters, the next slot underlined; spaces / hyphens shown as they are. */
export function SpellingSlots({ spell }: { spell: wordbook.Spelling }): React.JSX.Element {
  let k = 0
  return (
    <div className="mt-5 flex flex-wrap gap-1.5 font-serif text-2xl" aria-live="polite">
      {[...spell.target].map((ch, i) => {
        const isLetter = /[\p{L}\p{N}]/u.test(ch)
        if (!isLetter) return <span key={i} className="w-3 text-center text-text-muted">{ch === ' ' ? '' : ch}</span>
        const n = k++
        const shown = n < spell.pos
        return (
          <span
            key={i}
            className={cn(
              'grid h-11 w-8 place-items-center border-b-2',
              shown ? 'border-transparent text-text-primary' : n === spell.pos ? 'border-fill-brand' : 'border-border-strong',
            )}
          >
            {shown ? ch : ''}
          </span>
        )
      })}
    </div>
  )
}
