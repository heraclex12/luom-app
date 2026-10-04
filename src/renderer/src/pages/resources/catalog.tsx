import { AlignLeft, AudioLines, ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge, Card } from '@/components/ui'
import { PhoneticsContent } from './phonetic'

/**
 * Resources catalog and per-category content views.
 * Category data is static placeholder content.
 */

// MARK: - Categories

/** Category icon tint, mapped to CDS paired semantic colors. */
type Tone = 'warning' | 'accent' | 'success'

const TONE_TILE: Record<Tone, string> = {
  warning: 'bg-bg-warning-chip text-text-warning',
  accent: 'bg-bg-accent-chip text-text-accent',
  success: 'bg-bg-success-chip text-text-success',
}

export interface ResourceCategory {
  id: 'phonetic' | 'grammar'
  title: string
  subtitle: string
  icon: LucideIcon
  tone: Tone
  /** Not yet available: card is greyed out, labelled "Coming soon", and can't be opened via URL. */
  comingSoon?: boolean
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  { id: 'phonetic', title: 'Phonetics', subtitle: 'Vowels · Consonants', icon: AudioLines, tone: 'warning' },
  { id: 'grammar', title: 'Grammar', subtitle: 'Tenses · Clauses · Subjunctive', icon: AlignLeft, tone: 'success', comingSoon: true },
]

/** Category icon tile, tinted per category. */
export function CategoryIcon({ category }: { category: ResourceCategory }): React.JSX.Element {
  const Icon = category.icon
  return (
    <span className={cn('grid size-11 shrink-0 place-items-center rounded-lg', TONE_TILE[category.tone])}>
      <Icon className="size-5" strokeWidth={2} />
    </span>
  )
}

/** Renders the content body for a category (the page header is rendered by the shell). */
export function CategoryContent({ categoryId }: { categoryId: ResourceCategory['id'] }): React.JSX.Element {
  switch (categoryId) {
    case 'phonetic':
      return <PhoneticsContent />
    case 'grammar':
      return <GrammarContent />
  }
}

// MARK: - Grammar

interface GrammarItem {
  title: string
  subtitle: string
}

const GRAMMAR_ITEMS: GrammarItem[] = [
  { title: 'Tenses', subtitle: 'Simple / continuous / perfect · all 12 tenses' },
  { title: 'Voice', subtitle: 'Active and passive · forming and using the passive' },
  { title: 'Clauses', subtitle: 'Noun · relative · adverbial clauses' },
  { title: 'Non-finite verbs', subtitle: 'Infinitives · gerunds · participles' },
  { title: 'Subjunctive mood', subtitle: 'Conditionals · wishes and suggestions' },
  { title: 'Inversion and emphasis', subtitle: 'Full / partial inversion · cleft sentences' },
]

/** Grammar content: divided list of topics inside a card; each row is clickable. */
function GrammarContent(): React.JSX.Element {
  return (
    <Card className="divide-y divide-border-200 overflow-hidden p-0">
      {GRAMMAR_ITEMS.map((item) => (
        <button
          key={item.title}
          type="button"
          className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-fill-ghost-hover can-focus"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium text-text-primary">{item.title}</span>
            <span className="truncate text-xs text-text-muted">{item.subtitle}</span>
          </div>
          <Badge variant="neutral" className="shrink-0">In progress</Badge>
          <ChevronRight className="size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
        </button>
      ))}
    </Card>
  )
}
