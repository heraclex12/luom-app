// Learning modes: each mode is a preset (reminders, daily goal, how cards are practised). Why it matters —
// lazy learners must never be forced to type, hard workers must produce words (typing), new words are always
// shown before being tested, and onboarding answers map to a sensible mode.
import { describe, expect, it } from 'vitest'
import { exerciseFor, LEARNING_MODES, modePreset, recommendMode } from './modes'

describe('learning modes', () => {
  it('defines the five modes with presets', () => {
    expect(LEARNING_MODES.map((m) => m.id)).toEqual(['glance', 'quick', 'standard', 'focus', 'play'])
    expect(modePreset('glance')).toMatchObject({ flashIntervalHours: 1, reminderIntensity: 'gentle' })
    expect(modePreset('focus')).toMatchObject({ reminderIntensity: 'persistent' })
    expect(modePreset('quick').dailyGoal).toBeLessThan(modePreset('focus').dailyGoal)
  })
})

describe('exerciseFor', () => {
  const review = { kind: 'review' as const, reps: 4 }
  const fresh = { kind: 'new' as const, reps: 0 }

  it('glance and standard use flip cards', () => {
    expect(exerciseFor('glance', review, 0)).toBe('flip')
    expect(exerciseFor('standard', review, 3)).toBe('flip')
  })
  it('quick and play use multiple choice once a word has been seen', () => {
    expect(exerciseFor('quick', review, 0)).toBe('choice')
    expect(exerciseFor('play', review, 1)).toBe('choice')
  })
  it('new words are always introduced with a flip card first', () => {
    for (const mode of ['quick', 'focus', 'play'] as const) expect(exerciseFor(mode, fresh, 0)).toBe('flip')
  })
  it('focus rotates productive exercises: type, listen, cloze', () => {
    expect([0, 1, 2, 3].map((i) => exerciseFor('focus', review, i))).toEqual(['type', 'listen', 'cloze', 'type'])
  })
  it('cloze falls back to typing when the word has no example sentence', () => {
    expect(exerciseFor('focus', { ...review, hasExample: false }, 2)).toBe('type')
  })
})

describe('recommendMode', () => {
  it('maps onboarding answers to a mode', () => {
    expect(recommendMode({ minutes: 2, obstacle: 'no-time' })).toBe('glance')
    expect(recommendMode({ minutes: 5, obstacle: 'no-time' })).toBe('quick')
    expect(recommendMode({ minutes: 10, obstacle: 'boredom' })).toBe('play')
    expect(recommendMode({ minutes: 20, obstacle: 'forgetting' })).toBe('focus')
    expect(recommendMode({ minutes: 10, obstacle: 'forgetting' })).toBe('standard')
    expect(recommendMode({ minutes: 2, obstacle: 'laziness' })).toBe('glance')
  })
})
