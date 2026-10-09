// Garden worlds (pure): the garden grows with the learner's level. At set levels (10, 25, 50, then every 10 up to
// 100: a long road on purpose, months to a few years) it becomes a new world that reshapes the land: a fence and
// flower patches, a cottage down a dirt path, a pond, a wood, a cobbled road lined with houses, a river pouring off
// the edge, fields, a paved plaza and town walls. And every level in between, the island widens a little and the next
// few things of that world move in, so every level up shows. After level 100 a new floating island comes every 10
// levels. Each world unlocks a new kind of flower for mastered words too. Visitors (best streak) and trophies (word
// lists, collections) find a spot as well (see ./gardenRewards). Drawn by components/garden/ (gardenScene.ts + friends).
import { gardenRadius, plantVariant } from './garden'
import type { VisitorKind } from './gardenRewards'

export type FlowerKind = 'daisy' | 'tulip' | 'sunflower' | 'lavender' | 'bluebell' | 'rose' | 'poppy' | 'lily'

/** Things that stand on the island (some of them move a little: rabbits hop, the windmill turns, deer graze). */
export type DecorKind =
  | 'patch'
  | 'bush'
  | 'cottage'
  | 'bench'
  | 'mailbox'
  | 'crops'
  | 'pond'
  | 'tree'
  | 'pine'
  | 'mushroom'
  | 'rabbit'
  | 'house'
  | 'windmill'
  | 'lamp'
  | 'cat'
  | 'field'
  | 'blossom'
  | 'deer'
  | 'well'
  | 'clocktower'
  | 'stall'
  // Rewards: a trophy per word list / collection, and the streak visitors that walk (the dragon flies).
  | 'trophy'
  | 'hedgehog'
  | 'fox'
  | 'owl'
  | 'peacock'
  | 'turtle'

/** Things that fly or swim around (not placed: they wander). */
export type CritterKind = 'butterfly' | 'bee' | 'duck' | 'frog' | 'bird' | 'balloon'

/** Floating islands round the garden from level 100 on. */
export type IslandKind = 'castle' | 'terraces' | 'halong' | 'hoian' | 'lotus' | 'bamboo' | 'snow' | 'beach'

export interface GardenTier {
  /** Level that unlocks it. */
  level: number
  name: string
  /** What it brings (one sentence, UI copy). */
  adds: string
  flower?: FlowerKind
  /** Landmarks: arrive with the world. */
  decor: Partial<Record<DecorKind, number>>
  /**
   * What keeps moving in through this world: `start` things on arrival, then `perLevel` more every level, taken in
   * turn from `cycle` (repeated).
   */
  grow?: { cycle: readonly DecorKind[]; start: number; perLevel: number }
  critters: Partial<Record<CritterKind, number>>
  /** Ground round the plants on arrival (scene units); it widens towards the next world's as levels pass. */
  ring: number
  /** A floating island it adds beside the garden. */
  island?: IslandKind
}

