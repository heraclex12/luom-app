import { Eye, Gamepad2, Layers, Target, Zap, type LucideIcon } from 'lucide-react'
import type { LearningMode } from '@/wordbook'

/** One icon per learning mode (replaces emoji; same stroke and colour as the surrounding text). */
const ICONS: Record<LearningMode, LucideIcon> = {
  glance: Eye,
  quick: Zap,
  standard: Layers,
  focus: Target,
  play: Gamepad2,
}

export function ModeIcon({ mode, className }: { mode: LearningMode; className?: string }): React.JSX.Element {
  const Icon = ICONS[mode] ?? Layers
  return <Icon className={className} strokeWidth={1.75} aria-hidden />
}
