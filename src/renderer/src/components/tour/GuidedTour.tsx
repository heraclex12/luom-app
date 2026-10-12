import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { endTour, tourStore } from '@/app/tourStore'
import { openSettingsDialog, settingsDialogStore } from '@/app/settingsStore'
import { prettyAccelerator } from '@/app/shortcut'
import { getSettings, updateSettings } from '@/settings'
import {
  TOUR_STEPS,
  backStep,
  cardPlacement,
  isLastTourStep,
  nextStep,
  skipMissing,
  stepScene,
  tipBody,
  tipMoves,
  type Placement,
  type Rect,
} from './tour'

/**
 * Guided tour overlay (mounted once in AppShell, shown while tourStore runs): a getting-started walk that moves
 * between pages (and in and out of Settings), dims the window and spotlights one area (data-tour="<target>") with a
 * tip card beside it. Clicks reach the page only inside the spotlight, so the user can type a word or set a reminder
 * time during the tour. Back / Next / Skip tour, ← → Esc while the card has focus. Ending it marks the tour seen.
 * Steps, skipping and placement rules live in ./tour (pure).
 */

const PAD = 6
const CARD_WIDTH = 330
/** Wider card for a step with a clip. */
const MEDIA_CARD_WIDTH = 420
/** How long an optional stop may take to show up before it is skipped (a page still loading its data). */
const OPTIONAL_WAIT_MS = 1500
/** The spotlight's glide to a new target, and how long the card waits before popping in beside it. */
const GLIDE_MS = 420
const CARD_DELAY_MS = 220

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function GuidedTour(): React.JSX.Element | null {
  const running = useSyncExternalStore(tourStore.subscribe, tourStore.getSnapshot)
  return running ? <TourOverlay /> : null
}

const findTarget = (target: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].find((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }) ?? null

const sameRect = (a: Rect | null, b: Rect | null): boolean =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height)