export const GARDEN_TIERS: readonly GardenTier[] = [
  {
    level: 1,
    name: 'Seed patch',
    adds: 'Your first plants on a little island.',
    flower: 'daisy',
    decor: {},
    grow: { cycle: ['patch', 'mushroom', 'patch'], start: 1, perLevel: 1 },
    critters: {},
    ring: 0.55,
  },
  {
    level: 10,
    name: 'Flower bed',
    adds: 'A white fence with a gate, flower patches and bushes that spread every level, tulips and butterflies.',
    flower: 'tulip',
    decor: {},
    grow: { cycle: ['patch', 'bush', 'patch', 'bush', 'patch'], start: 6, perLevel: 1 },
    critters: { butterfly: 4 },
    ring: 1.45,
  },
  {
    level: 25,
    name: 'Cottage garden',
    adds: 'A cottage down a dirt path, a bench, a mailbox, vegetable beds and fruit trees, sunflowers and bees.',
    flower: 'sunflower',
    decor: { cottage: 1, bench: 1, mailbox: 1 },
    grow: { cycle: ['crops', 'tree', 'patch', 'bush', 'patch'], start: 4, perLevel: 1 },
    critters: { bee: 4 },
    ring: 2.6,
  },
  {
    level: 50,
    name: 'Pond garden',
    adds: 'A big pond with lily pads, ducks and a frog, more trees every level, and lavender.',
    flower: 'lavender',
    decor: { pond: 1 },
    grow: { cycle: ['tree', 'bush', 'tree', 'patch'], start: 4, perLevel: 2 },
    critters: { duck: 3, frog: 1 },
    ring: 3.1,
  },
  {
    level: 60,
    name: 'Little wood',
    adds: 'A wood that grows thicker every level, mushrooms, rabbits, birds and bluebells.',
    flower: 'bluebell',
    decor: { rabbit: 2 },
    grow: { cycle: ['tree', 'pine', 'mushroom', 'pine', 'tree', 'pine'], start: 10, perLevel: 3 },
    critters: { bird: 3 },
    ring: 3.7,
  },
  {
    level: 70,
    name: 'Hamlet',
    adds: 'A cobbled road round the garden, houses along it every level, street lamps, a windmill, a cat and roses.',
    flower: 'rose',
    decor: { windmill: 1, cat: 1 },
    grow: { cycle: ['house', 'lamp', 'lamp', 'house', 'tree'], start: 4, perLevel: 2 },
    critters: {},
    ring: 4.1,
  },
  {
    level: 80,
    name: 'Village',
    adds: 'A river from the pond pouring off the edge, a bridge, fields, more houses, a well, blossom trees, deer and poppies.',
    flower: 'poppy',
    decor: { well: 1, deer: 2 },
    grow: { cycle: ['field', 'house', 'blossom', 'field', 'house', 'tree'], start: 3, perLevel: 2 },
    critters: {},
    ring: 4.5,
  },
  {
    level: 90,
    name: 'Town',
    adds: 'A paved plaza, town walls with towers, a clock tower, a market that grows every level, a balloon and lilies.',
    flower: 'lily',
    decor: { clocktower: 1 },
    grow: { cycle: ['stall', 'house', 'stall', 'lamp'], start: 3, perLevel: 2 },
    critters: { balloon: 1 },
    ring: 5.0,
  },
  {
    level: 100,
    name: 'Sky kingdom',
    adds: 'A castle on its own island, a bridge to it and a rainbow. Seasons and night unlock too.',
    decor: {},
    critters: { balloon: 1 },
    ring: 5.4,
    island: 'castle',
  },
  ...(
    [
      [110, 'Sa Pa terraces', 'terraces', 'Rice terraces stepping up an island, a water buffalo and a farmer in a conical hat.'],
      [120, 'Ha Long Bay', 'halong', 'Limestone peaks rising from green water and a junk boat with red sails.'],
      [130, 'Hoi An lanterns', 'hoian', 'Yellow old-town houses and strings of lanterns that glow at night.'],
      [140, 'Lotus lake', 'lotus', 'Pink lotuses, koi fish and a little wooden pavilion.'],
      [150, 'Bamboo grove', 'bamboo', 'Bamboo swaying in the wind, and pandas having lunch.'],
      [160, 'Snowy peak', 'snow', 'A snowy mountain, a log cabin and penguins sliding about.'],
      [170, 'Tropical beach', 'beach', 'Palm trees, sea turtles and a lighthouse.'],
    ] as const
  ).map(([level, name, island, adds]) => ({ level, name, island, adds, decor: {}, critters: {}, ring: 5.4 })),
]

/** World index from which each part of the land is there. */
export const FEATURE_TIER = { fence: 1, path: 2, pond: 3, road: 5, river: 6, plaza: 7, wall: 7 } as const

export interface GardenWorld {
  /** Index into GARDEN_TIERS. */
  tier: number
  level: number
  /** How far through this world towards the next (0..1). */
  progress: number
  name: string
  flowers: FlowerKind[]
  /** How many of each thing there is now (landmarks + what has moved in so far). */
  decor: Partial<Record<DecorKind, number>>
  critters: Partial<Record<CritterKind, number>>
  /** Ground round the plants now. */
  ring: number
  /** Floating islands so far, in the order they came. */
  islands: IslandKind[]
}

const tierIndex = (level: number): number => {
  let i = 0
  while (i + 1 < GARDEN_TIERS.length && GARDEN_TIERS[i + 1].level <= level) i++
  return i
}

