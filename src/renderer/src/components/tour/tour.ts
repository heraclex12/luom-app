// Guided tour over the sidebar (pure: steps, navigation, when to offer it, where the tip card goes). The overlay in
// ./GuidedTour.tsx is a thin view over this; targets are the sidebar elements marked data-tour="<target>".

export type TourTarget = 'add' | 'words' | 'play' | 'dictionary' | 'reading' | 'resources' | 'settings'

export interface TourStep {
  target: TourTarget
  title: string
  /** Tip text; `{shortcut}` is replaced with the user's capture hotkey (see tipBody). */
  body: string
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: 'add',
    title: 'Save a word from anywhere',
    body: 'Select a word in any app and press {shortcut}. Lượm shows the Vietnamese meaning and keeps the word for you.',
  },
  {
    target: 'words',
    title: 'My words',
    body: 'Everything you saved, what is due today and your word garden. Words come back right before you would forget them.',
  },
  {
    target: 'play',
    title: 'Play',
    body: 'Games, a daily story episode, and speaking and writing practice, all made from your own words.',
  },
  {
    target: 'dictionary',
    title: 'Dictionary',
    body: 'Look up any English word: Vietnamese meanings, US and UK sound, examples and the word family.',
  },
  {
    target: 'reading',
    title: 'Reading',
    body: 'Open EPUB, PDF or Markdown files and save words with one click while you read.',
  },
  {
    target: 'resources',
    title: 'Resources',
    body: 'Sounds Vietnamese speakers mix up, word endings, irregular and phrasal verbs, confusing words and everyday phrases.',
  },
  {
    target: 'settings',
    title: 'Settings',
    body: 'Pick your reminder time, pop quizzes, the capture hotkey and AI help. Add the Lượm widget from your desktop’s Edit Widgets.',
  },
]

export const isLastTourStep = (i: number): boolean => i >= TOUR_STEPS.length - 1
export const nextStep = (i: number): number => Math.min(i + 1, TOUR_STEPS.length - 1)
export const backStep = (i: number): number => Math.max(i - 1, 0)

/** The step's tip with the user's hotkey filled in; with no hotkey set, point at the button instead. */
export function tipBody(step: TourStep, shortcut: string): string {
  if (!step.body.includes('{shortcut}')) return step.body
  return shortcut
    ? step.body.replace('{shortcut}', shortcut)
    : step.body.replace('Select a word in any app and press {shortcut}.', 'Click here to type a word, or set a capture hotkey in Settings.')
}

/** Home's one-time "take the tour" card: for people past setup who never saw the tour, hidden while it runs. */
export const shouldOfferTour = (s: { onboarded: 0 | 1; tourSeen: 0 | 1 }, running: boolean): boolean =>
  s.onboarded === 1 && s.tourSeen === 0 && !running

/** Finishing the welcome flow starts the tour the first time only (running setup again from Settings does not). */
export const shouldStartTourAfterSetup = (s: { tourSeen: 0 | 1 }): boolean => s.tourSeen === 0

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Placement {
  side: 'right' | 'below'
  left: number
  top: number
  /** Arrow offset along the card edge facing the item (from the card's top for 'right', its left for 'below'). */
  arrow: number
}

const GAP = 16
const MARGIN = 12
/** Keep the arrow clear of the card's rounded corners. */
const ARROW_INSET = 20

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi))

/** Tip card beside the highlighted item (centred on it, kept inside the window), or below it when the right is full. */
export function cardPlacement(
  target: Rect,
  viewport: { width: number; height: number },
  card: { width: number; height: number },
): Placement {
  const cx = target.x + target.width / 2
  const cy = target.y + target.height / 2
  const rightLeft = target.x + target.width + GAP
  if (rightLeft + card.width <= viewport.width - MARGIN) {
    const top = clamp(cy - card.height / 2, MARGIN, viewport.height - card.height - MARGIN)
    return { side: 'right', left: rightLeft, top, arrow: clamp(cy - top, ARROW_INSET, card.height - ARROW_INSET) }
  }
  const left = clamp(cx - card.width / 2, MARGIN, viewport.width - card.width - MARGIN)
  return {
    side: 'below',
    left,
    top: target.y + target.height + GAP,
    arrow: clamp(cx - left, ARROW_INSET, card.width - ARROW_INSET),
  }
}
