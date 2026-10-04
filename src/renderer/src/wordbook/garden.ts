// Word garden model (pure): every saved word is a plant. Its stage follows the learning state (new = seed,
// memorizing = sprout, due = thirsty, mastered = bloom); positions follow a sunflower spiral in the order words
// were added, so a plant keeps its place as the garden grows. Rendered by components/garden/WordGarden.
import { nextDayAt } from './time'
import type { WordListItem } from './types'
import { segmentOf } from './words'

export type PlantStage = 'seed' | 'sprout' | 'thirsty' | 'bloom'

export interface Plant {
  dictId: number
  term: string
  stage: PlantStage
  /** Ground position (scene units); y is up. */
  x: number
  z: number
}

/** Distance between neighbouring plants (scene units). */
export const GARDEN_SPACING = 0.62
/** Most plants drawn at once (keeps the scene light). */
export const GARDEN_MAX_PLANTS = 160

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export function plantStage(w: Pick<WordListItem, 'state' | 'due'>, now: number): PlantStage {
  switch (segmentOf(w.state, w.due, nextDayAt(now))) {
    case 'new':
      return 'seed'
    case 'due':
      return 'thirsty'
    case 'mastered':
      return 'bloom'
    default:
      return 'sprout'
  }
}

/**
 * Plants for the garden. Over `max` words: keep every word being learned (sprout / thirsty / bloom), fill the rest
 * with the newest seeds. Laid out in dictId order (= order added).
 */
export function gardenPlants(items: readonly WordListItem[], now: number, max = GARDEN_MAX_PLANTS): Plant[] {
  const words = items
    .filter((w): w is WordListItem & { term: string } => !!w.term)
    .map((w) => ({ dictId: w.dictId, term: w.term, stage: plantStage(w, now) }))
  let kept = words
  if (words.length > max) {
    const learning = words.filter((w) => w.stage !== 'seed').sort((a, b) => b.dictId - a.dictId)
    const seeds = words.filter((w) => w.stage === 'seed').sort((a, b) => b.dictId - a.dictId)
    kept = [...learning, ...seeds].slice(0, max)
  }
  return [...kept]
    .sort((a, b) => a.dictId - b.dictId)
    .map((w, i) => {
      const r = GARDEN_SPACING * Math.sqrt(i)
      const a = i * GOLDEN_ANGLE
      return { ...w, x: r * Math.cos(a), z: r * Math.sin(a) }
    })
}

/** Radius of ground needed for `count` plants. */
export const gardenRadius = (count: number): number => GARDEN_SPACING * Math.sqrt(Math.max(1, count)) + 0.9

/** Per-word look: turn (radians), size and a hue offset (0..1), stable for a word. */
export function plantVariant(dictId: number): { turn: number; scale: number; hue: number } {
  // Integer hash (Murmur-style finaliser) → three numbers in [0, 1).
  let h = (dictId ^ 0x9e3779b9) >>> 0
  const next = (): number => {
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
    h = (h ^ (h >>> 16)) >>> 0
    return h / 2 ** 32
  }
  return { turn: next() * Math.PI * 2, scale: 0.85 + next() * 0.3, hue: next() }
}
