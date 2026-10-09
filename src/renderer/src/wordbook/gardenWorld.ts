// Garden worlds (pure): the garden grows with the learner's level. At set levels (10, 25, 50, … 200: a long road on
// purpose, months to years) the island gets wider and something moves in around the plants: a fence and butterflies,
// a cottage, a pond with ducks, a little wood, a hamlet, a village, a town, and at last a castle on its own island. Each world also unlocks a new kind of flower for
// mastered words. Drawn by components/garden/gardenScene.ts (+ gardenDecor.ts).
import { gardenRadius, plantVariant } from './garden'

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
  /** A second island with a castle. */
  islet?: boolean
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
    level: 75,
    name: 'Little wood',
    adds: 'Trees and pines, mushrooms, rabbits, birds overhead and bluebells.',
    flower: 'bluebell',
    decor: { tree: 4, pine: 4, mushroom: 4, rabbit: 2 },
    critters: { bird: 3 },
    ring: 2.5,
  },
  {
    level: 100,
    name: 'Hamlet',
    adds: 'Two more houses, a windmill, street lamps, a cat and roses.',
    flower: 'rose',
    decor: { house: 2, windmill: 1, lamp: 4, cat: 1 },
    critters: {},
    ring: 2.9,
  },
  {
    level: 125,
    name: 'Village',
    adds: 'A waterfall, blossom trees, a well, deer and poppies.',
    flower: 'poppy',
    decor: { waterfall: 1, blossom: 3, well: 1, deer: 2 },
    critters: {},
    ring: 3.2,
  },
  {
    level: 150,
    name: 'Town',
    adds: 'A clock tower, market stalls, a hot-air balloon and lilies.',
    flower: 'lily',
    decor: { clocktower: 1, stall: 3 },
    critters: { balloon: 1 },
    ring: 3.5,
  },
  {
    level: 200,
    name: 'Sky kingdom',
    adds: 'A castle on its own island, a bridge to it and a rainbow.',
    decor: {},
    critters: { balloon: 1 },
    ring: 3.5,
    islet: true,
  },
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
  islet: boolean
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
  return { tier, name: t.name, flowers, decor, critters, ring: t.ring, islet: !!t.islet }
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
  /** World that brought it (to grow it in when that world arrives). */
  tier: number
  /** 0..1, for small differences (colours, heights). */
  seed: number
}

export interface GardenLayout {
  /** Island radius. */
  radius: number
  /** Fence round the plants with a gate at angle `gate` (radians, from +x towards +z). */
  fence: { radius: number; gate: number } | null
  items: DecorItem[]
  /** Castle island (Sky kingdom): centre and radius; it floats a little higher. */
  islet: { x: number; z: number; radius: number } | null
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
}

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
export function gardenLayout(plantCount: number, world: GardenWorld): GardenLayout {
  const inner = gardenRadius(plantCount)
  const radius = inner + world.ring
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
  const put = (kind: DecorKind, x: number, z: number, n: number, seed: number): void => {
    items.push({ kind, x, z, turn: faceCentre(x, z), size: SIZE[kind], tier: tierOf(kind, n), seed })
  }

  // Cottage at the gate, its path of stepping stones from the gate to its door.
  if (world.decor.cottage) {
    const r = inner + CLEAR + SIZE.cottage + 0.35
    put('cottage', r * Math.cos(GATE), r * Math.sin(GATE), 0, 0.5)
    for (let d = inner + CLEAR + SIZE.stone; d + SIZE.stone <= r - SIZE.cottage; d += 0.26)
      items.push({ kind: 'stone', x: d * Math.cos(GATE), z: d * Math.sin(GATE), turn: d, size: SIZE.stone, tier: tierOf('cottage', 0), seed: d % 1 })
  }

  // Everything else, biggest first; each tries spots along a golden-angle walk round the ring.
  const queue: { kind: DecorKind; n: number }[] = []
  for (const [kind, count] of Object.entries(world.decor) as [DecorKind, number][])
    for (let n = kind === 'cottage' ? 1 : 0; n < count; n++) queue.push({ kind, n })
  queue.sort((a, b) => SIZE[b.kind] - SIZE[a.kind] || tierOf(a.kind, a.n) - tierOf(b.kind, b.n) || a.kind.localeCompare(b.kind) || a.n - b.n)
  for (const { kind, n } of queue) {
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
        put(kind, x, z, n, plantVariant(k * 13 + n + kind.length * 101).hue)
        break
      }
    }
  }

  const islet = world.islet
    ? (() => {
        const r = 1.3
        const d = radius + 0.9 + r
        const a = GATE - 2.1
        return { x: d * Math.cos(a), z: d * Math.sin(a), radius: r }
      })()
    : null
  return {
    radius,
    fence: world.tier >= 1 ? { radius: inner - 0.15, gate: GATE } : null,
    items,
    islet,
    extent: islet ? Math.hypot(islet.x, islet.z) + islet.radius : radius,
  }
}
