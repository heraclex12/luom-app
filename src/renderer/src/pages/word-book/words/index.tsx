import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { onWordsChanged } from '@/app'
import { TopBar } from '@/components/layout/TopBar'
import { BookHeader } from '../components/BookHeader'
import { useMasterDetailWordPage, WordMasterDetailBody } from '../components/MasterDetailWordPage'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import * as wordbook from '@/wordbook'
import type { WordSegment } from '@/wordbook'

/**
 * My words list: master-detail. Header = 5 segment filters + search; left = word list,
 * right = selected word's card. Shell is shared with Today; deep links ?seg= / ?dictId= are unique here.
 */

// ─────────────────────────── Segment filters ───────────────────────────

type SegmentKey = 'all' | 'new' | 'due' | 'learning' | 'mastered'

const SEGMENTS: { key: SegmentKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'due', label: 'Due' },
  { key: 'learning', label: 'Learning' },
  { key: 'mastered', label: 'Mastered' },
]

const SEGMENT_KEYS = SEGMENTS.map((s) => s.key)

/** Search debounce: avoid a LIKE query on every keystroke. */
const SEARCH_DEBOUNCE_MS = 250

/** UI segment → facade segment ('learning' = memorizing); 'all' uses listAllWords. */
const FACADE_SEGMENT: Record<Exclude<SegmentKey, 'all'>, WordSegment> = {
  new: 'new',
  due: 'due',
  learning: 'memorizing',
  mastered: 'mastered',
}

// ─────────────────────────── Root ───────────────────────────

export default function MyWords(): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // ?collection=ID limits the list to one collection.
  const collectionId = Number(searchParams.get('collection')) || undefined
  const collections = useAsyncData(() => wordbook.listCollections(), [])
  const setCollection = (value: string): void => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('collection')
    else next.set('collection', value)
    next.delete('dictId')
    setSearchParams(next, { replace: true })
  }
  // Deep links: ?seg= preselects a segment (home "Due" uses seg=due); ?dictId= preselects a word (from Notes).
  const initialSegment = (SEGMENT_KEYS as string[]).includes(searchParams.get('seg') ?? '')
    ? (searchParams.get('seg') as SegmentKey)
    : 'all'
  const initialDictId = Number(searchParams.get('dictId')) || null

  const [segment, setSegment] = useState<SegmentKey>(initialSegment)
  const [query, setQuery] = useState('')
  // If the deep-linked word isn't in the list, show the empty detail once instead of jumping to the first row.
  const deepLinkPending = useRef(initialDictId != null)

  // Segment list: refetch on segment / debounced search change.
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const search = debouncedQuery.trim() || undefined
  const list = useAsyncData(
    () =>
      segment === 'all'
        ? wordbook.listAllWords({ search, collectionId })
        : wordbook.listSegment(FACADE_SEGMENT[segment], { search, collectionId }),
    [segment, search, collectionId],
  )
  // Words added elsewhere (capture popup, collections dialog) → refresh.
  const reloadList = list.reload
  useEffect(() => onWordsChanged(() => {
    void reloadList()
    void collections.reload()
  }), [reloadList, collections.reload])
  const rows = useMemo(() => list.data ?? [], [list.data])

  // Shell: selection + card loading + master/remove actions.
  const page = useMasterDetailWordPage({
    lookupRow: (id) => rows.find((r) => r.dictId === id) ?? null,
    reload: list.reload,
    initialSelectedId: initialDictId,
  })
  const { selectedId, setSelectedId } = page

  // Keep selection valid: fall back to the first row, except for a missed initial deep link.
  useEffect(() => {
    if (rows.length === 0) return
    if (selectedId != null && rows.some((r) => r.dictId === selectedId)) {
      deepLinkPending.current = false
      return
    }
    if (deepLinkPending.current) {
      deepLinkPending.current = false
      return
    }
    setSelectedId(rows[0].dictId)
  }, [rows, selectedId, setSelectedId])

  return (
    <div className="flex h-full flex-col">
      <TopBar
        segments={['My words', collections.data?.find((c) => c.collectionId === collectionId)?.name ?? 'All words']}
        backTo="/wordbook"
      />
      {/* Header: segment filters + search */}
      <BookHeader
        segments={SEGMENTS}
        segment={segment}
        onSegmentChange={setSegment}
        query={query}
        onQueryChange={setQuery}
        extra={
          <div className="flex items-center gap-2">
            <Select value={collectionId != null ? String(collectionId) : 'all'} onValueChange={setCollection}>
              <SelectTrigger className="h-9 min-w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All words</SelectItem>
                {(collections.data ?? []).map((c) => (
                  <SelectItem key={c.collectionId} value={String(c.collectionId)}>
                    {c.name} ({c.wordCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {collectionId != null && (
              <Button variant="secondary" size="sm" onClick={() => navigate(`/wordbook/study?collection=${collectionId}`)}>
                <GraduationCap className="size-4" /> Study
              </Button>
            )}
          </div>
        }
      />
      <WordMasterDetailBody rows={rows} page={page} />
    </div>
  )
}
