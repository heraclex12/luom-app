// Practice domain facade: Write back (use your words in a situation, get AI feedback, the word counts as a review)
// and Say it (say a word or a sentence; the Mac's on-device speech recognition checks it came across).
// AI situations and feedback come from main (practiceBridge); speech from main (voiceBridge); storage in ./data.
// Pages import only from here.
import { db } from '@/db/client'
import { practiceBridge, voiceBridge } from '@/platform'
import { aiConfigFrom, getSettings } from '@/settings'
import { calibratedNowSync } from '@/sync/clock'
import * as wordbook from '@/wordbook'
import {
  localSituation,
  pickKind,
  remainingWords,
  type Feedback,
  type PracticeWord,
  type Situation,
  type Turn,
} from '../../../shared/practice'
import { checkWord, misheardPairs as findMisheardPairs, type Recognition, type WordCheck } from '../../../shared/voice'
import * as data from './data'
import { planFinish, type PracticeAction, type TurnRecord } from './session'

export { CONVERSATION_KINDS, MAX_TURNS } from '../../../shared/practice'
export type { Feedback, PracticeWord, Situation, SituationKind, Turn, Verdict, WordFeedback } from '../../../shared/practice'
export { alignSentence, checkWord, CLEAR_CONFIDENCE } from '../../../shared/voice'
export type { Recognition, ShadowToken, WordCheck } from '../../../shared/voice'
export type { StoredSentence } from './data'
export { suggestedActions } from './session'
export type { PracticeAction, TurnRecord } from './session'

const toPracticeWord = (w: wordbook.ActivityWord): PracticeWord => ({
  dictId: w.dictId,
  term: w.term,
  meaning: w.meaning,
  state: w.state,
  example: w.examples[0] ? { en: w.examples[0].sentence, vi: w.examples[0].translation } : undefined,
})

/** These words, ready to practise (the pop quiz round's own words). */
export async function practiceWordsFor(dictIds: readonly number[]): Promise<PracticeWord[]> {
  return (await wordbook.activityWordsFor(dictIds)).map(toPracticeWord)
}

/** A round for the Write back page: due words first. */
export async function practiceRound(max = 2): Promise<PracticeWord[]> {
  return (await wordbook.activityRound(max)).map(toPracticeWord)
}

/** A situation for these words: the kind is picked at random, weighted by how well they are known. */
export async function situationFor(words: readonly PracticeWord[], random: () => number = Math.random): Promise<Situation> {
  const kind = pickKind(words, random)
  const local = localSituation(kind, words)
  if (local) return local
  const settings = await getSettings()
  return practiceBridge.situation({
    kind,
    words: words.map((w) => ({ term: w.term, meaning: w.meaning })),
    ai: aiConfigFrom(settings),
  })
}

/** Feedback on the learner's latest reply (the last "you" turn), in the language chosen in Settings. */
export async function feedbackFor(situation: Situation, turns: readonly Turn[], earlier: readonly TurnRecord[]): Promise<Feedback> {
  const settings = await getSettings()
  return practiceBridge.feedback({
    situation,
    turns: [...turns],
    remaining: remainingWords(situation.words, earlier.map((t) => t.feedback.words)),
    language: settings.feedbackLanguage,
    ai: aiConfigFrom(settings),
  })
}

/** Done: record each word's review (the learner's choice) and keep every attempt as one of its sentences. Returns
 *  how many reviews changed the schedule (a word not due yet only counts as seen, as in a pop quiz). */
export async function finishPractice(
  words: readonly PracticeWord[],
  situation: Situation,
  turns: readonly TurnRecord[],
  actions: Readonly<Record<string, PracticeAction>>,
): Promise<number> {
  const plan = planFinish(words, situation.kind, turns, actions, calibratedNowSync())
  await data.saveSentences(db, plan.sentences)
  let rated = 0
  for (const r of plan.ratings) if ((await wordbook.quickRate(r.dictId, r.action)) === 'rated') rated++
  return rated
}

export const sentencesOf = (dictId: number): Promise<data.StoredSentence[]> => data.sentencesOf(db, dictId)
export const deleteSentence = (id: number): Promise<void> => data.deleteSentence(db, id)

// ── Say it ──

/** Ask for the microphone (macOS asks once). */
export const micAccess = (): Promise<'granted' | 'denied'> => voiceBridge.mic()
export const openPrivacySettings = (pane: 'microphone' | 'speech'): Promise<void> => voiceBridge.openPrivacy(pane)

/** What the Mac heard in a recording (on-device). */
export const recognize = (wav: Uint8Array): Promise<Recognition> => voiceBridge.recognize(wav)

/** Check a spoken word and remember the try (misheard pairs come from these). */
export async function checkSpokenWord(word: { dictId: number; term: string }, rec: Recognition): Promise<WordCheck> {
  const check = checkWord(word.term, rec)
  await data.recordAttempt(db, {
    dictId: word.dictId,
    target: word.term,
    heard: check.heard,
    ok: check.ok,
    confidence: check.confidence,
    createdAt: calibratedNowSync(),
  })
  return check
}

/** Words the Mac heard as another word, most frequent first. */
export async function misheardPairs(): Promise<{ dictId: number; target: string; heard: string; count: number }[]> {
  return findMisheardPairs(await data.recentAttempts(db, 400))
}
