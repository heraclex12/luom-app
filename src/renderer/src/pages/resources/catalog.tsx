import { AudioLines, AudioWaveform, Ear, ListOrdered, MessagesSquare, Puzzle, Scale, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EndingsContent } from './endings'
import { PhoneticsContent } from './phonetic'
import { SoundPairsContent } from './soundPairs'
import { IrregularVerbsContent, PhrasalVerbsContent } from './verbs'
import { ConfusingWordsContent, PhrasesContent } from './words'

/**
 * Resources catalog and per-category content views: pronunciation (phonetics, sound pairs, word endings), verbs
 * (irregular, phrasal) and words in use (confusing words, everyday phrases). Content is bundled (works offline);
 * audio comes from the app's text-to-speech.
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
  id: 'phonetic' | 'pairs' | 'endings' | 'irregular' | 'phrasal' | 'confusing' | 'phrases'
  title: string
  subtitle: string
  icon: LucideIcon
  tone: Tone
  /** Heading it is listed under. */
  group: 'Pronunciation' | 'Verbs' | 'Words in use'
  /** Not yet available: card is greyed out, labelled "Coming soon", and can't be opened via URL. */
  comingSoon?: boolean
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  { id: 'phonetic', title: 'Phonetics', subtitle: 'Vowels · Consonants', icon: AudioLines, tone: 'warning', group: 'Pronunciation' },
  { id: 'pairs', title: 'Sound pairs', subtitle: 'ship / sheep · light / night · listening quiz', icon: Ear, tone: 'warning', group: 'Pronunciation' },
  { id: 'endings', title: 'Word endings', subtitle: '-s and -ed: three sounds each · quiz', icon: AudioWaveform, tone: 'warning', group: 'Pronunciation' },
  { id: 'irregular', title: 'Irregular verbs', subtitle: 'go · went · gone: 100 common verbs', icon: ListOrdered, tone: 'accent', group: 'Verbs' },
  { id: 'phrasal', title: 'Phrasal verbs', subtitle: 'give up · look after · run out of', icon: Puzzle, tone: 'accent', group: 'Verbs' },
  { id: 'confusing', title: 'Confusing words', subtitle: 'borrow / lend · say / tell · bored / boring', icon: Scale, tone: 'success', group: 'Words in use' },
  { id: 'phrases', title: 'Everyday phrases', subtitle: 'Small talk · Work · Travel · Shopping', icon: MessagesSquare, tone: 'success', group: 'Words in use' },
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
    case 'pairs':
      return <SoundPairsContent />
    case 'endings':
      return <EndingsContent />
    case 'irregular':
      return <IrregularVerbsContent />
    case 'phrasal':
      return <PhrasalVerbsContent />
    case 'confusing':
      return <ConfusingWordsContent />
    case 'phrases':
      return <PhrasesContent />
  }
}
