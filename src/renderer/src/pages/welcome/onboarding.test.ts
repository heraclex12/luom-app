// Onboarding flow: steps advance only when the current question is answered, Back never loses answers,
// and the chosen mode follows the recommendation until the user picks one explicitly.
import { describe, expect, it } from 'vitest'
import type { OnboardingAnswers, LearningMode } from '@/wordbook'
import {
  INITIAL_STATE,
  STEPS,
  back,
  canAdvance,
  chosenMode,
  isLastStep,
  next,
  reasonLine,
  recommendedFor,
  update,
  type OnboardingState,
} from './onboarding'

// Stand-in recommender so the module stays pure (the page passes wordbook.recommendMode).
const recommend = (a: OnboardingAnswers): LearningMode =>
  a.minutes <= 2 ? 'glance' : a.obstacle === 'boredom' ? 'play' : 'standard'

const at = (step: (typeof STEPS)[number], patch: Partial<OnboardingState> = {}): OnboardingState => ({
  ...INITIAL_STATE,
  step: STEPS.indexOf(step),
  ...patch,
})

describe('onboarding steps', () => {
  it('runs welcome → why → time → obstacle → mode → setup', () => {
    expect(STEPS).toEqual(['welcome', 'why', 'time', 'obstacle', 'mode', 'setup'])
    expect(INITIAL_STATE.step).toBe(0)
  })

  it('welcome, mode and setup can always advance; questions need an answer', () => {
    expect(canAdvance(at('welcome'))).toBe(true)
    expect(canAdvance(at('why'))).toBe(false)
    expect(canAdvance(at('why', { reason: 'work' }))).toBe(true)
    expect(canAdvance(at('time'))).toBe(false)
    expect(canAdvance(at('time', { minutes: 5 }))).toBe(true)
    expect(canAdvance(at('obstacle'))).toBe(false)
    expect(canAdvance(at('obstacle', { obstacle: 'boredom' }))).toBe(true)
    expect(canAdvance(at('mode'))).toBe(true)
    expect(canAdvance(at('setup'))).toBe(true)
  })

  it('next moves forward only when allowed and stops at the last step', () => {
    expect(next(at('why')).step).toBe(STEPS.indexOf('why'))
    expect(next(at('why', { reason: 'travel' })).step).toBe(STEPS.indexOf('time'))
    const last = at('setup')
    expect(isLastStep(last)).toBe(true)
    expect(next(last).step).toBe(last.step)
    expect(isLastStep(at('mode'))).toBe(false)
  })

  it('back keeps answers and stops at the first step', () => {
    const s = back(at('obstacle', { reason: 'study', minutes: 10, obstacle: 'forgetting' }))
    expect(s.step).toBe(STEPS.indexOf('time'))
    expect(s).toMatchObject({ reason: 'study', minutes: 10, obstacle: 'forgetting' })
    expect(back(INITIAL_STATE).step).toBe(0)
  })
})

describe('mode choice', () => {
  it('follows the recommendation until a mode is picked', () => {
    const s = at('mode', { minutes: 10, obstacle: 'boredom' })
    expect(recommendedFor(s, recommend)).toBe('play')
    expect(chosenMode(s, recommend)).toBe('play')
    const picked = update(s, { mode: 'focus' })
    expect(chosenMode(picked, recommend)).toBe('focus')
    expect(recommendedFor(picked, recommend)).toBe('play')
  })

  it('changing the time or obstacle answer drops an explicit pick so the new recommendation shows', () => {
    const picked = at('time', { minutes: 10, obstacle: 'boredom', mode: 'focus' })
    expect(update(picked, { minutes: 2 }).mode).toBeNull()
    expect(update(picked, { obstacle: 'forgetting' }).mode).toBeNull()
    // Same value again (re-clicking the selected option) keeps the pick.
    expect(update(picked, { minutes: 10 }).mode).toBe('focus')
    // The reason is informational only.
    expect(update(picked, { reason: 'fun' }).mode).toBe('focus')
  })

  it('unanswered questions fall back to a middle-of-the-road guess', () => {
    expect(recommendedFor(INITIAL_STATE, (a) => (a.minutes === 5 && a.obstacle === 'forgetting' ? 'quick' : 'glance'))).toBe(
      'quick',
    )
  })
})

describe('reasonLine', () => {
  it('personalises the copy for each reason and has a neutral default', () => {
    const lines = (['work', 'study', 'travel', 'everyday', 'fun'] as const).map(reasonLine)
    expect(new Set(lines).size).toBe(5)
    for (const l of lines) expect(l.length).toBeGreaterThan(0)
    expect(reasonLine(null)).toBeTruthy()
  })
})
