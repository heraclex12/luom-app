import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { Stage } from './Stage'

/**
 * Canvas host for a Stage: creates it once, keeps it sized, pauses it when off screen or the window is hidden, and
 * disposes it on unmount. `onStage` hands the instance to the page (answers drive it); null when WebGL is missing.
 */
export function ThreeView<S extends Stage>({
  create,
  onStage,
  className,
  children,
}: {
  create: (canvas: HTMLCanvasElement) => S
  onStage: (stage: S | null) => void
  className?: string
  /** HTML overlays (labels) positioned over the canvas. */
  children?: React.ReactNode
}): React.JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const createRef = useRef(create)
  const onStageRef = useRef(onStage)
  onStageRef.current = onStage

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let stage: S
    try {
      stage = createRef.current(canvas)
    } catch {
      setFailed(true)
      onStageRef.current(null)
      return
    }
    const ro = new ResizeObserver(([e]) => stage.resize(e.contentRect.width, e.contentRect.height))
    ro.observe(wrap)
    const io = new IntersectionObserver(([e]) => stage.setVisible(e.isIntersecting))
    io.observe(wrap)
    const onVis = (): void => stage.setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    stage.start()
    onStageRef.current(stage)
    return () => {
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      onStageRef.current(null)
      stage.dispose()
    }
  }, [])

  return (
    <div ref={wrapRef} className={cn('relative overflow-hidden', className)}>
      {failed ? (
        <div className="grid h-full place-items-center text-sm text-text-muted">3D is not available on this Mac.</div>
      ) : (
        <canvas ref={canvasRef} className="block size-full" />
      )}
      {children}
    </div>
  )
}
