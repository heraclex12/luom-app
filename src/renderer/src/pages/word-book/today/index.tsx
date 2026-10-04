import { useEffect, useMemo, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { BookHeader } from '../components/BookHeader'
import { useMasterDetailWordPage, WordMasterDetailBody } from '../components/MasterDetailWordPage'
import { useAsyncData } from '@/hooks/useAsyncData'
import * as wordbook from '@/wordbook'

/**
 * Today (target of the home "Studied today" stat): master-detail, reusing WordList + WordDetail.
 * Segments come from today's review log: New words = words with a pre_state=0 log today;
 * Review = logged today without a pre_state=0 log. Membership is fixed by the log.
 * Search filters by prefix within the current segment.
 */

type QueueSeg = 'learned' | 'reviewed'

const SEGMENTS: { key: QueueSeg; label: string }[] = [
  { key: 'learned', label: 'New words' },
  { key: 'reviewed', label: 'Review' },
]

export default function TodayLearn(): React.JSX.Element {
  const [segment, setSegment] = useState<QueueSeg>('learned')
  const [query, setQuery] = useState('')

  // Both segments in one fetch; refetched after mastering to refresh card state.
  const today = useAsyncData(() => wordbook.todaySegments(), [])
  const segList = segment === 'learned' ? today.data?.learned : today.data?.reviewed

  // Visible rows: current segment filtered by prefix search (rows with term=null never match).
  const rows = useMemo(() => {
    const all = segList ?? []
    const q = query.trim().toLowerCase()
    return q === '' ? all : all.filter((r) => r.term?.toLowerCase().startsWith(q))
  }, [segList, query])

  // Shell: selection + card loading + actions; selection resolves across both segments.
  const page = useMasterDetailWordPage({
    lookupRow: (id) =>
      today.data && id != null
        ? [...today.data.learned, ...today.data.reviewed].find((r) => r.dictId === id) ?? null
        : null,
    reload: today.reload,
  })
  const { selectedId, setSelectedId } = page

  // Poll the learning day every minute so a page left open past the 4:00 rollover refetches.
  useEffect(() => {
    let learningDay = wordbook.currentLearningDay()
    const timer = window.setInterval(() => {
      const next = wordbook.currentLearningDay()
      if (next !== learningDay) {
        learningDay = next
        void today.reload()
      }
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [today.reload])

  // Keep selection valid: fall back to the first visible row.
  useEffect(() => {
    if (rows.length === 0) return
    if (selectedId == null || !rows.some((r) => r.dictId === selectedId)) {
      setSelectedId(rows[0].dictId)
    }
  }, [rows, selectedId, setSelectedId])

  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['My words', 'Today']} backTo="/wordbook" />
      {/* Header: New words / Review toggle + search */}
      <BookHeader
        segments={SEGMENTS}
        segment={segment}
        onSegmentChange={setSegment}
        query={query}
        onQueryChange={setQuery}
      />
      <WordMasterDetailBody rows={rows} page={page} />
    </div>
  )
}
