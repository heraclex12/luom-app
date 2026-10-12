// Guided tour: a getting-started walk (look a word up, keep it, the capture hotkey, reminders, then Home), Back / Next
// that stop at the ends and skip stops that are not on screen, tip copy that names the user's own capture hotkey, when
// Home offers the tour, and where the tip card sits next to the highlighted area.
import { describe, expect, it } from 'vitest'
import {
  TOUR_STEPS,
  backStep,
  cardPlacement,
  isLastTourStep,
  nextStep,
  shouldOfferTour,
  shouldStartTourAfterSetup,
  skipMissing,
  stepScene,
  tipBody,
  tipMoves,
} from './tour'
import { FREE_DAILY_ANSWERS } from '../../../../shared/ai'

const ids = TOUR_STEPS.map((s) => s.id)
const step = (id: string) => TOUR_STEPS.find((s) => s.id === id)!

describe('tour steps', () => {
  it('gets a new user started: a word in the Dictionary, the capture hotkey, reminders and pop quizzes, Home, then explore', () => {
    expect(ids).toEqual([
      'dictionary', 'search', 'meaning', 'details', 'keep',
      'capture', 'access', 'reminders', 'popquiz', 'ai',
      'today', 'garden', 'next', 'done',
    ])
    for (const s of TOUR_STEPS) {
      expect(s.title.trim().length).toBeGreaterThan(0)
      expect(s.body.trim().length).toBeGreaterThan(0)
      // Short enough to read at a glance.
      expect(s.body.length).toBeLessThanOrEqual(170)
    }
    // The last stop has nothing to point at: it hands over to the user.
    expect(step('done').target).toBeUndefined()
  })

  it('looking a word up waits for the user (or the example word) before moving on', () => {
    const search = step('search')
    expect(search.route).toBe('/lookup')
    expect(search.waitFor).toBe(step('meaning').target)
    expect(search.tryWord).toBe('resilient')
    expect(search.interactive).toBe(true)
  })

  it('the meaning stop also shows the switch to English–English definitions', () => {
    expect(step('meaning').with).toBe('word-source')
    expect(step('meaning').body).toMatch(/English/)
  })

  it('the capture stop shows it working (a short clip) and spells out the three moves with the user’s hotkey', () => {
    const capture = step('capture')
    expect(capture.media?.src).toMatch(/\.mp4$/)
    expect(capture.moves).toHaveLength(3)
    expect(tipMoves(capture, '⌥⌘E').join(' ')).toContain('⌥⌘E')
    expect(tipMoves(capture, '').join(' ')).not.toContain('{shortcut}')
    // The next stop is the one-time macOS permission the hotkey needs.
    expect(step('access').target).toBe('settings-access')
    expect(step('access').body).toMatch(/Accessibility/)
  })

  it('offers ChatGPT for AI with no daily limit, naming the real free allowance', () => {
    const ai = step('ai')
    expect(stepScene(ai)).toEqual({ route: null, settings: 'ai' })
    expect(ai.body).toMatch(/ChatGPT/)
    expect(ai.body).toContain(String(FREE_DAILY_ANSWERS))
  })

  it('opens Settings on Quick capture, then Reminders (daily reminder, then pop quizzes), and closes it elsewhere', () => {
    expect(stepScene(step('capture'))).toEqual({ route: null, settings: 'capture' })
    expect(stepScene(step('access'))).toEqual({ route: null, settings: 'capture' })
    expect(stepScene(step('reminders'))).toEqual({ route: null, settings: 'reminders' })
    expect(stepScene(step('popquiz'))).toEqual({ route: null, settings: 'reminders' })
    expect(step('reminders').target).not.toBe(step('popquiz').target)
    expect(stepScene(step('meaning'))).toEqual({ route: '/lookup', settings: null })
    expect(stepScene(step('today'))).toEqual({ route: '/wordbook', settings: null })
    expect(stepScene(step('done'))).toEqual({ route: null, settings: null })
  })

  it('Home stops that may not exist yet (no saved words) are optional; the rest are not', () => {
    expect(TOUR_STEPS.filter((s) => s.optional).map((s) => s.id)).toEqual(['garden', 'next'])
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

  it('skips optional stops that are not on screen, in the direction of travel', () => {
    const garden = ids.indexOf('garden')
    const next = ids.indexOf('next')
    const missing = (i: number): boolean => i === garden || i === next
    expect(skipMissing(garden, 1, missing)).toBe(ids.indexOf('done'))
    expect(skipMissing(next, -1, missing)).toBe(ids.indexOf('today'))
    // Present, or not optional: stays put.
    expect(skipMissing(garden, 1, () => false)).toBe(garden)
    expect(skipMissing(ids.indexOf('today'), 1, () => true)).toBe(ids.indexOf('today'))
  })

  it('the hotkey tips name the hotkey the user actually has (or point at the setting when it is off)', () => {
    const capture = step('capture')
    expect(tipMoves(capture, '⌃⇧L')[1]).toContain('⌃⇧L')
    expect(tipMoves(capture, '')[1]).not.toMatch(/press\s*[,.]?$/i)
    expect(tipBody(capture, '⌥⌘E')).not.toContain('{shortcut}')
    expect(tipBody(step('meaning'), '⌥⌘E')).toBe(step('meaning').body)
    expect(tipMoves(step('meaning'), '⌥⌘E')).toEqual([])
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

  it('goes to the left of a wide area that leaves no room right or below (the garden)', () => {
    const p = cardPlacement({ x: 360, y: 200, width: 900, height: 560 }, viewport, card)
    expect(p.side).toBe('left')
    expect(p.left).toBe(360 - 16 - 320)
    expect(p.top).toBe(200 + 280 - 90)
  })

  it('goes above when only the space above is free', () => {
    const p = cardPlacement({ x: 100, y: 500, width: 1100, height: 280 }, viewport, card)
    expect(p.side).toBe('above')
    expect(p.top).toBe(500 - 16 - 180)
  })

  it('floats at the bottom centre over an area that fills the window', () => {
    const p = cardPlacement({ x: 0, y: 0, width: 1280, height: 800 }, viewport, card)
    expect(p.side).toBe('over')
    expect(p.left).toBe((1280 - 320) / 2)
    expect(p.top).toBe(800 - 180 - 24)
  })
})
