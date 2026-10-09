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
    expect(pond.critters.duck).toBe(3)
    expect(gardenWorld(100).flowers).toHaveLength(8)
  })
  it('every level up to 100 brings something new', () => {
    const total = (l: number): number => Object.values(gardenWorld(l).decor).reduce((a, b) => a + b, 0)
    for (let l = 1; l < 99; l++) expect(total(l + 1), `level ${l + 1}`).toBeGreaterThan(total(l))
  })
  it('the island widens level by level, and more when a new world arrives', () => {
    for (let l = 1; l < 100; l++) expect(gardenWorld(l + 1).ring).toBeGreaterThan(gardenWorld(l).ring)
    expect(gardenWorld(25).ring - gardenWorld(24).ring).toBeGreaterThan(0.3)
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
  const key = (it: DecorItem): string => `${it.kind}@${it.x.toFixed(4)},${it.z.toFixed(4)}`

  it('the seed patch: plants, a few flower patches and mushrooms, no fence yet', () => {
    const l = gardenLayout(20, gardenWorld(5))
    expect(l.radius).toBeGreaterThan(gardenRadius(20))
    expect(l.fence).toBeNull()
    expect(l.islets).toEqual([])
    expect(new Set(l.items.map((it) => it.kind))).toEqual(new Set(['patch', 'mushroom']))
  })
  it('makes room round the plants for visitors and trophies', () => {
    const l = gardenLayout(20, gardenWorld(1), { visitors: ['hedgehog'], trophies: ['list:1'] })
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
    for (const level of [...GARDEN_TIERS.map((t) => t.level), 24, 49, 69, 89, 99])
      it(`level ${level}, ${plants} plants: everything fits on the island, clear of the road and river, no overlaps`, () => {
        const world = gardenWorld(level)
        const l = gardenLayout(plants, world, extras)
        const inner = gardenRadius(plants)
        for (const it of l.items) {
          const r = Math.hypot(it.x, it.z)
          expect(r + it.size).toBeLessThanOrEqual(l.radius + 1e-9)
          expect(r - it.size).toBeGreaterThanOrEqual(inner - 1e-9)
          if (l.road && it.kind !== 'lamp') expect(Math.abs(r - l.road.radius)).toBeGreaterThanOrEqual(l.road.width / 2 + it.size - 1e-9)
          if (l.wall) expect(r + it.size).toBeLessThanOrEqual(l.wall.radius - 0.1)
          if (l.river) {
            const along = it.x * Math.cos(l.river.angle) + it.z * Math.sin(l.river.angle)
            const across = Math.abs(-it.x * Math.sin(l.river.angle) + it.z * Math.cos(l.river.angle))
            if (along > l.river.from) expect(across).toBeGreaterThanOrEqual(l.river.width / 2 + it.size - 1e-9)
          }
        }
        for (let i = 0; i < l.items.length; i++)
          for (let j = i + 1; j < l.items.length; j++)
            expect(dist(l.items[i], l.items[j])).toBeGreaterThanOrEqual(l.items[i].size + l.items[j].size - 1e-9)
        const count = (k: DecorItem['kind']): number => l.items.filter((it) => it.kind === k).length
        for (const k of ['cottage', 'pond', 'windmill', 'clocktower', 'well'] as const) if (world.decor[k]) expect(count(k)).toBe(world.decor[k])
        // Most of what the world has finds a spot (a crowded garden may leave a few out).
        const placed = l.items.filter((it) => !it.reveal.startsWith('visitor') && !it.reveal.startsWith('trophy')).length
        const wanted = Object.values(world.decor).reduce((a, b) => a + b, 0)
        // (A one-word garden at town level is too small for it all; nobody gets there with one word.)
        if (plants >= 12) expect(placed).toBeGreaterThanOrEqual(wanted * 0.7)
        for (const v of ['hedgehog', 'fox', 'owl', 'peacock', 'turtle'] as const) expect(count(v)).toBe(1)
        expect(count('trophy')).toBe(12)
        for (const a of l.islets) expect(Math.hypot(a.x, a.z) - a.radius).toBeGreaterThan(l.radius)
      })

  it('nothing already there moves as levels pass', () => {
    for (const plants of [12, 60])
      for (let level = 1; level < 100; level++) {
        const a = gardenLayout(plants, gardenWorld(level)).items
        const b = new Set(gardenLayout(plants, gardenWorld(level + 1)).items.map(key))
        const sameWorld = gardenWorld(level).tier === gardenWorld(level + 1).tier
        // Flower patches and mushrooms make way when a road, pond or plaza arrives; everything else stays put.
        for (const it of a) if (sameWorld || (it.kind !== 'patch' && it.kind !== 'mushroom')) expect(b.has(key(it)), `${key(it)} at ${level + 1}`).toBe(true)
      }
  })
  it('new things carry the key that grows them in when they arrive', () => {
    const l = gardenLayout(30, gardenWorld(50))
    expect(l.items.find((it) => it.kind === 'pond')?.reveal).toBe('tier:3')
    expect(l.items.find((it) => it.kind === 'cottage')?.reveal).toBe('tier:2')
    const l2 = gardenLayout(30, gardenWorld(27))
    expect(l2.items.filter((it) => it.reveal === 'level:27').length).toBe(1)
  })
  it('the land changes with the worlds: path, road, river, plaza and walls', () => {
    const at = (level: number): ReturnType<typeof gardenLayout> => gardenLayout(30, gardenWorld(level))
    expect(at(24).path).toBeNull()
    expect(at(25).path).not.toBeNull()
    expect(at(69).road).toBeNull()
    expect(at(70).road).not.toBeNull()
    expect(at(79).river).toBeNull()
    expect(at(80).river?.to).toBeGreaterThan(at(80).radius)
    expect(at(89).wall).toBeNull()
    expect(at(90)).toMatchObject({ wall: expect.anything(), plaza: expect.anything() })
  })
  it('the fence goes round the plants, and the cottage door faces its gate', () => {
    const l = gardenLayout(30, gardenWorld(25))
    expect(l.fence?.radius).toBeGreaterThan(gardenRadius(30) - 0.3)
    const cottage = l.items.find((it) => it.kind === 'cottage')!
    expect(Math.atan2(cottage.z, cottage.x)).toBeCloseTo(l.fence!.gate)
  })
  it('the sky kingdom adds a castle island, then a new island every 10 levels', () => {
    const l = gardenLayout(30, gardenWorld(100))
    expect(l.islets.map((i) => i.kind)).toEqual(['castle'])
    expect(l.extent).toBeGreaterThan(l.radius)
    expect(gardenLayout(30, gardenWorld(130)).islets.map((i) => [i.kind, i.tier])).toEqual([
      ['castle', 8],
      ['terraces', 9],
      ['halong', 10],
      ['hoian', 11],
    ])
  })
})
