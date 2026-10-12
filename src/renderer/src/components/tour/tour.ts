// Guided tour (pure): a getting-started walk for a new user, plus navigation, when to offer it and where the tip card
// goes. The overlay in ./GuidedTour.tsx is a thin view over this; targets are elements marked data-tour="<target>".
import { FREE_DAILY_ANSWERS } from '../../../../shared/ai'

export type TourTarget =
  | 'dictionary'
  | 'lookup-search'
  | 'lookup-suggest'
  | 'word-meaning'
  | 'word-source'
  | 'word-tabs'
  | 'word-add'
  | 'settings-hotkey'
  | 'settings-access'
  | 'settings-reminders'
  | 'settings-popquiz'
  | 'settings-ai'
  | 'home-today'
  | 'home-garden'
  | 'home-next'

export type TourSettingsSection = 'capture' | 'reminders' | 'ai'

export interface TourStep {
  id: string
  /** Area to spotlight; none = a centred card over the whole window. */
  target?: TourTarget
  /** A second area the spotlight stretches to cover as well (when it is on screen). */
  with?: TourTarget
  /** Page the step lives on (the tour goes there first); none = stay where the user is. */
  route?: string
  /** Settings section open during the step; Settings is closed on every other step. */
  settings?: TourSettingsSection
  /** Skipped when its target is not on screen (Home before any word is saved). */
  optional?: boolean
  /** The step moves on by itself once this appears (the user did the thing). */
  waitFor?: TourTarget
  /** While waiting, the primary button looks this word up for the user. */
  tryWord?: string
  /** The highlighted control takes the focus, so the user can type straight away. */
  interactive?: boolean
  title: string
  /** Tip text; `{shortcut}` is replaced with the user's capture hotkey (see tipBody). */
  body: string
  /** A short looping clip shown above the tip (muted), for a feature words alone do not explain. */
  media?: { src: string; poster?: string; label: string }
  /** Numbered moves under the tip (`{shortcut}` filled in as in body). */
  moves?: readonly string[]
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'dictionary',
    target: 'dictionary',
    title: 'Start with a word',
    body: 'Lượm is built around the words you meet. Let’s look one up in the Dictionary.',
  },
  {
    id: 'search',
    route: '/lookup',
    target: 'lookup-search',
    with: 'lookup-suggest',
    waitFor: 'word-meaning',
    tryWord: 'resilient',
    interactive: true,
    title: 'Type a word, press Enter',
    body: 'Any English word or phrase: one you met today, or try our example.',
  },
  {
    id: 'meaning',
    route: '/lookup',
    target: 'word-meaning',
    with: 'word-source',
    title: 'The meaning, in Vietnamese',
    body: 'Every meaning with its part of speech. Switch Tiếng Việt to English for English–English definitions. The speaker plays US or UK.',
  },
  {
    id: 'details',
    route: '/lookup',
    target: 'word-tabs',
    title: 'Examples, word family, synonyms',
    body: 'Example sentences with their Vietnamese, related word forms, synonyms and antonyms, and common phrases. Click a tab.',
  },
  {
    id: 'keep',
    route: '/lookup',
    target: 'word-add',
    title: 'Keep it',
    body: 'Add it to My words. Lượm brings it back for review right before you would forget it.',
  },
  {
    id: 'capture',
    settings: 'capture',
    target: 'settings-hotkey',
    title: 'Save words from any app',
    body: 'The fastest way to keep words. Reading in Chrome, a PDF or a chat? You never need to copy, switch apps or type:',
    media: { src: './onboarding/capture-demo.mp4', poster: './onboarding/capture-demo.jpg', label: 'Selecting “resilient” in an article, pressing the shortcut, and the meaning card opening' },
    moves: ['Select the word', 'Press {shortcut}', 'The Vietnamese meaning pops up, and the word is in My words'],
  },
  {
    id: 'access',
    settings: 'capture',
    target: 'settings-access',
    title: 'Allow it once',
    body: 'macOS asks before an app can read the word you select. Click Grant access and switch on Lượm under Accessibility. Shows Enabled? You’re set.',
  },
  {
    id: 'reminders',
    settings: 'reminders',
    target: 'settings-reminders',
    title: 'Pick your reminder time',
    body: 'A daily nudge when words are waiting for you. Choose a time that suits your day; you can change it here any time.',
  },
  {
    id: 'popquiz',
    settings: 'reminders',
    target: 'settings-popquiz',
    title: 'Pop quizzes during the day',
    body: 'A quiz card pops up in the corner with your words. Choose how often, your active hours and how many words each quiz asks.',
  },
  {
    id: 'ai',
    settings: 'ai',
    target: 'settings-ai',
    title: 'Better AI with ChatGPT',
    body: `Lượm (Free) gives ${FREE_DAILY_ANSWERS} AI answers a day. Choose ChatGPT and sign in for no daily limit and better examples, feedback and stories.`,
  },
  {
    id: 'today',
    route: '/wordbook',
    target: 'home-today',
    title: 'Your day starts here',
    body: 'How many words are waiting today. Press Study for a short session; new words come in a few at a time.',
  },
  {
    id: 'garden',
    route: '/wordbook',
    target: 'home-garden',
    optional: true,
    title: 'Your word garden',
    body: 'Every saved word is a plant: review to water it, master it to make it bloom. Keep going and the garden grows.',
  },
  {
    id: 'next',
    route: '/wordbook',
    target: 'home-next',
    optional: true,
    title: 'Something new every day',
    body: 'A story episode written with your words, or a game to play once your review is done.',
  },
  {
    id: 'done',
    title: 'You’re ready',
    body: 'Explore Play, Reading and Resources at your own pace. Replay this tour any time from Settings, General.',
  },
]

