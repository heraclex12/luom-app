import { Search } from 'lucide-react'
import { Input, ToggleGroup, ToggleGroupItem } from '@/components/ui'

/**
 * Header for master-detail word pages: segment toggle + search box. Segments are passed in,
 * so My words (5 filters) and Today (2 segments) share it; fetching/debouncing stays in each page.
 */
export function BookHeader<K extends string>({
  segments,
  segment,
  onSegmentChange,
  query,
  onQueryChange,
}: {
  segments: readonly { key: K; label: string }[]
  segment: K
  onSegmentChange: (s: K) => void
  query: string
  onQueryChange: (q: string) => void
}): React.JSX.Element {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-200 px-4">
      <ToggleGroup value={segment} onValueChange={(v) => v && onSegmentChange(v as K)}>
        {segments.map((s) => (
          <ToggleGroupItem key={s.key} value={s.key}>
            {s.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="relative ml-auto w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search words"
          className="h-9 rounded-lg pl-9"
        />
      </div>
    </header>
  )
}
