// Word garden: each saved word is a plant whose look follows its learning state; positions are stable so a
// plant does not jump around between visits, and a huge list is trimmed to the words that matter most.
import { describe, expect, it } from 'vitest'
import { GARDEN_SPACING, gardenPlants, plantStage, plantVariant, rescueQuestion } from './garden'
import type { WordListItem } from './types'

const DAY = 86_400_000
const now = Date.UTC(2026, 9, 4, 10)
const item = (dictId: number, state: number, due: number | null = null): WordListItem => ({
  dictId,
  term: `w${dictId}`,
  state,
  due,
})

describe('plantStage', () => {
  it('maps the learning state to a growth stage', () => {
    expect(plantStage(item(1, 0), now)).toBe('seed')
    expect(plantStage(item(1, 2, now + 5 * DAY), now)).toBe('sprout')
    expect(plantStage(item(1, 2, now - DAY), now)).toBe('thirsty')
    expect(plantStage(item(1, 4), now)).toBe('bloom')
  })
})

describe('gardenPlants', () => {
  it('places plants on a sunflower spiral, the first one at the centre, spaced apart', () => {
    const plants = gardenPlants([item(3, 0), item(1, 2, now + DAY), item(2, 4)], now)
    expect(plants.map((p) => p.dictId)).toEqual([1, 2, 3]) // by when they were added (dictId order)
    expect(plants[0].x).toBeCloseTo(0)
    expect(plants[0].z).toBeCloseTo(0)
    for (let i = 0; i < plants.length; i++)
      for (let j = i + 1; j < plants.length; j++) {
        const d = Math.hypot(plants[i].x - plants[j].x, plants[i].z - plants[j].z)
        expect(d).toBeGreaterThan(GARDEN_SPACING * 0.8)
      }
  })
  it('keeps a plant in the same place when newer words are added', () => {
    const before = gardenPlants([item(1, 2, now + DAY), item(2, 0)], now)
    const after = gardenPlants([item(1, 2, now + DAY), item(2, 0), item(9, 0)], now)
    expect(after[1]).toMatchObject({ dictId: 2, x: before[1].x, z: before[1].z })
  })
  it('trims a long list: words being learned first, then the newest seeds', () => {
    const items = [...Array.from({ length: 10 }, (_, i) => item(i + 1, 0)), item(50, 2, now - DAY), item(60, 4)]
    const plants = gardenPlants(items, now, 5)
    expect(plants).toHaveLength(5)
    expect(plants.map((p) => p.dictId)).toEqual([8, 9, 10, 50, 60])
  })
  it('skips rows without a term', () => {
    expect(gardenPlants([{ dictId: 1, term: null, state: 0, due: null }], now)).toEqual([])
  })
})

describe('plantVariant', () => {
  it('is deterministic per word and within range', () => {
    const a = plantVariant(42)
    expect(plantVariant(42)).toEqual(a)
    expect(a.turn).toBeGreaterThanOrEqual(0)
    expect(a.turn).toBeLessThan(Math.PI * 2)
    expect(a.scale).toBeGreaterThanOrEqual(0.85)
    expect(a.scale).toBeLessThanOrEqual(1.15)
    expect(a.hue).toBeGreaterThanOrEqual(0)
    expect(a.hue).toBeLessThan(1)
    expect(plantVariant(43)).not.toEqual(a)
  })
})

describe('rescueQuestion', () => {
  const pool = [
    { dictId: 1, term: 'meticulous', meaning: 'tỉ mỉ' },
    { dictId: 2, term: 'reluctant', meaning: 'miễn cưỡng' },
    { dictId: 3, term: 'brisk', meaning: 'nhanh nhẹn' },
    { dictId: 4, term: 'candid', meaning: 'thẳng thắn' },
    { dictId: 5, term: 'Brisk', meaning: 'nhanh' },
  ]
  it('asks for the English word of a meaning, with distinct options including the answer', () => {
    const q = rescueQuestion(pool[0], pool, () => 0.3)
    expect(q.meaning).toBe('tỉ mỉ')
    expect(q.options).toHaveLength(4)
    expect(q.options[q.answer]).toBe('meticulous')
    expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(4)
  })
  it('works with a small pool', () => {
    const q = rescueQuestion(pool[0], pool.slice(0, 2), () => 0.9)
    expect(q.options.sort()).toEqual(['meticulous', 'reluctant'])
  })
})
