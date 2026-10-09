import { useMemo, useState } from 'react'
import { Button } from '@/components/ui'
import { WordGarden } from '@/components/garden/WordGarden'
import { GARDEN_TIERS, gardenPlants, type Plant } from '@/wordbook'
import { cn } from '@/lib/cn'

const WORDS = [
  'meticulous', 'diligent', 'resilient', 'accumulate', 'accuracy', 'accent', 'absorb', 'abdominal', 'accelerate',
  'ambiguous', 'benevolent', 'candid', 'deliberate', 'eloquent', 'frugal', 'gregarious', 'humble', 'inevitable',
  'jubilant', 'keen', 'lucid', 'mundane', 'novice', 'obscure', 'pragmatic', 'quaint', 'robust', 'serene', 'tedious',
  'unanimous', 'vivid', 'wary', 'zealous', 'abundant', 'brisk', 'cozy', 'daunting', 'eager', 'fragile', 'genuine',
]
const DAY = 86_400_000

/**
 * Word garden with sample words in every stage, in any world (level); "Replay grow" re-runs the end-of-session grow-in
 * and the arrival of the chosen world's things.
 */
export function GardenDemo(): React.JSX.Element {
  const now = Date.now()
  const plants: Plant[] = useMemo(
    () =>
      gardenPlants(
        WORDS.map((term, i) => {
          const kind = i % 4
          return {
            dictId: i + 1,
            term,
            state: kind === 0 ? 0 : kind === 3 ? 4 : 2,
            due: kind === 1 ? now + 5 * DAY : kind === 2 ? now - DAY : null,
          }
        }),
        now,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [grow, setGrow] = useState<ReadonlySet<number>>(new Set())
  const [tier, setTier] = useState(0)
  const [reveal, setReveal] = useState<number | null>(null)
  return (
    <div className="mx-auto w-full max-w-5xl px-10 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Word garden</h1>
        <Button
          variant="secondary"
          onClick={() => {
            setGrow(new Set(plants.filter((_, i) => i % 3 === 0).map((p) => p.dictId)))
            setReveal(null)
            queueMicrotask(() => setReveal(tier))
          }}
        >
          Replay grow
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {GARDEN_TIERS.map((t, i) => (
          <button
            key={t.name}
            type="button"
            onClick={() => {
              setTier(i)
              setReveal(i)
            }}
            className={cn(
              'can-focus rounded-full px-3 py-1 text-xs font-medium',
              i === tier ? 'bg-fill-brand text-on-brand' : 'bg-fill-control text-text-secondary hover:bg-fill-control-hover',
            )}
          >
            Level {t.level} · {t.name}
          </button>
        ))}
      </div>
      <WordGarden plants={plants} grow={grow} level={GARDEN_TIERS[tier].level} reveal={reveal} className="mt-4 h-[420px] rounded-card bg-surface-1" />
    </div>
  )
}
