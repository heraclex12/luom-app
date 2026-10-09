import { useMemo, useState } from 'react'
import { Button } from '@/components/ui'
import { WordGarden } from '@/components/garden/WordGarden'
import { GARDEN_TIERS, VISITORS, gardenPlants, type Plant, type ShownLook, type Trophy, type VisitorKind } from '@/wordbook'
import { cn } from '@/lib/cn'

const WORDS = [
  'meticulous', 'diligent', 'resilient', 'accumulate', 'accuracy', 'accent', 'absorb', 'abdominal', 'accelerate',
  'ambiguous', 'benevolent', 'candid', 'deliberate', 'eloquent', 'frugal', 'gregarious', 'humble', 'inevitable',
  'jubilant', 'keen', 'lucid', 'mundane', 'novice', 'obscure', 'pragmatic', 'quaint', 'robust', 'serene', 'tedious',
  'unanimous', 'vivid', 'wary', 'zealous', 'abundant', 'brisk', 'cozy', 'daunting', 'eager', 'fragile', 'genuine',
]
const DAY = 86_400_000
const VISITOR_KINDS: VisitorKind[] = VISITORS.map((v) => v.kind)
const NONE: VisitorKind[] = []
const TROPHIES: Trophy[] = [
  { key: 'list:1', medal: 'gold', title: 'Everyday English 1', detail: 'All 1000 words learned' },
  { key: 'list:4', medal: 'silver', title: 'Academic English', detail: '512 of 959 words learned' },
  { key: 'list:5', medal: 'bronze', title: 'TOEIC Essentials', detail: '140 of 1250 words learned' },
  { key: 'col:2', medal: 'gold', title: 'Travel', detail: 'All 24 words learned' },
]
const NO_TROPHIES: Trophy[] = []

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
  const [reveal, setReveal] = useState<ReadonlySet<string>>(new Set())
  const [look, setLook] = useState<ShownLook>('summer')
  const [extras, setExtras] = useState(false)
  return (
    <div className="mx-auto w-full max-w-5xl px-10 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Word garden</h1>
        <Button
          variant="secondary"
          onClick={() => {
            setGrow(new Set(plants.filter((_, i) => i % 3 === 0).map((p) => p.dictId)))
            setReveal(new Set([`tier:${tier}`]))
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
              setReveal(new Set([`tier:${i}`]))
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
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(['summer', 'spring', 'autumn', 'winter', 'night'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLook(l)}
            className={cn(
              'can-focus rounded-full px-3 py-1 text-xs font-medium capitalize',
              l === look ? 'bg-fill-brand text-on-brand' : 'bg-fill-control text-text-secondary hover:bg-fill-control-hover',
            )}
          >
            {l}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setExtras((e) => !e)}
          className={cn(
            'can-focus rounded-full px-3 py-1 text-xs font-medium',
            extras ? 'bg-fill-brand text-on-brand' : 'bg-fill-control text-text-secondary hover:bg-fill-control-hover',
          )}
        >
          Visitors and trophies
        </button>
      </div>
      <WordGarden
        plants={plants}
        grow={grow}
        level={GARDEN_TIERS[tier].level}
        reveal={reveal}
        look={look}
        visitors={extras ? VISITOR_KINDS : NONE}
        trophies={extras ? TROPHIES : NO_TROPHIES}
        className="mt-4 h-[460px] rounded-card bg-surface-1"
      />
    </div>
  )
}
