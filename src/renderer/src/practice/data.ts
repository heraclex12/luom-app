// Write back and Say it storage (user_sentence / speech_attempt, via Drizzle).
import { desc, eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { speechAttempt, userSentence } from '@/db/schema'
import type { SituationKind, Verdict } from '../../../shared/practice'
import type { SpeechAttemptLike } from '../../../shared/voice'

export interface SentenceRow {
  dictId: number
  text: string
  better: string
  verdict: Exclude<Verdict, 'missing'>
  kind: SituationKind
  createdAt: number
}

export interface StoredSentence extends SentenceRow {
  id: number
}

export async function saveSentences(db: Db, rows: readonly SentenceRow[]): Promise<void> {
  if (rows.length === 0) return
  await db.insert(userSentence).values([...rows])
}

/** A word's sentences, newest first. */
export async function sentencesOf(db: Db, dictId: number, limit = 30): Promise<StoredSentence[]> {
  const rows = await db
    .select()
    .from(userSentence)
    .where(eq(userSentence.dictId, dictId))
    .orderBy(desc(userSentence.createdAt), desc(userSentence.id))
    .limit(limit)
  return rows.map((r) => ({ ...r, verdict: r.verdict as StoredSentence['verdict'], kind: r.kind as SituationKind }))
}

export async function deleteSentence(db: Db, id: number): Promise<void> {
  await db.delete(userSentence).where(eq(userSentence.id, id))
}

export async function recordAttempt(
  db: Db,
  a: { dictId: number; target: string; heard: string; ok: boolean; confidence: number | null; createdAt: number },
): Promise<void> {
  await db.insert(speechAttempt).values({ ...a, ok: a.ok ? 1 : 0 })
}

/** The latest tries at saying words, newest first. */
export async function recentAttempts(db: Db, limit: number): Promise<SpeechAttemptLike[]> {
  const rows = await db
    .select({ dictId: speechAttempt.dictId, target: speechAttempt.target, heard: speechAttempt.heard, ok: speechAttempt.ok })
    .from(speechAttempt)
    .orderBy(desc(speechAttempt.createdAt), desc(speechAttempt.id))
    .limit(limit)
  return rows.map((r) => ({ ...r, ok: r.ok === 1 }))
}