export const isLastTourStep = (i: number): boolean => i >= TOUR_STEPS.length - 1
export const nextStep = (i: number): number => Math.min(i + 1, TOUR_STEPS.length - 1)
export const backStep = (i: number): number => Math.max(i - 1, 0)

/** Where the step happens: the page to be on (null = stay) and the Settings section to show (null = Settings closed). */
export const stepScene = (s: TourStep): { route: string | null; settings: TourSettingsSection | null } => ({
  route: s.route ?? null,
  settings: s.settings ?? null,
})

/** From `i`, keep moving in `dir` past optional stops whose target is missing; required stops are never skipped. */
export function skipMissing(i: number, dir: 1 | -1, missing: (i: number) => boolean): number {
  let at = i
  while (TOUR_STEPS[at]?.optional && missing(at)) {
    const to = at + dir
    if (to < 0 || to >= TOUR_STEPS.length) break
    at = to
  }
  return at
}

const fillShortcut = (text: string, shortcut: string): string =>
  text.replace('{shortcut}', shortcut || 'the capture hotkey (set one here)')

/** The step's tip with the user's hotkey filled in; with no hotkey set, point at the setting instead. */
export const tipBody = (step: TourStep, shortcut: string): string => fillShortcut(step.body, shortcut)

/** The step's numbered moves, hotkey filled in the same way. */
export const tipMoves = (step: TourStep, shortcut: string): string[] =>
  (step.moves ?? []).map((m) => fillShortcut(m, shortcut))

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
  /** Which side of the highlighted area the card is on; 'over' = floating at the bottom centre (no room around it). */
  side: 'right' | 'below' | 'left' | 'above' | 'over'
  left: number
  top: number
  /** Arrow offset along the card edge facing the area (from the card's top for left/right, its left for above/below). */
  arrow: number
}

const GAP = 16
const MARGIN = 12
/** Keep the arrow clear of the card's rounded corners. */
const ARROW_INSET = 20

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi))

/**
 * Tip card next to the highlighted area, kept inside the window: to its right, else below, left, above; when the area
 * fills the window, the card floats at the bottom centre over it.
 */
export function cardPlacement(
  target: Rect,
  viewport: { width: number; height: number },
  card: { width: number; height: number },
): Placement {
  const cx = target.x + target.width / 2
  const cy = target.y + target.height / 2
  const vTop = (): number => clamp(cy - card.height / 2, MARGIN, viewport.height - card.height - MARGIN)
  const hLeft = (): number => clamp(cx - card.width / 2, MARGIN, viewport.width - card.width - MARGIN)
  const vArrow = (top: number): number => clamp(cy - top, ARROW_INSET, card.height - ARROW_INSET)
  const hArrow = (left: number): number => clamp(cx - left, ARROW_INSET, card.width - ARROW_INSET)

  const rightLeft = target.x + target.width + GAP
  if (rightLeft + card.width <= viewport.width - MARGIN) {
    const top = vTop()
    return { side: 'right', left: rightLeft, top, arrow: vArrow(top) }
  }
  const belowTop = target.y + target.height + GAP
  if (belowTop + card.height <= viewport.height - MARGIN) {
    const left = hLeft()
    return { side: 'below', left, top: belowTop, arrow: hArrow(left) }
  }
  const leftLeft = target.x - GAP - card.width
  if (leftLeft >= MARGIN) {
    const top = vTop()
    return { side: 'left', left: leftLeft, top, arrow: vArrow(top) }
  }
  const aboveTop = target.y - GAP - card.height
  if (aboveTop >= MARGIN) {
    const left = hLeft()
    return { side: 'above', left, top: aboveTop, arrow: hArrow(left) }
  }
  return { side: 'over', left: (viewport.width - card.width) / 2, top: viewport.height - card.height - 24, arrow: 0 }
}