/** How far `level` is through world `tier` (0 on arrival, approaching 1 just before the next one). */
const progressAt = (tier: number, level: number): number => {
  const next = GARDEN_TIERS[tier + 1]
  if (!next) return 1
  const t = GARDEN_TIERS[tier]
  return Math.min(1, Math.max(0, (level - t.level) / (next.level - t.level)))
}

/** The ground widens through a world, most of the way to the next world's; the rest comes with it. */
const RING_GROWTH = 0.6
const ringAt = (level: number): number => {
  const tier = tierIndex(level)
  const t = GARDEN_TIERS[tier]
  const next = GARDEN_TIERS[tier + 1]
  return next ? t.ring + (next.ring - t.ring) * progressAt(tier, level) * RING_GROWTH : t.ring
}

/** Things a world's growth has brought by `level` (each with the level it arrived at). */
function grown(tier: number, level: number): { kind: DecorKind; arrive: number }[] {
  const t = GARDEN_TIERS[tier]
  if (!t.grow) return []
  const next = GARDEN_TIERS[tier + 1]
  const last = Math.min(level, next ? next.level - 1 : level)
  const out: { kind: DecorKind; arrive: number }[] = []
  for (let l = t.level; l <= last; l++) {
    const count = l === t.level ? t.grow.start : t.grow.perLevel
    for (let k = 0; k < count; k++) out.push({ kind: t.grow.cycle[out.length % t.grow.cycle.length], arrive: l })
  }
  return out
}

export function gardenWorld(level: number): GardenWorld {
  const tier = tierIndex(level)
  const decor: Partial<Record<DecorKind, number>> = {}
  const critters: Partial<Record<CritterKind, number>> = {}
  const flowers: FlowerKind[] = []
  const add = (k: DecorKind, n: number): void => void (decor[k] = (decor[k] ?? 0) + n)
  GARDEN_TIERS.slice(0, tier + 1).forEach((t, i) => {
    if (t.flower) flowers.push(t.flower)
    for (const [k, n] of Object.entries(t.decor)) add(k as DecorKind, n)
    for (const [k, n] of Object.entries(t.critters)) critters[k as CritterKind] = (critters[k as CritterKind] ?? 0) + n
    for (const g of grown(i, level)) add(g.kind, 1)
  })
  const t = GARDEN_TIERS[tier]
  const islands = GARDEN_TIERS.slice(0, tier + 1).flatMap((x) => (x.island ? [x.island] : []))
  return { tier, level, progress: progressAt(tier, level), name: t.name, flowers, decor, critters, ring: ringAt(level), islands }
}

/** The next world: its level, name and what it brings (null at the last one). */
export function nextGardenTier(level: number): GardenTier | null {
  return GARDEN_TIERS[tierIndex(level) + 1] ?? null
}

/** Stable hash of (word, flower) in [0, 1). */
const score = (dictId: number, flower: FlowerKind): number => {
  let h = 0
  for (const ch of flower) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0
  return plantVariant(dictId * 31 + (h % 1_000_003)).hue
}

/**
 * Which flower a mastered word grows into, among the unlocked ones. Highest score wins (rendezvous hashing), so a
 * newly unlocked flower takes over about its share of blooms and every other bloom keeps its look.
 */
export function flowerFor(dictId: number, flowers: readonly FlowerKind[]): FlowerKind {
  let best = flowers[0] ?? 'daisy'
  let top = -1
  for (const f of flowers) {
    const s = score(dictId, f)
    if (s > top) {
      top = s
      best = f
    }
  }
  return best
}

export interface DecorItem {
  kind: DecorKind
  x: number
  z: number
  /** Rotation about y (radians): the front faces the middle of the garden. */
  turn: number
  /** Footprint radius (nothing else stands within it). */
  size: number
  /** World that brought it (0 for rewards). */
  tier: number
  /** What makes it grow in when it arrives: `tier:N`, `level:N`, `visitor:fox`, `trophy:list:3` (see gardenNews). */
  reveal: string
  /** Trophies: the trophy key (for its name on hover). */
  ref?: string
  /** 0..1, for small differences (colours, heights). */
  seed: number
}

export interface Islet {
  kind: IslandKind
  x: number
  z: number
  radius: number
  /** Height above (or below) the garden. */
  lift: number
  tier: number
}

