import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { ThreeView } from '@/components/three/ThreeView'
import { Button } from '@/components/ui'
import * as wordbook from '@/wordbook'
import { AquariumScene } from './AquariumScene'

/** Aquarium: the fish caught in Word Fishing. Each grows with its word; mastered words turn golden. */
export default function Aquarium(): React.JSX.Element {
  const navigate = useNavigate()
  const scene = useRef<AquariumScene | null>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const [fish, setFish] = useState<{ dictId: number; term: string; state: number }[] | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    void wordbook.aquariumFish().then(setFish)
  }, [])

  const list = useMemo(() => (fish ?? []).map((f) => ({ dictId: f.dictId, look: wordbook.fishLook(f.dictId, f.state) })), [fish])
  useEffect(() => {
    scene.current?.setFish(list)
  }, [list])

  const golden = fish?.filter((f) => f.state === 4).length ?? 0
  const name = fish?.find((f) => f.dictId === hovered)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar segments={['My words', 'Games', 'Aquarium']} backTo="/wordbook/play" />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 pb-8 pt-4">
        <div className="relative h-[56vh] min-h-[300px] shrink-0 overflow-hidden rounded-2xl">
          <ThreeView
            className="absolute inset-0"
            create={(c) => new AquariumScene(c, setHovered)}
            onStage={(s) => {
              scene.current = s
              if (!s) return
              s.setLabel(labelRef.current)
              s.setFish(list)
            }}
          >
            <div
              ref={labelRef}
              className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-[#24424b] opacity-0 shadow-[0_4px_12px_rgb(20_60_70/0.2)] transition-opacity duration-150"
            >
              {name?.term ?? ''}
            </div>
          </ThreeView>
        </div>
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-text-primary">
              {fish === null ? '' : fish.length === 0 ? 'No fish yet' : `${fish.length} fish`}
              {golden > 0 && <span className="ml-2 text-sm font-normal text-text-warning">{golden} golden</span>}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {fish?.length === 0
                ? 'Every word you catch in Word Fishing comes to live here.'
                : 'Point at a fish to see its word. Fish grow as you learn their words; mastered words turn golden.'}
            </p>
          </div>
          <Button onClick={() => navigate('/wordbook/play/fishing')}>Go fishing</Button>
        </div>
      </div>
    </div>
  )
}
