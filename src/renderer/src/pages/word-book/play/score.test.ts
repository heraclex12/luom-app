import { describe, expect, it } from 'vitest'
import { scoreGame } from './score'

describe('scoreGame', () => {
  it('10 XP per pair', () => {
    const r = scoreGame({ pairs: 6, mistakes: 3, maxCombo: 1, elapsedMs: 120_000 })
    expect(r.base).toBe(60)
    expect(r.comboBonus).toBe(0)
    expect(r.speedBonus).toBe(0)
    expect(r.perfectBonus).toBe(0)
    expect(r.total).toBe(60)
  })
  it('combo bonus: 5 XP for each match in a streak after the first', () => {
    expect(scoreGame({ pairs: 6, mistakes: 1, maxCombo: 4, elapsedMs: 120_000 }).comboBonus).toBe(15)
  })
  it('speed bonus: 2 XP per whole second under 5 s/pair, capped at 20', () => {
    // budget 30 s, took 25.5 s → 4 whole seconds → 8 XP
    expect(scoreGame({ pairs: 6, mistakes: 1, maxCombo: 1, elapsedMs: 25_500 }).speedBonus).toBe(8)
    expect(scoreGame({ pairs: 6, mistakes: 1, maxCombo: 1, elapsedMs: 1_000 }).speedBonus).toBe(20)
    expect(scoreGame({ pairs: 6, mistakes: 1, maxCombo: 1, elapsedMs: 40_000 }).speedBonus).toBe(0)
  })
  it('perfect bonus of 10 XP with no mistakes', () => {
    const r = scoreGame({ pairs: 4, mistakes: 0, maxCombo: 4, elapsedMs: 60_000 })
    expect(r.perfectBonus).toBe(10)
    expect(r.total).toBe(40 + 15 + 10)
  })
  it('accuracy = pairs / attempts, as a whole percent', () => {
    expect(scoreGame({ pairs: 6, mistakes: 0, maxCombo: 6, elapsedMs: 60_000 }).accuracy).toBe(100)
    expect(scoreGame({ pairs: 6, mistakes: 3, maxCombo: 1, elapsedMs: 60_000 }).accuracy).toBe(67)
  })
  it('handles an empty game', () => {
    expect(scoreGame({ pairs: 0, mistakes: 0, maxCombo: 0, elapsedMs: 0 })).toEqual({
      base: 0,
      comboBonus: 0,
      speedBonus: 0,
      perfectBonus: 0,
      total: 0,
      accuracy: 0,
    })
  })
})