function TourOverlay(): React.JSX.Element | null {
  // Lets menus opened from a highlighted control sit above the tour (styles/overlays.css).
  useEffect(() => {
    document.documentElement.dataset.touring = ''
    return () => {
      delete document.documentElement.dataset.touring
    }
  }, [])
  const navigate = useNavigate()
  const location = useLocation()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [rect, setRect] = useState<Rect | null>(null)
  /** The spotlight is gliding to a new target (CSS transition on); otherwise it tracks the target exactly. */
  const [glide, setGlide] = useState(false)
  /** The current step's target is on screen (the card is shown). */
  const [ready, setReady] = useState(false)
  const [cardHeight, setCardHeight] = useState(200)
  const [shortcut, setShortcut] = useState('⌥⌘E')
  const card = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const step = TOUR_STEPS[index]!
  const last = isLastTourStep(index)

  useEffect(() => {
    void getSettings().then((s) => setShortcut(s.captureShortcut ? prettyAccelerator(s.captureShortcut) : ''))
  }, [index])

  const go = useCallback((to: number, d: 1 | -1): void => {
    setDir(d)
    setIndex(to)
  }, [])
  const forward = useCallback((): void => go(nextStep(index), 1), [go, index])
  const backward = useCallback((): void => go(backStep(index), -1), [go, index])

  const finish = useCallback((): void => {
    if (settingsDialogStore.getSnapshot()) settingsDialogStore.setOpen(false)
    endTour()
    void updateSettings({ tourSeen: 1 })
  }, [])

  // Set the scene for the step: the right page, and Settings open on the right section (closed otherwise).
  useEffect(() => {
    const scene = stepScene(step)
    if (scene.settings) openSettingsDialog(scene.settings)
    else if (settingsDialogStore.getSnapshot()) settingsDialogStore.setOpen(false)
    if (scene.route && location.pathname !== scene.route) navigate(scene.route)
    // Only when the step changes; the user may wander off inside a step (e.g. click a suggestion).
  }, [index])

  // Follow the target every frame: it may appear late (a page loading, Settings opening), move (scrolling, layout) or
  // never come (optional stops). The spotlight keeps its last place until the new target shows up, then glides there;
  // the tip card waits until then and pops in at its new place (no flashing, no card sliding across the page).
  useEffect(() => {
    setReady(false)
    const target = step.target
    let frame = 0
    let glideTimer = 0
    const startGlide = (): void => {
      setGlide(true)
      window.clearTimeout(glideTimer)
      glideTimer = window.setTimeout(() => setGlide(false), GLIDE_MS)
    }
    if (!target) {
      // Nothing to point at: the hole closes and the card sits in the middle.
      startGlide()
      setRect(null)
      setReady(true)
      return () => window.clearTimeout(glideTimer)
    }
    const started = performance.now()
    let found = false
    let focused = false
    // A waiting step moves on when its result appears, but not if it was already there when the step began
    // (coming back to it with Back).
    const waitedAbsent = step.waitFor ? !findTarget(step.waitFor) : false
    const tick = (): void => {
      frame = requestAnimationFrame(tick)
      if (step.waitFor && waitedAbsent && findTarget(step.waitFor)) {
        cancelAnimationFrame(frame)
        go(nextStep(index), 1)
        return
      }
      const el = findTarget(target)
      if (!el) {
        if (step.optional && performance.now() - started > OPTIONAL_WAIT_MS) {
          const to = skipMissing(index, dir, (i) => {
            const t = TOUR_STEPS[i]!.target
            return !t || !findTarget(t)
          })
          if (to !== index) {
            cancelAnimationFrame(frame)
            go(to, dir)
          }
        }
        return
      }
      if (!found) {
        found = true
        const r = el.getBoundingClientRect()
        const inView = r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth
        if (!inView) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
        startGlide()
        window.setTimeout(() => setReady(true), reducedMotion() ? 0 : CARD_DELAY_MS)
      }
      if (step.interactive && !focused) {
        focused = true
        el.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true })
      }
      // The spotlight covers the target and, when it is on screen, its companion (e.g. the suggestions list).
      const r = el.getBoundingClientRect()
      const w = step.with ? findTarget(step.with)?.getBoundingClientRect() : undefined
      const x = Math.min(r.left, w?.left ?? r.left)
      const y = Math.min(r.top, w?.top ?? r.top)
      const next = {
        x,
        y,
        width: Math.max(r.right, w?.right ?? r.right) - x,
        height: Math.max(r.bottom, w?.bottom ?? r.bottom) - y,
      }
      setRect((prev) => (sameRect(prev, next) ? prev : next))
    }
    frame = requestAnimationFrame(tick)
    // Safety net: if frames are paused (a window in the background), still show the card once the target is there.
    const fallback = window.setTimeout(() => {
      if (findTarget(target)) setReady(true)
    }, 900)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(glideTimer)
      window.clearTimeout(fallback)
    }
  }, [index, step, dir, go])

  useLayoutEffect(() => {
    if (card.current) setCardHeight(card.current.offsetHeight)
  }, [index, shortcut, rect])

  useEffect(() => {
    if (ready && !step.interactive) primary.current?.focus({ preventScroll: true })
  }, [ready, index, step.interactive])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      finish()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (last) finish()
      else forward()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      backward()
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

  // While a step waits for the user, the primary button can do it for them (look up the example word).
  const waiting = !!step.waitFor && !!step.tryWord
  const onPrimary = (): void => {
    if (last) finish()
    else if (waiting) navigate(`/lookup?q=${encodeURIComponent(step.tryWord!)}`)
    else forward()
  }

  const viewport = { width: window.innerWidth, height: window.innerHeight }
  const cardWidth = step.media ? MEDIA_CARD_WIDTH : CARD_WIDTH
  const moves = tipMoves(step, shortcut)
  const spot = rect && {
    x: Math.max(rect.x - PAD, 0),
    y: Math.max(rect.y - PAD, 0),
    width: Math.min(rect.width + 2 * PAD, viewport.width),
    height: Math.min(rect.height + 2 * PAD, viewport.height),
  }
  const centred = { left: (viewport.width - cardWidth) / 2, top: (viewport.height - cardHeight) / 2 }
  const place: Placement = spot
    ? cardPlacement(spot, viewport, { width: cardWidth, height: cardHeight })
    : { side: 'over', ...centred, arrow: 0 }
  const arrowStyle: React.CSSProperties | null =
    place.side === 'right'
      ? { left: -6, top: place.arrow - 6 }
      : place.side === 'left'
        ? { right: -6, top: place.arrow - 6 }
        : place.side === 'below'
          ? { top: -6, left: place.arrow - 6 }
          : place.side === 'above'
            ? { bottom: -6, left: place.arrow - 6 }
            : null

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* Spotlight: a hole in the dimmed window (its huge shadow is the dim), ringed in the accent colour. */}
      <div
        aria-hidden
        className={cn(
          'absolute rounded-[12px] shadow-[0_0_0_9999px_var(--backdrop)]',
          spot && 'ring-2 ring-border-accent',
          glide && 'motion-safe:transition-[left,top,width,height] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
        )}
        style={spot ? { left: spot.x, top: spot.y, width: spot.width, height: spot.height } : { left: '50%', top: '50%', width: 0, height: 0 }}
      />
      {/* Click shields around the hole: the page stays usable only inside the spotlight. */}
      {spot ? (
        <>
          <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: spot.y }} />
          <div className="pointer-events-auto absolute inset-x-0 bottom-0" style={{ top: spot.y + spot.height }} />
          <div className="pointer-events-auto absolute left-0" style={{ top: spot.y, height: spot.height, width: spot.x }} />
          <div className="pointer-events-auto absolute right-0" style={{ top: spot.y, height: spot.height, left: spot.x + spot.width }} />
        </>
      ) : (
        <div className="pointer-events-auto absolute inset-0" />
      )}
      <div
        key={index}
        ref={card}
        data-state={ready ? 'open' : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        data-tour-card
        onKeyDown={onKeyDown}
        className={cn(
          'anim-pop absolute flex flex-col gap-2 rounded-card bg-surface-2 p-5 text-text-primary shadow-panel-sm outline-none',
          'dark:border dark:border-alpha-1',
          ready ? 'pointer-events-auto' : 'invisible',
        )}
        style={{ left: place.left, top: place.top, width: cardWidth }}
      >
        {/* Arrow pointing at the highlighted area. */}
        {arrowStyle && <span aria-hidden className="absolute size-3 rotate-45 bg-surface-2" style={arrowStyle} />}
        <p className="font-hand text-base leading-none text-text-accent">
          {index + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="tour-title" className="text-base font-semibold leading-snug">
          {step.title}
        </h2>
        {step.media && (
          <video
            src={step.media.src}
            poster={step.media.poster}
            aria-label={step.media.label}
            muted
            loop
            playsInline
            autoPlay={!reducedMotion()}
            controls={reducedMotion()}
            className="mb-1 aspect-video w-full rounded-xl bg-surface-1 object-cover"
          />
        )}
        <p id="tour-body" className="text-sm leading-relaxed text-text-secondary">
          {tipBody(step, shortcut)}
        </p>
        {moves.length > 0 && (
          <ol className="flex flex-col gap-1.5 text-sm text-text-primary">
            {moves.map((m, i) => (
              <li key={m} className="flex items-start gap-2.5">
                <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-fill-brand text-[11px] font-semibold text-on-brand">
                  {i + 1}
                </span>
                <span className="leading-snug">{m}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-2 flex items-center gap-2">
          {!last && (
            <Button variant="ghost" size="sm" className="-ml-2 min-w-0" onClick={finish}>
              Skip tour
            </Button>
          )}
          <span className="flex-1" />
          {index > 0 && (
            <Button variant="secondary" size="sm" className="min-w-0 gap-1" onClick={backward}>
              <ArrowLeft className="size-3.5" strokeWidth={2} />
              Back
            </Button>
          )}
          <Button ref={primary} variant="brand" size="sm" className="gap-1" onClick={onPrimary}>
            {waiting && <Search className="size-3.5" strokeWidth={2} />}
            {last ? 'Start exploring' : waiting ? `Try “${step.tryWord}”` : 'Next'}
            {!last && !waiting && <ArrowRight className="size-3.5" strokeWidth={2} />}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
