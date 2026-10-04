import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { Plant, PlantStage } from '@/wordbook'
import { GardenScene } from './gardenScene'

const STAGE_LABEL: Record<PlantStage, string> = {
  seed: 'Seed: not learned yet',
  sprout: 'Growing',
  thirsty: 'Needs water: due for review',
  bloom: 'In bloom: mastered',
}

/**
 * 3D word garden (three.js): one plant per word on a floating island. Drag to turn, hover for the word, click to
 * open it. `grow` = dictIds that grow in when the garden appears (end of a study session).
 */
export function WordGarden({
  plants,
  grow,
  onSelect,
  className,
}: {
  plants: readonly Plant[]
  grow?: ReadonlySet<number>
  onSelect?: (plant: Plant) => void
  className?: string
}): React.JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<GardenScene | null>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  const [hover, setHover] = useState<{ plant: Plant; x: number; y: number } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let scene: GardenScene
    try {
      scene = new GardenScene(canvas, {
        onHover: (plant, at) =>
          setHover((prev) =>
            plant && at
              ? prev?.plant.dictId === plant.dictId && Math.abs(prev.x - at.x) < 0.5 && Math.abs(prev.y - at.y) < 0.5
                ? prev
                : { plant, ...at }
              : prev === null
                ? prev
                : null,
          ),
        onSelect: (plant) => selectRef.current?.(plant),
      })
    } catch {
      setFailed(true) // no WebGL
      return
    }
    sceneRef.current = scene
    const ro = new ResizeObserver(([e]) => scene.resize(e.contentRect.width, e.contentRect.height))
    ro.observe(wrap)
    const io = new IntersectionObserver(([e]) => scene.setVisible(e.isIntersecting))
    io.observe(wrap)
    const onVis = (): void => scene.setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setPlants(plants, grow)
  }, [plants, grow])

  return (
    <div ref={wrapRef} className={cn('relative select-none', className)}>
      {failed ? (
        <div className="grid h-full place-items-center text-sm text-text-muted">3D is not available on this Mac.</div>
      ) : (
        <canvas ref={canvasRef} className="block size-full cursor-grab touch-none" aria-label="Your word garden" />
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-surface-2 px-2.5 py-1.5 text-center shadow-[0_4px_16px_rgb(17_22_20/0.14)] ring-1 ring-border"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="text-sm font-semibold text-text-primary">{hover.plant.term}</div>
          <div className="text-[11px] text-text-muted">{STAGE_LABEL[hover.plant.stage]}</div>
        </div>
      )}
    </div>
  )
}
