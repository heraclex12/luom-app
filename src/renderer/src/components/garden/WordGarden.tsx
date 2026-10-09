import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { GARDEN_TIERS, gardenWorld, type Plant, type PlantStage, type ShownLook, type Trophy, type VisitorKind } from '@/wordbook'
import { GardenScene, type HoverTarget } from './gardenScene'

const STAGE_LABEL: Record<PlantStage, string> = {
  seed: 'Seed: not learned yet',
  sprout: 'Growing',
  thirsty: 'Needs water: due for review',
  bloom: 'In bloom: mastered',
}

/** Imperative handle for Garden rescue (focus a plant, water it, shake it). */
export interface GardenHandle {
  focus: (dictId: number | null) => void
  water: (dictId: number) => Promise<void>
  shake: (dictId: number) => Promise<void>
  setAutoRotate: (on: boolean) => void
}

const MEDAL_LABEL: Record<Trophy['medal'], string> = { bronze: 'Bronze trophy', silver: 'Silver trophy', gold: 'Gold trophy' }

/**
 * 3D word garden (three.js): one plant per word on a floating island that grows with the learner's `level` (see
 * wordbook/gardenWorld.ts), with streak `visitors`, `trophies` and a season / night `look`. Drag to turn, hover for
 * the word (or a trophy's name), click a plant to open it. `grow` = dictIds that grow in when the garden appears (end
 * of a study session); `reveal` = keys of things that have just arrived and grow in.
 */
export function WordGarden({
  plants,
  grow,
  level = 1,
  reveal,
  visitors,
  trophies,
  look,
  onSelect,
  className,
  handleRef,
}: {
  handleRef?: React.Ref<GardenHandle>
  plants: readonly Plant[]
  grow?: ReadonlySet<number>
  level?: number
  reveal?: ReadonlySet<string>
  visitors?: readonly VisitorKind[]
  trophies?: readonly Trophy[]
  look?: ShownLook
  onSelect?: (plant: Plant) => void
  className?: string
}): React.JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<GardenScene | null>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  const [hover, setHover] = useState<{ target: HoverTarget; x: number; y: number } | null>(null)
  const [failed, setFailed] = useState(false)
  /** Island being visited (index into the world's islands), or null for the whole garden. */
  const [visiting, setVisiting] = useState<number | null>(null)
  const islands = gardenWorld(level).islands.map((kind) => GARDEN_TIERS.find((t) => t.island === kind)!)
  const visit = (i: number | null): void => {
    setVisiting(i)
    sceneRef.current?.visit(i)
  }
  useImperativeHandle(
    handleRef,
    () => ({
      focus: (id) => sceneRef.current?.focusPlant(id),
      water: (id) => sceneRef.current?.waterPlant(id) ?? Promise.resolve(),
      shake: (id) => sceneRef.current?.shakePlant(id) ?? Promise.resolve(),
      setAutoRotate: (on) => sceneRef.current?.setAutoRotate(on),
    }),
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let scene: GardenScene
    try {
      scene = new GardenScene(canvas, {
        onHover: (target, at) =>
          setHover((prev) =>
            target && at
              ? prev && hoverId(prev.target) === hoverId(target) && Math.abs(prev.x - at.x) < 0.5 && Math.abs(prev.y - at.y) < 0.5
                ? prev
                : { target, ...at }
              : prev === null
                ? prev
                : null,
          ),
        onSelect: (plant) => selectRef.current?.(plant),
        onIslet: (i) => setVisiting(i),
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
    sceneRef.current?.setGarden({ plants, grow, level, reveal, visitors, trophies, look })
  }, [plants, grow, level, reveal, visitors, trophies, look])

  return (
    <div ref={wrapRef} className={cn('relative select-none', className)}>
      {failed ? (
        <div className="grid h-full place-items-center text-sm text-text-muted">3D is not available on this Mac.</div>
      ) : (
        <canvas ref={canvasRef} className="block size-full cursor-grab touch-none rounded-[inherit]" aria-label="Your word garden" />
      )}
      {islands.length > 0 && (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]" role="toolbar" aria-label="Visit an island">
          <span className="mr-0.5 text-[11px] font-semibold text-text-muted">Visit</span>
          {[{ name: 'Garden' }, ...islands].map((t, i) => {
            const index = i === 0 ? null : i - 1
            const active = visiting === index
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => visit(index)}
                className={cn(
                  'can-focus shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur transition-colors',
                  active ? 'bg-fill-brand text-on-brand' : 'bg-surface-0/85 text-text-secondary hover:text-text-primary',
                )}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      )}
      {visiting !== null && islands[visiting] && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[18rem] rounded-[14px] bg-surface-0/90 px-3.5 py-2.5 shadow-sm backdrop-blur">
          <p className="font-hand text-sm leading-none text-text-accent">Level {islands[visiting].level}</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">{islands[visiting].name}</p>
          <p className="mt-0.5 text-xs leading-snug text-text-secondary">{islands[visiting].adds}</p>
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-surface-2 px-2.5 py-1.5 text-center shadow-[0_4px_16px_rgb(17_22_20/0.14)] ring-1 ring-border"
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.target.kind === 'plant' ? (
            <>
              <div className="text-sm font-semibold text-text-primary">{hover.target.plant.term}</div>
              <div className="text-[11px] text-text-muted">{STAGE_LABEL[hover.target.plant.stage]}</div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-text-primary">{hover.target.trophy.title}</div>
              <div className="text-[11px] text-text-muted">
                {MEDAL_LABEL[hover.target.trophy.medal]} · {hover.target.trophy.detail}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const hoverId = (t: HoverTarget): string => (t.kind === 'plant' ? `p${t.plant.dictId}` : `t${t.trophy.key}`)
