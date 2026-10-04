import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Clamps a fixed popup anchored to a selection into the viewport. Popups anchor at (x, y) — x is
 * the horizontal center, y the selection's bottom edge — and would otherwise overflow near window
 * edges with no way to scroll them back.
 *
 * `anchorHeight` lets the popup flip above the selection's top edge (`y - anchorHeight`) without
 * covering the selected text.
 *
 * Usage: attach ref to the popup root and apply left/top (the element keeps `-translate-x-1/2`).
 * Runs in a layout effect (no flicker) and re-clamps via ResizeObserver as the popup resizes.
 */

/** Minimum margin from viewport edges. */
const MARGIN = 8
/** Gap between popup and selection. */
const GAP = 8

export function useViewportAnchor<T extends HTMLElement>(
  x: number,
  y: number,
  /** Anchor rect height, used to clear the anchor when flipping above. */
  anchorHeight: number,
): { ref: React.RefObject<T | null>; left: number; top: number } {
  const ref = useRef<T>(null)
  const [pos, setPos] = useState({ left: x, top: y + GAP })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const place = (): void => {
      const { width, height } = el.getBoundingClientRect()
      const half = width / 2
      // x is the center, so reserve half the width each side; if the window is narrower, prefer the left edge.
      const left = Math.min(Math.max(x, MARGIN + half), Math.max(MARGIN + half, window.innerWidth - MARGIN - half))
      // Below by default; flip above the top edge if it doesn't fit; pin to the top edge as a last resort.
      const below = y + GAP
      const above = y - anchorHeight - GAP - height
      const top = below + height <= window.innerHeight - MARGIN ? below : Math.max(MARGIN, above)
      setPos({ left, top })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(el)
    return () => ro.disconnect()
  }, [x, y, anchorHeight])

  return { ref, ...pos }
}
