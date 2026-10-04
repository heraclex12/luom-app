// Rate a word straight from a word-flash notification (Got it / Again), without a study session.
import type { Db } from '@/db/client'
import { rate } from './scheduler/queue'
import { nextDayAt } from './time'
import { getWord } from './words'

export type QuickAction = 'good' | 'again'

/**
 * "Again" = Again rating (relearn soon). "Got it" = Good rating only when the word is due today; otherwise it is
 * just an exposure and the schedule is left alone. Returns what happened.
 */
export async function quickRate(db: Db, dictId: number, action: QuickAction, now: number): Promise<'rated' | 'noted' | 'ignored'> {
  const word = await getWord(db, dictId)
  if (!word || word.state > 3) return 'ignored'
  const due = word.due != null && word.due < nextDayAt(now)
  if (action === 'good' && !due) return 'noted'
  const res = await rate(db, null, { dictId, rating: action === 'good' ? 3 : 1, durationMs: 0, snapshotReps: word.reps }, now)
  return res.kind === 'rated' ? 'rated' : 'ignored'
}
