// Guided tour: a fixed walk over the sidebar, Back / Next that stop at the ends, tip copy that names the user's own
// capture hotkey, when Home offers the tour to people who never took it, and where the tip card sits next to the
// highlighted item (beside it, clamped inside the window, flipping below when there is no room on the right).
import { describe, expect, it } from 'vitest'
import {
  TOUR_STEPS,
  backStep,
  cardPlacement,
  isLastTourStep,
  nextStep,
  shouldOfferTour,
  shouldStartTourAfterSetup,
  tipBody,
} from './tour'

describe('tour steps', () => {
  it('walks the sidebar top to bottom: add a word, the five sections, then settings', () => {
    expect(TOUR_STEPS.map((s) => s.target)).toEqual(['add', 'words', 'play', 'dictionary', 'reading', 'resources', 'settings'])
    for (const s of TOUR_STEPS) {
      expect(s.title.trim().length).toBeGreaterThan(0)
      expect(s.body.trim().length).toBeGreaterThan(0)
      // Short enough to read at a glance.
      expect(s.body.length).toBeLessThanOrEqual(170)
    }
  })

  it('next and back move one stop and stop at the ends', () => {
    expect(nextStep(0)).toBe(1)
    expect(backStep(1)).toBe(0)
    expect(backStep(0)).toBe(0)
    const last = TOUR_STEPS.length - 1
    expect(isLastTourStep(last)).toBe(true)
    expect(isLastTourStep(last - 1)).toBe(false)
    expect(nextStep(last)).toBe(last)
  })

  it('the capture tip names the hotkey the user actually has (or the button when it is off)', () => {
    const add = TOUR_STEPS.find((s) => s.target === 'add')!
    expect(tipBody(add, '⌥⌘E')).toContain('⌥⌘E')
    expect(tipBody(add, '⌃⇧L')).toContain('⌃⇧L')
    expect(tipBody(add, '')).not.toContain('{shortcut}')
    expect(tipBody(add, '')).not.toMatch(/press\s*[,.]/)
    const words = TOUR_STEPS.find((s) => s.target === 'words')!
    expect(tipBody(words, '⌥⌘E')).toBe(words.body)
  })
})

describe('when to offer the tour', () => {
  it('Home offers it once to people who finished setup but never saw the tour, and never while it runs', () => {
    expect(shouldOfferTour({ onboarded: 1, tourSeen: 0 }, false)).toBe(true)
    expect(shouldOfferTour({ onboarded: 1, tourSeen: 0 }, true)).toBe(false)
    expect(shouldOfferTour({ onboarded: 1, tourSeen: 1 }, false)).toBe(false)
    // Still in first-run setup: the welcome flow comes first.
    expect(shouldOfferTour({ onboarded: 0, tourSeen: 0 }, false)).toBe(false)
  })

  it('finishing setup starts the tour only for people who have not seen it (running setup again does not)', () => {
    expect(shouldStartTourAfterSetup({ tourSeen: 0 })).toBe(true)
    expect(shouldStartTourAfterSetup({ tourSeen: 1 })).toBe(false)
  })
})

describe('tip card placement', () => {
  const viewport = { width: 1280, height: 800 }
  const card = { width: 320, height: 180 }

  it('sits to the right of the item, vertically centred on it, with the arrow pointing at its middle', () => {
    const target = { x: 8, y: 300, width: 208, height: 36 }
    const p = cardPlacement(target, viewport, card)
    expect(p.side).toBe('right')
    expect(p.left).toBe(8 + 208 + 16)
    expect(p.top).toBe(300 + 18 - 90)
    expect(p.arrow).toBe(90)
  })

  it('stays inside the window near the top and bottom edges; the arrow still points at the item', () => {
    const top = cardPlacement({ x: 8, y: 30, width: 208, height: 36 }, viewport, card)
    expect(top.top).toBe(12)
    expect(top.arrow).toBe(30 + 18 - 12)
    const bottom = cardPlacement({ x: 8, y: 740, width: 208, height: 56 }, viewport, card)
    expect(bottom.top).toBe(800 - 180 - 12)
    expect(bottom.top + bottom.arrow).toBe(740 + 28)
  })

  it('keeps the arrow off the rounded corners', () => {
    const p = cardPlacement({ x: 8, y: 0, width: 208, height: 4 }, viewport, card)
    expect(p.arrow).toBeGreaterThanOrEqual(20)
  })

  it('goes below the item when there is no room on the right', () => {
    const p = cardPlacement({ x: 1100, y: 100, width: 150, height: 40 }, viewport, card)
    expect(p.side).toBe('below')
    expect(p.top).toBe(100 + 40 + 16)
    expect(p.left + card.width).toBeLessThanOrEqual(viewport.width - 12)
  })
})
