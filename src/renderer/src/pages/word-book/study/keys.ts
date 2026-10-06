// Study keyboard map (pure; the page owns the listener and works out `blocked`).

/** Rating buttons, in on-screen order: key 1 = the first. (No Easy grade: the scheduler rates in three.) */
export const RATING_ORDER = ['again', 'hard', 'good'] as const
export type RatingKey = (typeof RATING_ORDER)[number]

export interface StudyKeyState {
  /** The card is a flip card (reveal + rating bar). */
  flip: boolean
  revealed: boolean
  /** A rating can be undone. */
  canUndo: boolean
  /** A dialog is open or focus is in a text field. */
  blocked: boolean
}

export type StudyKeyAction = { type: 'reveal' } | { type: 'rate'; rating: RatingKey } | { type: 'undo' } | null

/**
 * Hidden flip card: Space / Enter reveal. Revealed: 1–3 rate in on-screen order, Enter / Space = Good.
 * Anywhere: Z or ⌘Z undo the last rating. Other chords (⇧⌘Z, Ctrl, Alt) and key repeats are ignored.
 */
export function studyKeyAction(
  e: { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; repeat?: boolean },
  s: StudyKeyState,
): StudyKeyAction {
  if (s.blocked || e.repeat || e.ctrlKey || e.altKey) return null
  if (e.key.toLowerCase() === 'z') return s.canUndo && !(e.metaKey && e.shiftKey) ? { type: 'undo' } : null
  if (e.metaKey || !s.flip) return null
  const confirm = e.key === ' ' || e.key === 'Enter'
  if (!s.revealed) return confirm ? { type: 'reveal' } : null
  if (confirm) return { type: 'rate', rating: 'good' }
  const n = Number(e.key)
  return Number.isInteger(n) && n >= 1 && n <= RATING_ORDER.length ? { type: 'rate', rating: RATING_ORDER[n - 1] } : null
}
