// Garden worlds (pure): the garden grows with the learner's level. At set levels (10, 25, 50, then every 10 up to
// 100: a long road on purpose, months to a few years) the island gets wider and something moves in around the
// plants: a fence and butterflies, a cottage, a pond with ducks, a little wood, a hamlet, a village, a town, and at
// last a castle on its own island; after that a new themed island floats in every 10 levels. Each world also unlocks
// a new kind of flower for mastered words. Visitors (best streak) and trophies (word lists, collections) find a spot
// here too (see ./gardenRewards). Drawn by components/garden/gardenScene.ts (+ gardenDecor.ts, gardenIslands.ts).
import { gardenRadius, plantVariant } from './garden'
import type { VisitorKind } from './gardenRewards'

export type FlowerKind = 'daisy' | 'tulip' | 'sunflower' | 'lavender' | 'bluebell' | 'rose' | 'poppy' | 'lily'

/** Things that stand on the island (some of them move a little: rabbits hop, the windmill turns, deer graze). */
export type DecorKind =
  | 'stone'
  | 'bush'
  | 'cottage'
  | 'bench'
  | 'mailbox'
  | 'pond'
  | 'tree'
  | 'pine'
  | 'mushroom'
  | 'rabbit'
  | 'house'
  | 'windmill'
  | 'lamp'
  | 'cat'
  | 'waterfall'
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

/** Floating islands round the garden from level 100 on. */
export type IslandKind = 'castle' | 'terraces' | 'halong' | 'hoian' | 'lotus' | 'bamboo' | 'snow' | 'beach'

/** Things that fly or swim around (not placed: they wander). */
export type CritterKind = 'butterfly' | 'bee' | 'duck' | 'frog' | 'bird' | 'balloon'

export interface GardenTier {
  /** Level that unlocks it. */
  level: number
  name: string
  /** What it brings (one sentence, UI copy). */
  adds: string
  flower?: FlowerKind
  decor: Partial<Record<DecorKind, number>>
  critters: Partial<Record<CritterKind, number>>
  /** Ground around the plants (scene units). */
  ring: number
  /** A floating island it adds beside the garden. */
  island?: IslandKind
}

export const GARDEN_TIERS: readonly GardenTier[] = [
  { level: 1, name: 'Seed patch', adds: 'Your first plants on a little island.', flower: 'daisy', decor: {}, critters: {}, ring: 0 },
  {
    level: 10,
    name: 'Flower bed',
    adds: 'A fence with a gate, bushes, tulips and butterflies.',
    flower: 'tulip',
    decor: { bush: 4 },
    critters: { butterfly: 3 },
    ring: 0.6,
  },
  {
    level: 25,
    name: 'Cottage garden',
    adds: 'A cottage with a path, a bench and a mailbox, sunflowers and bees.',
    flower: 'sunflower',
    decor: { cottage: 1, bench: 1, mailbox: 1 },
    critters: { bee: 3 },
    ring: 1.85,
  },
  {
    level: 50,
    name: 'Pond garden',
    adds: 'A pond with lily pads, two ducks and a frog, and lavender.',
    flower: 'lavender',
    decor: { pond: 1 },
    critters: { duck: 2, frog: 1 },
    ring: 2.1,
  },
  {
    level: 60,
    name: 'Little wood',
    adds: 'Trees and pines, mushrooms, rabbits, birds overhead and bluebells.',
    flower: 'bluebell',
    decor: { tree: 4, pine: 4, mushroom: 4, rabbit: 2 },
    critters: { bird: 3 },
    ring: 2.5,
  },
  {
    level: 70,
    name: 'Hamlet',
    adds: 'Two more houses, a windmill, street lamps, a cat and roses.',
    flower: 'rose',
    decor: { house: 2, windmill: 1, lamp: 4, cat: 1 },
    critters: {},
    ring: 2.9,
  },
  {
    level: 80,
    name: 'Village',
    adds: 'A waterfall, blossom trees, a well, deer and poppies.',
    flower: 'poppy',
    decor: { waterfall: 1, blossom: 3, well: 1, deer: 2 },
    critters: {},
    ring: 3.2,
  },
  {
    level: 90,
    name: 'Town',
    adds: 'A clock tower, market stalls, a hot-air balloon and lilies.',
    flower: 'lily',
    decor: { clocktower: 1, stall: 3 },
    critters: { balloon: 1 },
    ring: 3.5,
  },
  {
    level: 100,
    name: 'Sky kingdom',
    adds: 'A castle on its own island, a bridge to it and a rainbow. Seasons and night unlock too.',
    decor: {},
    critters: { balloon: 1 },
    ring: 3.5,
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
  ).map(([level, name, island, adds]) => ({ level, name, island, adds, decor: {}, critters: {}, ring: 3.5 })),
]