export interface GardenLayout {
  /** Island radius. */
  radius: number
  /** Fence round the plants with a gate at angle `gate` (radians, from +x towards +z). */
  fence: { radius: number; gate: number } | null
  /** Dirt path from the gate out to the cottage door (from / to = distances from the centre). */
  path: { angle: number; from: number; to: number } | null
  /** Cobbled road round the garden. */
  road: { radius: number; width: number } | null
  /** River from the pond to the edge, where it pours off as a waterfall. */
  river: { angle: number; from: number; to: number; width: number } | null
  /** Paved plaza between the fence and the road. */
  plaza: { inner: number; outer: number } | null
  /** Town wall along the edge. */
  wall: { radius: number } | null
  items: DecorItem[]
  /** Floating islands round the garden (castle first), each linked by a bridge. */
  islets: Islet[]
  /** Distance from the centre to the farthest ground (camera framing). */
  extent: number
}

const SIZE: Record<DecorKind, number> = {
  patch: 0.2,
  bush: 0.22,
  cottage: 0.7,
  bench: 0.3,
  mailbox: 0.14,
  crops: 0.36,
  pond: 0.85,
  tree: 0.36,
  pine: 0.28,
  mushroom: 0.12,
  rabbit: 0.24,
  house: 0.5,
  windmill: 0.55,
  lamp: 0.1,
  cat: 0.16,
  field: 0.5,
  blossom: 0.4,
  deer: 0.3,
  well: 0.3,
  clocktower: 0.6,
  stall: 0.38,
  trophy: 0.2,
  hedgehog: 0.25,
  fox: 0.35,
  owl: 0.18,
  peacock: 0.35,
  turtle: 0.3,
}

/** Small things that may sit where a road, plaza or river comes later (they make way when it does). */
const TRANSIENT = new Set<DecorKind>(['patch', 'mushroom'])

/** Gate (and cottage) direction: behind the plants as the garden first appears, so the cottage frames them. */
const GATE = -Math.PI / 2 + 0.1
/** The pond and its river, off to one side. */
const RIVER = GATE + 2.4
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
/** Gap between neighbours. */
const CLEAR = 0.05
/** Bands from the plants' edge: plaza 0–0.42, road 0.42–0.78; houses line the road beyond. */
const PLAZA_OUT = 0.42
const ROAD_IN = 0.42
const ROAD_OUT = 0.78
const RIVER_WIDTH = 0.45
/** Kept free along the edge for the town wall. */
const WALL_BAND = 0.3

/** Heights of the islands, in the order they come (some above the garden, some below: never all in a row). */
const ISLET_LIFT = [0.7, -0.9, 0.4, -0.6, 1.0, -1.1, 0.2, -0.4]
const ISLET_RADIUS = 1.3

const faceCentre = (x: number, z: number): number => Math.atan2(-x, -z)

/**
 * Where everything stands, for `plantCount` plants in `world`: the plants keep the middle (gardenRadius), the fence
 * goes round them, the cottage faces the gate down a path, houses and stalls line the road, lamps stand along it, the
 * pond sits where its river will run, and the rest spreads over the ring. Things are placed in the order they arrived,
 * each on the ground there was when it came, so nothing already there moves as levels pass. Visitors and trophies
 * come last (they never push the world about).
 */
