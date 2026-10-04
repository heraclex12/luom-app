// First-run setup flow: pure step navigation + answers (no React, no IO), so the page stays a thin view.
import type { LearningMode, OnboardingAnswers } from '@/wordbook'

export const STEPS = ['welcome', 'why', 'time', 'obstacle', 'mode', 'setup'] as const
export type Step = (typeof STEPS)[number]

export type Reason = 'work' | 'study' | 'travel' | 'everyday' | 'fun'
export type Obstacle = OnboardingAnswers['obstacle']

export interface OnboardingState {
  /** Index into STEPS. */
  step: number
  reason: Reason | null
  minutes: number | null
  obstacle: Obstacle | null
  /** Mode the user picked explicitly; null = follow the recommendation. */
  mode: LearningMode | null
}

export const INITIAL_STATE: OnboardingState = { step: 0, reason: null, minutes: null, obstacle: null, mode: null }

export const stepOf = (s: OnboardingState): Step => STEPS[s.step]!
export const isLastStep = (s: OnboardingState): boolean => s.step === STEPS.length - 1

/** Whether the current step's question is answered (steps without a question can always advance). */
export function canAdvance(s: OnboardingState): boolean {
  switch (stepOf(s)) {
    case 'why':
      return s.reason !== null
    case 'time':
      return s.minutes !== null
    case 'obstacle':
      return s.obstacle !== null
    default:
      return true
  }
}

export const next = (s: OnboardingState): OnboardingState =>
  canAdvance(s) && !isLastStep(s) ? { ...s, step: s.step + 1 } : s

export const back = (s: OnboardingState): OnboardingState => (s.step > 0 ? { ...s, step: s.step - 1 } : s)

/** Apply answers. A changed time / obstacle answer drops an explicit mode pick so the fresh recommendation shows. */
export function update(s: OnboardingState, patch: Partial<Omit<OnboardingState, 'step'>>): OnboardingState {
  const answersChanged =
    (patch.minutes !== undefined && patch.minutes !== s.minutes) ||
    (patch.obstacle !== undefined && patch.obstacle !== s.obstacle)
  const merged = { ...s, ...patch }
  return answersChanged && patch.mode === undefined ? { ...merged, mode: null } : merged
}

/** Recommendation for the answers so far (unanswered → 5 min / forgetting, a middle-of-the-road guess). */
export const recommendedFor = (
  s: OnboardingState,
  recommend: (a: OnboardingAnswers) => LearningMode,
): LearningMode => recommend({ minutes: s.minutes ?? 5, obstacle: s.obstacle ?? 'forgetting' })

export const chosenMode = (s: OnboardingState, recommend: (a: OnboardingAnswers) => LearningMode): LearningMode =>
  s.mode ?? recommendedFor(s, recommend)

const REASON_LINES: Record<Reason, string> = {
  work: 'Words from emails, meetings and docs, there when you need them.',
  study: 'Steady, spaced practice is the surest way to be ready on exam day.',
  travel: 'Build the everyday words that make trips easier, a few at a time.',
  everyday: 'Pick up the words you meet in films, articles and conversations.',
  fun: 'No pressure. Keep the words you find interesting.',
}

/** One line of copy tailored to why the user is learning. */
export const reasonLine = (r: Reason | null): string =>
  r ? REASON_LINES[r] : 'A few minutes a day is enough to make new words stick.'