export interface GardenWorld {
  /** Index into GARDEN_TIERS. */
  tier: number
  name: string
  flowers: FlowerKind[]
  /** Everything from this world and the ones before. */
  decor: Partial<Record<DecorKind, number>>
  critters: Partial<Record<CritterKind, number>>
  ring: number
  /** Floating islands so far, in the order they came. */
  islands: IslandKind[]
}

const tierIndex = (level: number): number => {
  let i = 0
  while (i + 1 < GARDEN_TIERS.length && GARDEN_TIERS[i + 1].level <= level) i++
  return i
}

export function gardenWorld(level: number): GardenWorld {
  const tier = tierIndex(level)
  const decor: Partial<Record<DecorKind, number>> = {}
  const critters: Partial<Record<CritterKind, number>> = {}
  const flowers: FlowerKind[] = []
  for (const t of GARDEN_TIERS.slice(0, tier + 1)) {
    if (t.flower) flowers.push(t.flower)
    for (const [k, n] of Object.entries(t.decor)) decor[k as DecorKind] = (decor[k as DecorKind] ?? 0) + n
    for (const [k, n] of Object.entries(t.critters))
      critters[k as CritterKind] = (critters[k as CritterKind] ?? 0) + n
  }
  const t = GARDEN_TIERS[tier]
  const islands = GARDEN_TIERS.slice(0, tier + 1).flatMap((x) => (x.island ? [x.island] : []))
  return { tier, name: t.name, flowers, decor, critters, ring: t.ring, islands }
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
  /** What makes it grow in when it arrives: `tier:N`, `visitor:fox`, `trophy:list:3` (see gardenNews). */
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
  items: DecorItem[]
  /** Floating islands round the garden (castle first), each linked by a bridge. */
  islets: Islet[]
  /** Distance from the centre to the farthest ground (camera framing). */
  extent: number
}

const SIZE: Record<DecorKind, number> = {
  stone: 0.1,
  bush: 0.22,
  cottage: 0.7,
  bench: 0.3,
  mailbox: 0.14,
  pond: 0.85,
  tree: 0.4,
  pine: 0.32,
  mushroom: 0.12,
  rabbit: 0.24,
  house: 0.6,
  windmill: 0.55,
  lamp: 0.12,
  cat: 0.16,
  waterfall: 0.35,
  blossom: 0.45,
  deer: 0.3,
  well: 0.3,
  clocktower: 0.6,
  stall: 0.4,
  trophy: 0.2,
  hedgehog: 0.25,
  fox: 0.35,
  owl: 0.18,
  peacock: 0.35,
  turtle: 0.3,
}

/** Heights of the islands, in the order they come (some above the garden, some below: never all in a row). */
const ISLET_LIFT = [0.7, -0.9, 0.4, -0.6, 1.0, -1.1, 0.2, -0.4]
const ISLET_RADIUS = 1.3

/** Gate (and cottage) direction: behind the plants as the garden first appears, so the cottage frames them. */
const GATE = -Math.PI / 2 + 0.1
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
/** Gap between the plants' ground and anything standing around it. */
const CLEAR = 0.05

const faceCentre = (x: number, z: number): number => Math.atan2(-x, -z)

/**
 * Where everything stands, for `plantCount` plants in `world`: the plants keep the middle (gardenRadius), the fence
 * goes round them, the cottage faces the gate down a stepping-stone path, and the rest is placed around in a fixed
 * order (big things first), so a garden looks the same every time.
 */
