import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { createFoliateEngine, type FoliateEngine } from '@/reading'

/**
 * The actual reading body: renders a real EPUB with the vendored foliate engine (via the `@/reading` facade).
 *
 * Only mounts `<foliate-view>`, opens the book, hands the engine instance up, and shows loading / error overlays;
 * paging / progress / chapters / keyboard are handled by the parent (`Reader`) using the engine instance.
 * `loadBook` must be a stable reference (module-level function or useCallback), or the engine is rebuilt repeatedly.
 */

export interface FoliateViewProps {
  /** Load book content as a Blob (e.g. `openBookFile` from `@/reading`). **Must be stable.** */
  loadBook: () => Promise<Blob>
  /** Hands the engine instance up after opening (for selection highlights etc.); `onEngineGone` is called on unmount. **Must be stable.** */
  onEngineReady?: (engine: FoliateEngine) => void
  /** Called before the engine is destroyed (clean up subscriptions). **Must be stable.** */
  onEngineGone?: () => void
  className?: string
  /** Overlay on top of the body (e.g. selection popups). */
  children?: React.ReactNode
}

type Status = 'loading' | 'ready' | 'error'

export function FoliateView({
  loadBook,
  onEngineReady,
  onEngineGone,
  className,
  children,
}: FoliateViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let engine: FoliateEngine | null = null

    void (async () => {
      try {
        const [eng, book] = await Promise.all([createFoliateEngine(), loadBook()])
        // StrictMode double-mount / unmount race: if cancelled, destroy in place instead of mounting into a dead container.
        if (cancelled) {
          eng.destroy()
          return
        }
        engine = eng
        containerRef.current?.appendChild(eng.element)
        await eng.open(book)
        if (cancelled) return
        setStatus('ready')
        onEngineReady?.(eng)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      if (engine) onEngineGone?.()
      engine?.destroy()
    }
  }, [loadBook, onEngineReady, onEngineGone])

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col bg-page-bg', className)}>
      {/* foliate mount point: body renders here (each section in its own iframe). */}
      <div ref={containerRef} className="min-h-0 flex-1" />

      {/* Overlay layer (selection popups etc., mostly position: fixed). */}
      {children}

      {/* Loading / error overlay */}
      {status !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {status === 'loading' ? (
            <span className="text-sm text-text-muted">Opening book…</span>
          ) : (
            <div className="max-w-md px-6 text-center">
              <p className="text-sm font-medium text-text-danger">Couldn't open the book</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
