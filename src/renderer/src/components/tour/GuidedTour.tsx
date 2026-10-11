import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { endTour, tourStore } from '@/app/tourStore'
import { prettyAccelerator } from '@/app/shortcut'
import { getSettings, updateSettings } from '@/settings'
import {
  TOUR_STEPS,
  backStep,
  cardPlacement,
  isLastTourStep,
  nextStep,
  tipBody,
  type Placement,
  type Rect,
} from './tour'

/**
 * Guided tour overlay (mounted once in AppShell, shown while tourStore runs): dims the window, spotlights one sidebar
 * element (data-tour="<target>") at a time and puts a tip card beside it. Back / Next / Skip tour, ← → Enter Esc,
 * focus stays in the card. Ending it in any way marks the tour seen. Steps and placement rules live in ./tour (pure).
 */

const PAD = 4
const CARD_WIDTH = 320

export function GuidedTour(): React.JSX.Element | null {
  const running = useSyncExternalStore(tourStore.subscribe, tourStore.getSnapshot)
  return running ? <TourOverlay /> : null
}

function TourOverlay(): React.JSX.Element | null {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardHeight, setCardHeight] = useState(200)
  const [shortcut, setShortcut] = useState('⌥⌘E')
  const card = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const step = TOUR_STEPS[index]!
  const last = isLastTourStep(index)

  useEffect(() => {
    void getSettings().then((s) => setShortcut(s.captureShortcut ? prettyAccelerator(s.captureShortcut) : ''))
  }, [])

  const finish = useCallback((): void => {
    endTour()
    void updateSettings({ tourSeen: 1 })
  }, [])

  // Measure the highlighted element now and whenever the window changes size.
  useLayoutEffect(() => {
    const measure = (): void => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (!el) return setRect(null)
      const r = el.getBoundingClientRect()
      setRect({ x: r.left, y: r.top, width: r.width, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [step.target])

  useLayoutEffect(() => {
    if (card.current) setCardHeight(card.current.offsetHeight)
  }, [index, shortcut, rect])

  useEffect(() => {
    primary.current?.focus({ preventScroll: true })
  }, [index])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      finish()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (last) finish()
      else setIndex(nextStep)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setIndex(backStep)
    } else if (e.key === 'Tab' && card.current) {
      // Keep focus inside the card.
      const items = [...card.current.querySelectorAll<HTMLElement>('button:not([disabled])')]
      if (items.length === 0) return
      const at = items.indexOf(document.activeElement as HTMLElement)
      const to = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : at === items.length - 1 ? 0 : at + 1
      e.preventDefault()
      items[to]!.focus()
    }
  }

  const viewport = { width: window.innerWidth, height: window.innerHeight }
  const spot = rect && { x: rect.x - PAD, y: rect.y - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD }
  const place: Placement = spot
    ? cardPlacement(spot, viewport, { width: CARD_WIDTH, height: cardHeight })
    : { side: 'right', left: (viewport.width - CARD_WIDTH) / 2, top: (viewport.height - cardHeight) / 2, arrow: -100 }

  return createPortal(
    <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
      {/* Spotlight: a hole in the dimmed window (its huge shadow is the dim), ringed in the accent colour. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute rounded-[12px] ring-2 ring-border-accent shadow-[0_0_0_9999px_var(--backdrop)]',
          'motion-safe:transition-[left,top,width,height] motion-safe:duration-300 motion-safe:ease-out',
        )}
        style={spot ? { left: spot.x, top: spot.y, width: spot.width, height: spot.height } : { left: '50%', top: '50%', width: 0, height: 0 }}
      />
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={cn(
          'absolute flex flex-col gap-2 rounded-card bg-surface-2 p-5 text-text-primary shadow-panel-sm outline-none',
          'dark:border dark:border-alpha-1',
          'motion-safe:transition-[left,top] motion-safe:duration-300 motion-safe:ease-out',
        )}
        style={{ left: place.left, top: place.top, width: CARD_WIDTH }}
      >
        {/* Arrow pointing at the highlighted item. */}
        {spot && (
          <span
            aria-hidden
            className="absolute size-3 rotate-45 bg-surface-2 dark:border-alpha-1"
            style={
              place.side === 'right'
                ? { left: -6, top: place.arrow - 6 }
                : { top: -6, left: place.arrow - 6 }
            }
          />
        )}
        <p className="font-hand text-base leading-none text-text-accent">
          {index + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="tour-title" className="text-base font-semibold leading-snug">
          {step.title}
        </h2>
        <p id="tour-body" className="text-sm leading-relaxed text-text-secondary">
          {tipBody(step, shortcut)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="ghost" size="sm" className="-ml-2 min-w-0" onClick={finish}>
            Skip tour
          </Button>
          <span className="flex-1" />
          {index > 0 && (
            <Button variant="secondary" size="sm" className="min-w-0 gap-1" onClick={() => setIndex(backStep)}>
              <ArrowLeft className="size-3.5" strokeWidth={2} />
              Back
            </Button>
          )}
          <Button
            ref={primary}
            variant="brand"
            size="sm"
            className="gap-1"
            onClick={() => (last ? finish() : setIndex(nextStep))}
          >
            {last ? 'Done' : 'Next'}
            {!last && <ArrowRight className="size-3.5" strokeWidth={2} />}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
