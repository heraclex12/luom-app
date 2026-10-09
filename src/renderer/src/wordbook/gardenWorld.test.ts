// Garden worlds: the garden grows with the learner's level (bigger island, a cottage, a pond, a wood, a village…).
import { describe, expect, it } from 'vitest'
import { gardenRadius } from './garden'
import {
  GARDEN_TIERS,
  flowerFor,
  gardenLayout,
  gardenWorld,
  nextGardenTier,
  type DecorItem,
} from './gardenWorld'

describe('gardenWorld', () => {
  it('starts as a seed patch and grows at set levels', () => {
    expect(gardenWorld(1)).toMatchObject({ tier: 0, name: 'Seed patch', flowers: ['daisy'] })
    expect(gardenWorld(9).tier).toBe(0)
    expect(gardenWorld(10)).toMatchObject({ tier: 1, name: 'Flower bed', flowers: ['daisy', 'tulip'] })
    expect(gardenWorld(24).name).toBe('Flower bed')
    expect(gardenWorld(25).name).toBe('Cottage garden')
    expect(gardenWorld(50).name).toBe('Pond garden')
    expect(gardenWorld(199).tier).toBe(GARDEN_TIERS.length - 2)
    expect(gardenWorld(200).tier).toBe(GARDEN_TIERS.length - 1)
    expect(gardenWorld(999).tier).toBe(GARDEN_TIERS.length - 1)
  })
  it('keeps everything from the worlds before', () => {
    const pond = gardenWorld(50)
    expect(pond.decor.cottage).toBe(1)
    expect(pond.decor.pond).toBe(1)
    expect(pond.critters.butterfly).toBeGreaterThan(0)
    expect(pond.critters.duck).toBe(2)
    expect(gardenWorld(200).flowers).toHaveLength(8)
  })
  it('tiers are in level order, each a step up', () => {
    const levels = GARDEN_TIERS.map((t) => t.level)
    expect(levels[0]).toBe(1)
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    expect(new Set(levels).size).toBe(levels.length)
  })
})

describe('nextGardenTier', () => {
  it('says what the next world brings and at which level', () => {
    expect(nextGardenTier(1)).toMatchObject({ level: 10, name: 'Flower bed' })
    expect(nextGardenTier(10)).toMatchObject({ level: 25, name: 'Cottage garden' })
    expect(nextGardenTier(25)?.level).toBe(50)
    expect(nextGardenTier(200)).toBeNull()
  })
})

describe('flowerFor', () => {
  const ids = Array.from({ length: 400 }, (_, i) => i + 1)
  it('is stable for a word and uses only unlocked flowers', () => {
    const flowers = gardenWorld(75).flowers
    for (const id of ids.slice(0, 50)) {
      expect(flowers).toContain(flowerFor(id, flowers))
      expect(flowerFor(id, flowers)).toBe(flowerFor(id, flowers))
    }
  })
  it('a newly unlocked flower takes over some blooms; the others keep their look', () => {
    const before = gardenWorld(10).flowers
    const after = gardenWorld(25).flowers
    let changed = 0
    for (const id of ids) {
      const a = flowerFor(id, before)
      const b = flowerFor(id, after)
      if (a !== b) {
        changed++
        expect(b).toBe('sunflower')
      }
    }
    // About a third of the blooms become the new flower.
    expect(changed).toBeGreaterThan(80)
    expect(changed).toBeLessThan(200)
  })
})

describe('gardenLayout', () => {
  const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z)

  it('a seed patch is just the plants (today’s island)', () => {
    const l = gardenLayout(20, gardenWorld(1))
    expect(l.radius).toBeCloseTo(gardenRadius(20))
    expect(l.items).toEqual([])
    expect(l.fence).toBeNull()
    expect(l.islet).toBeNull()
  })

  for (const plants of [1, 12, 60, 160])
    for (const level of GARDEN_TIERS.slice(1).map((t) => t.level))
      it(`level ${level}, ${plants} plants: everything fits around the plants without overlapping`, () => {
        const world = gardenWorld(level)
        const l = gardenLayout(plants, world)
        const inner = gardenRadius(plants)
        expect(l.radius).toBeGreaterThan(inner)
        for (const it of l.items) {
          const r = Math.hypot(it.x, it.z)
          expect(r + it.size).toBeLessThanOrEqual(l.radius + 1e-9)
          expect(r - it.size).toBeGreaterThanOrEqual(inner - 0.3 - 1e-9)
        }
        const solid = l.items.filter((it) => it.kind !== 'stone')
        for (let i = 0; i < solid.length; i++)
          for (let j = i + 1; j < solid.length; j++)
            expect(dist(solid[i], solid[j])).toBeGreaterThanOrEqual(solid[i].size + solid[j].size - 1e-9)
        // Landmarks always make it in.
        const count = (k: DecorItem['kind']): number => l.items.filter((it) => it.kind === k).length
        for (const k of ['cottage', 'pond', 'windmill', 'clocktower', 'well'] as const)
          if (world.decor[k]) expect(count(k)).toBe(world.decor[k])
        expect(l.items.every((it) => it.tier <= world.tier)).toBe(true)
      })

  it('is the same every time (things keep their place)', () => {
    expect(gardenLayout(40, gardenWorld(125))).toEqual(gardenLayout(40, gardenWorld(125)))
  })
  it('the fence goes round the plants, and the cottage door faces its gate', () => {
    const l = gardenLayout(30, gardenWorld(25))
    expect(l.fence?.radius).toBeGreaterThan(gardenRadius(30) - 0.3)
    const cottage = l.items.find((it) => it.kind === 'cottage')!
    expect(Math.atan2(cottage.z, cottage.x)).toBeCloseTo(l.fence!.gate)
  })
  it('the sky kingdom adds a castle island beside the garden', () => {
    const l = gardenLayout(30, gardenWorld(200))
    expect(l.islet).not.toBeNull()
    expect(Math.hypot(l.islet!.x, l.islet!.z) - l.islet!.radius).toBeGreaterThan(l.radius)
    expect(l.extent).toBeGreaterThan(l.radius)
  })
})
