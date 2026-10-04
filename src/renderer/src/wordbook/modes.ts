// Learning modes: presets that bundle how pushy reminders are, the daily goal and how cards are practised.
// Switching modes never touches learning progress — every mode feeds the same FSRS schedule.

export type LearningMode = 'glance' | 'quick' | 'standard' | 'focus' | 'play'
export type ReminderIntensity = 'gentle' | 'regular' | 'persistent'
/** How one card is practised. flip = show & self-rate; choice = pick the meaning; type / listen / cloze = produce the word. */
export type ExerciseKind = 'flip' | 'choice' | 'type' | 'listen' | 'cloze'

export interface ModePreset {
  /** Word flash notifications every N hours (0 = off). */
  flashIntervalHours: 0 | 1 | 2 | 3 | 4
  reminderIntensity: ReminderIntensity
  /** New words per day. */
  newPerDay: number
  /** Cards to practise per day for the goal / streak. */
  dailyGoal: number
}

export interface LearningModeInfo {
  id: LearningMode
  name: string
  emoji: string
  /** Who it is for. */
  forWho: string
  description: string
  preset: ModePreset
}

export const LEARNING_MODES: readonly LearningModeInfo[] = [
  {
    id: 'glance',
    name: 'Glance',
    emoji: '👀',
    forWho: 'Busy or not in the mood',
    description: 'Your words come to you as notifications. Tap Got it or Again — no sessions needed.',
    preset: { flashIntervalHours: 1, reminderIntensity: 'gentle', newPerDay: 5, dailyGoal: 10 },
  },
  {
    id: 'quick',
    name: 'Quick',
    emoji: '⚡',
    forWho: 'A couple of minutes a day',
    description: 'Short rounds: pick the right Vietnamese meaning with one tap.',
    preset: { flashIntervalHours: 3, reminderIntensity: 'regular', newPerDay: 10, dailyGoal: 15 },
  },
  {
    id: 'standard',
    name: 'Standard',
    emoji: '📚',
    forWho: 'Steady, balanced learning',
    description: 'Flashcards: think of the meaning, reveal, then rate Again / Hard / Good.',
    preset: { flashIntervalHours: 2, reminderIntensity: 'regular', newPerDay: 20, dailyGoal: 30 },
  },
  {
    id: 'focus',
    name: 'Focus',
    emoji: '🎯',
    forWho: 'Hard-working, wants it to stick',
    description: 'Type the word from its meaning, write what you hear, fill in the blank. Reminders until your goal is done.',
    preset: { flashIntervalHours: 2, reminderIntensity: 'persistent', newPerDay: 20, dailyGoal: 50 },
  },
  {
    id: 'play',
    name: 'Play',
    emoji: '🎮',
    forWho: 'Gets bored easily',
    description: 'XP, streaks, daily quests, quick-fire rounds and a matching game.',
    preset: { flashIntervalHours: 3, reminderIntensity: 'regular', newPerDay: 15, dailyGoal: 30 },
  },
]

export function modeInfo(mode: LearningMode): LearningModeInfo {
  return LEARNING_MODES.find((m) => m.id === mode) ?? LEARNING_MODES[2]!
}

export const modePreset = (mode: LearningMode): ModePreset => modeInfo(mode).preset

export interface CardContext {
  kind: 'new' | 'learning' | 'review'
  reps: number
  /** Whether the word has an example sentence (needed for cloze). Defaults to true. */
  hasExample?: boolean
}

const FOCUS_ROTATION: readonly ExerciseKind[] = ['type', 'listen', 'cloze']

/**
 * The exercise for a card. A word never seen before (reps 0) is always shown as a flip card first —
 * you can't recall what you haven't learned. `seq` = position in the session (rotates Focus exercises).
 */
export function exerciseFor(mode: LearningMode, card: CardContext, seq: number): ExerciseKind {
  if (mode === 'glance' || mode === 'standard') return 'flip'
  if (card.reps === 0) return 'flip'
  if (mode === 'quick' || mode === 'play') return 'choice'
  const kind = FOCUS_ROTATION[seq % FOCUS_ROTATION.length]!
  return kind === 'cloze' && card.hasExample === false ? 'type' : kind
}

export interface OnboardingAnswers {
  /** Minutes per day the user can spend. */
  minutes: number
  /** What usually stops them. */
  obstacle: 'no-time' | 'laziness' | 'boredom' | 'forgetting'
}

/** Onboarding answers → suggested mode. */
export function recommendMode(a: OnboardingAnswers): LearningMode {
  if (a.minutes <= 2) return 'glance'
  if (a.obstacle === 'boredom') return 'play'
  if (a.obstacle === 'no-time' || a.obstacle === 'laziness') return a.minutes <= 5 ? 'quick' : 'standard'
  return a.minutes >= 15 ? 'focus' : 'standard'
}