export function gardenLayout(
  plantCount: number,
  world: GardenWorld,
  extras: { visitors?: readonly VisitorKind[]; trophies?: readonly string[] } = {},
): GardenLayout {
  const visitors = (extras.visitors ?? []).filter((v): v is Exclude<VisitorKind, 'dragon'> => v !== 'dragon')
  const trophies = extras.trophies ?? []
  const inner = gardenRadius(plantCount)
  const has = (f: keyof typeof FEATURE_TIER): boolean => world.tier >= FEATURE_TIER[f]
  // Visitors and trophies need ground round the plants even on the first island.
  const radius = inner + Math.max(world.ring, visitors.length || trophies.length ? 1.25 : 0)
  const groundAt = (level: number): number => inner + ringAt(level)

  const cottageR = inner + ROAD_OUT + CLEAR + SIZE.cottage + 0.02
  const houseR = inner + ROAD_OUT + CLEAR + SIZE.house
  const pondR = inner + ROAD_OUT + CLEAR + SIZE.pond
  const riverDir = { x: Math.cos(RIVER), z: Math.sin(RIVER) }
  /** Distance from (x, z) to the river's course (from the pond outwards). */
  const riverGap = (x: number, z: number): number =>
    x * riverDir.x + z * riverDir.z < pondR ? Infinity : Math.abs(-x * riverDir.z + z * riverDir.x)

  const pondX = pondR * riverDir.x
  const pondZ = pondR * riverDir.z
  const cottageX = cottageR * Math.cos(GATE)
  const cottageZ = cottageR * Math.sin(GATE)
  /** Spots kept for the cottage and the pond from the start (they come later). */
  const reserved = (x: number, z: number, size: number): boolean =>
    Math.hypot(x - cottageX, z - cottageZ) < SIZE.cottage + size + CLEAR || Math.hypot(x - pondX, z - pondZ) < SIZE.pond + size + CLEAR

  const items: DecorItem[] = []
  const free = (x: number, z: number, size: number): boolean => items.every((o) => Math.hypot(o.x - x, o.z - z) >= o.size + size)
  const put = (kind: DecorKind, x: number, z: number, tier: number, reveal: string, seed: number, ref?: string): void => {
    items.push({ kind, x, z, turn: faceCentre(x, z), size: SIZE[kind], tier, reveal, ...(ref ? { ref } : {}), seed })
  }

  // Everything the worlds so far bring, in the order it arrived (landmarks first in their world, big before small).
  const queue: { kind: DecorKind; n: number; tier: number; arrive: number }[] = []
  const seen: Partial<Record<DecorKind, number>> = {}
  const next = (k: DecorKind): number => (seen[k] = (seen[k] ?? 0) + 1) - 1
  GARDEN_TIERS.slice(0, world.tier + 1).forEach((t, tier) => {
    for (const [kind, count] of Object.entries(t.decor) as [DecorKind, number][])
      for (let i = 0; i < count; i++) queue.push({ kind, n: next(kind), tier, arrive: t.level - 0.5 })
    for (const g of grown(tier, world.level)) queue.push({ kind: g.kind, n: next(g.kind), tier, arrive: g.arrive })
  })
  queue.sort((a, b) => a.arrive - b.arrive || SIZE[b.kind] - SIZE[a.kind] || a.kind.localeCompare(b.kind) || a.n - b.n)

  for (const { kind, n, tier, arrive } of queue) {
    const size = SIZE[kind]
    const outer = groundAt(Math.ceil(arrive))
    const reveal = arrive % 1 || arrive === GARDEN_TIERS[tier].level ? `tier:${tier}` : `level:${arrive}`
    const seed = plantVariant(n * 13 + kind.length * 101).hue
    if (kind === 'cottage') {
      put(kind, cottageX, cottageZ, tier, reveal, 0.5)
      continue
    }
    if (kind === 'pond') {
      put(kind, pondX, pondZ, tier, reveal, 0.5)
      continue
    }
    const transient = TRANSIENT.has(kind)
    /** k-th spot to try: houses and stalls line the road (two rows), lamps its inner edge, the rest the ring. */
    const spot = (k: number): [number, number] | null => {
      if (kind === 'house' || kind === 'stall') {
        if (k >= 240) return null
        return [GATE + 0.55 + ((k * 0.618034) % 1) * Math.PI * 2, houseR + Math.floor(k / 120) * (SIZE.house * 2 + 0.25)]
      }
      if (kind === 'lamp') {
        if (k >= 48) return null
        return [GATE + Math.PI / 24 + ((k * 7) % 24) * (Math.PI / 12) + Math.floor(k / 24) * (Math.PI / 24), inner + ROAD_IN - 0.12]
      }
      if (k >= 900) return null
      const lo = (transient ? inner + CLEAR : inner + ROAD_OUT + CLEAR) + size
      const hi = outer - size - (transient ? 0 : WALL_BAND)
      if (hi < lo) return null
      return [GATE + 0.9 + (k + n * 7) * GOLDEN_ANGLE + kind.length, lo + ((k * 0.618034 + n * 0.37) % 1) * (hi - lo)]
    }
    for (let k = 0; ; k++) {
      const s = spot(k)
      if (!s) break
      const x = s[1] * Math.cos(s[0])
      const z = s[1] * Math.sin(s[0])
      if (s[1] + size > outer - (transient ? 0 : WALL_BAND)) continue
      if (!transient && kind !== 'lamp' && riverGap(x, z) < RIVER_WIDTH / 2 + size + CLEAR) continue
      if (!transient && reserved(x, z, size)) continue
      if (!free(x, z, size)) continue
      put(kind, x, z, tier, reveal, seed)
      break
    }
  }

  // Small things make way for the cottage and its path, the pond, road, plaza, river and wall once they are there.
  const kept = items.filter((it) => {
    if (!TRANSIENT.has(it.kind)) return true
    const r = Math.hypot(it.x, it.z)
    const along = it.x * Math.cos(GATE) + it.z * Math.sin(GATE)
    const across = Math.abs(-it.x * Math.sin(GATE) + it.z * Math.cos(GATE))
    if (has('path') && along > 0 && along < cottageR && across < it.size + 0.2) return false
    if (has('path') && Math.hypot(it.x - cottageX, it.z - cottageZ) < SIZE.cottage + it.size) return false
    if (has('pond') && Math.hypot(it.x - pondX, it.z - pondZ) < SIZE.pond + it.size) return false
    if (has('road') && r - it.size < inner + ROAD_OUT && r + it.size > inner + ROAD_IN) return false
    if (has('plaza') && r - it.size < inner + PLAZA_OUT) return false
    if (has('river') && riverGap(it.x, it.z) < RIVER_WIDTH / 2 + it.size) return false
    if (has('wall') && r + it.size > radius - WALL_BAND) return false
    return true
  })
  items.length = 0
  items.push(...kept)

  // Visitors and trophies: wherever there is room now.
  const rewards: { kind: DecorKind; reveal: string; ref?: string; n: number }[] = [
    ...visitors.map((v) => ({ kind: v, reveal: `visitor:${v}`, n: 0 })),
    ...trophies.slice(0, 24).map((key, n) => ({ kind: 'trophy' as const, reveal: `trophy:${key}`, ref: key, n })),
  ]
  for (const { kind, reveal, ref, n } of rewards) {
    const size = SIZE[kind]
    const lo = inner + (has('road') ? ROAD_OUT : 0) + CLEAR + size
    const hi = radius - size - (has('wall') ? WALL_BAND : 0)
    if (hi < lo) continue
    for (let k = 0; k < 1500; k++) {
      const a = GATE + 0.4 + (k + n * 5) * GOLDEN_ANGLE + kind.length
      const r = lo + ((k * 0.618034 + n * 0.29) % 1) * (hi - lo)
      const x = r * Math.cos(a)
      const z = r * Math.sin(a)
      if (has('river') && riverGap(x, z) < RIVER_WIDTH / 2 + size + CLEAR) continue
      if (has('pond') && Math.hypot(x - pondX, z - pondZ) < SIZE.pond + size) continue
      if (free(x, z, size)) {
        put(kind, x, z, 0, reveal, plantVariant(k + n * 3).hue, ref)
        break
      }
    }
  }

  // Islands evenly round the garden, the castle first, beside the cottage.
  const d = radius + 0.9 + ISLET_RADIUS
  const islets: Islet[] = world.islands.map((kind, i) => {
    const a = GATE - 2.1 + (i * Math.PI * 2) / ISLET_LIFT.length
    const tier = GARDEN_TIERS.findIndex((t) => t.island === kind)
    return { kind, x: d * Math.cos(a), z: d * Math.sin(a), radius: ISLET_RADIUS, lift: ISLET_LIFT[i % ISLET_LIFT.length], tier }
  })
  return {
    radius,
    fence: has('fence') ? { radius: inner - 0.15, gate: GATE } : null,
    path: has('path') ? { angle: GATE, from: inner - 0.15, to: cottageR - SIZE.cottage * 0.55 } : null,
    road: has('road') ? { radius: inner + (ROAD_IN + ROAD_OUT) / 2, width: ROAD_OUT - ROAD_IN } : null,
    river: has('river') ? { angle: RIVER, from: pondR + SIZE.pond * 0.75, to: radius + 0.02, width: RIVER_WIDTH } : null,
    plaza: has('plaza') ? { inner: inner - 0.1, outer: inner + PLAZA_OUT } : null,
    wall: has('wall') ? { radius: radius - 0.15 } : null,
    items,
    islets,
    extent: islets.length ? d + ISLET_RADIUS : radius,
  }
}
