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
    expect(gardenWorld(99).tier).toBe(7)
    expect(gardenWorld(100)).toMatchObject({ tier: 8, name: 'Sky kingdom', islands: ['castle'] })
    expect(gardenWorld(110)).toMatchObject({ tier: 9, islands: ['castle', 'terraces'] })
    expect(gardenWorld(999).tier).toBe(GARDEN_TIERS.length - 1)
    expect(gardenWorld(999).islands).toHaveLength(8)
  })
  it('keeps everything from the worlds before', () => {
    const pond = gardenWorld(50)
    expect(pond.decor.cottage).toBe(1)
    expect(pond.decor.pond).toBe(1)
    expect(pond.critters.butterfly).toBeGreaterThan(0)
    expect(pond.critters.duck).toBe(2)
    expect(gardenWorld(100).flowers).toHaveLength(8)
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
    expect(nextGardenTier(50)?.level).toBe(60)
    expect(nextGardenTier(95)).toMatchObject({ level: 100, name: 'Sky kingdom' })
    expect(nextGardenTier(100)).toMatchObject({ level: 110, name: 'Sa Pa terraces', island: 'terraces' })
    expect(nextGardenTier(170)).toBeNull()
  })
})

describe('flowerFor', () => {
  const ids = Array.from({ length: 400 }, (_, i) => i + 1)
  it('is stable for a word and uses only unlocked flowers', () => {
    const flowers = gardenWorld(60).flowers
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
    expect(l.islets).toEqual([])
  })
  it('a seed patch makes room round the plants for visitors and trophies', () => {
    const l = gardenLayout(20, gardenWorld(1), { visitors: ['hedgehog'], trophies: ['list:1'] })
    expect(l.radius).toBeGreaterThan(gardenRadius(20))
    expect(l.items.map((it) => [it.kind, it.reveal, it.ref])).toEqual(
      expect.arrayContaining([
        ['hedgehog', 'visitor:hedgehog', undefined],
        ['trophy', 'trophy:list:1', 'list:1'],
      ]),
    )
  })

  const extras = {
    visitors: ['hedgehog', 'fox', 'owl', 'peacock', 'turtle', 'dragon'] as const,
    trophies: Array.from({ length: 12 }, (_, i) => `list:${i}`),
  }
  for (const plants of [1, 12, 60, 160])
    for (const level of GARDEN_TIERS.slice(1).map((t) => t.level))
      it(`level ${level}, ${plants} plants: everything fits around the plants without overlapping`, () => {
        const world = gardenWorld(level)
        const l = gardenLayout(plants, world, extras)
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
        // Every visitor that walks (the dragon flies) and every trophy has a spot.
        for (const v of ['hedgehog', 'fox', 'owl', 'peacock', 'turtle'] as const) expect(count(v)).toBe(1)
        expect(l.items.some((it) => (it.kind as string) === 'dragon')).toBe(false)
        expect(count('trophy')).toBe(12)
        // Islands float clear of the garden and of each other.
        for (const a of l.islets) expect(Math.hypot(a.x, a.z) - a.radius).toBeGreaterThan(l.radius)
        for (let i = 0; i < l.islets.length; i++)
          for (let j = i + 1; j < l.islets.length; j++)
            expect(dist(l.islets[i], l.islets[j])).toBeGreaterThan(l.islets[i].radius + l.islets[j].radius + 0.3)
      })

  it('is the same every time (things keep their place)', () => {
    expect(gardenLayout(40, gardenWorld(80))).toEqual(gardenLayout(40, gardenWorld(80)))
  })
  it('the fence goes round the plants, and the cottage door faces its gate', () => {
    const l = gardenLayout(30, gardenWorld(25))
    expect(l.fence?.radius).toBeGreaterThan(gardenRadius(30) - 0.3)
    const cottage = l.items.find((it) => it.kind === 'cottage')!
    expect(Math.atan2(cottage.z, cottage.x)).toBeCloseTo(l.fence!.gate)
  })
  it('the sky kingdom adds a castle island beside the garden', () => {
    const l = gardenLayout(30, gardenWorld(100))
    expect(l.islets.map((i) => i.kind)).toEqual(['castle'])
    expect(l.extent).toBeGreaterThan(l.radius)
  })
  it('then a new island every 10 levels', () => {
    expect(gardenLayout(30, gardenWorld(130)).islets.map((i) => [i.kind, i.tier])).toEqual([
      ['castle', 8],
      ['terraces', 9],
      ['halong', 10],
      ['hoian', 11],
    ])
  })
  it('things carry the key that grows them in when they arrive', () => {
    const l = gardenLayout(30, gardenWorld(50))
    expect(l.items.find((it) => it.kind === 'pond')?.reveal).toBe('tier:3')
    expect(l.items.find((it) => it.kind === 'cottage')?.reveal).toBe('tier:2')
  })
})