export function gardenLayout(
  plantCount: number,
  world: GardenWorld,
  extras: { visitors?: readonly VisitorKind[]; trophies?: readonly string[] } = {},
): GardenLayout {
  const visitors = (extras.visitors ?? []).filter((v): v is Exclude<VisitorKind, 'dragon'> => v !== 'dragon')
  const trophies = extras.trophies ?? []
  const inner = gardenRadius(plantCount)
  // Visitors and trophies need ground round the plants even on the first island.
  const radius = inner + Math.max(world.ring, visitors.length || trophies.length ? 1.0 : 0)
  const tierOf = (kind: DecorKind, n: number): number => {
    // The world that brought the n-th one of this kind.
    let seen = 0
    for (let i = 0; i <= world.tier; i++) {
      seen += GARDEN_TIERS[i].decor[kind] ?? 0
      if (n < seen) return i
    }
    return world.tier
  }
  const items: DecorItem[] = []
  const fits = (x: number, z: number, size: number): boolean =>
    items.every((o) => Math.hypot(o.x - x, o.z - z) >= o.size + size)
  const put = (kind: DecorKind, x: number, z: number, n: number, seed: number, reveal: string, ref?: string): void => {
    const tier = reveal.startsWith('tier:') ? tierOf(kind, n) : 0
    items.push({ kind, x, z, turn: faceCentre(x, z), size: SIZE[kind], tier, reveal, ...(ref ? { ref } : {}), seed })
  }

  // Cottage at the gate, its path of stepping stones from the gate to its door.
  if (world.decor.cottage) {
    const r = inner + CLEAR + SIZE.cottage + 0.35
    const tier = tierOf('cottage', 0)
    put('cottage', r * Math.cos(GATE), r * Math.sin(GATE), 0, 0.5, `tier:${tier}`)
    for (let d = inner + CLEAR + SIZE.stone; d + SIZE.stone <= r - SIZE.cottage; d += 0.26)
      items.push({ kind: 'stone', x: d * Math.cos(GATE), z: d * Math.sin(GATE), turn: d, size: SIZE.stone, tier, reveal: `tier:${tier}`, seed: d % 1 })
  }

  // Everything else, biggest first; each tries spots along a golden-angle walk round the ring.
  const queue: { kind: DecorKind; n: number; reveal: string; ref?: string }[] = []
  for (const [kind, count] of Object.entries(world.decor) as [DecorKind, number][])
    for (let n = kind === 'cottage' ? 1 : 0; n < count; n++) queue.push({ kind, n, reveal: `tier:${tierOf(kind, n)}` })
  for (const v of visitors) queue.push({ kind: v, n: 0, reveal: `visitor:${v}` })
  trophies.slice(0, 24).forEach((key, n) => queue.push({ kind: 'trophy', n, reveal: `trophy:${key}`, ref: key }))
  queue.sort((a, b) => SIZE[b.kind] - SIZE[a.kind] || a.reveal.localeCompare(b.reveal) || a.kind.localeCompare(b.kind) || a.n - b.n)
  for (const { kind, n, reveal, ref } of queue) {
    const size = SIZE[kind]
    const lo = inner + CLEAR + size
    const hi = radius - size
    if (hi < lo) continue
    for (let k = 0; k < 600; k++) {
      const a = GATE + 0.9 + (k + n * 7) * GOLDEN_ANGLE + kind.length
      // The waterfall pours over the edge; the rest spread across the ring.
      const r = kind === 'waterfall' ? hi : lo + ((k * 0.618034 + n * 0.37) % 1) * (hi - lo)
      const x = r * Math.cos(a)
      const z = r * Math.sin(a)
      if (fits(x, z, size)) {
        put(kind, x, z, n, plantVariant(k * 13 + n + kind.length * 101).hue, reveal, ref)
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
    fence: world.tier >= 1 ? { radius: inner - 0.15, gate: GATE } : null,
    items,
    islets,
    extent: islets.length ? d + ISLET_RADIUS : radius,
  }
}
