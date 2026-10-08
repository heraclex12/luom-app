// Say it and shadowing: compare what the Mac heard (native/speech-helper.swift, via main/voice.ts) with what the
// learner meant to say. On-device recognition tells whether a word came across as that word, not how each sound was
// made, so these checks are about being understood.
import { findUsedWords } from './story'

export interface Recognition {
  /** Best transcription ('' when nothing was heard). */
  text: string
  words: { text: string; confidence: number }[]
  /** Other readings, least likely last. */
  alternatives: string[]
}

export interface WordCheck {
  /** The target (or a form of it) was heard. */
  ok: boolean
  /** Everything that was heard. */
  heard: string
  /** How sure the recognizer was of the target word (or of what it heard instead); null when nothing was heard. */
  confidence: number | null
}

/** Below this the word came through, but only just. */
export const CLEAR_CONFIDENCE = 0.6

const norm = (s: string): string => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, '')

export function checkWord(target: string, rec: Recognition): WordCheck {
  const heard = rec.text.trim()
  if (!heard) return { ok: false, heard: '', confidence: null }
  const ok = findUsedWords([target], [heard]).length > 0
  const first = norm(target.split(/\s+/)[0] ?? '')
  // The target's own segment when it was heard (a form of it starts with the same letters), else the lowest one.
  const own = ok ? rec.words.find((w) => norm(w.text).startsWith(first.slice(0, Math.max(3, first.length - 2)))) : undefined
  const confidence = own?.confidence ?? (rec.words.length ? Math.min(...rec.words.map((w) => w.confidence)) : null)
  return { ok, heard, confidence }
}

export interface ShadowToken {
  text: string
  /** null for spaces and punctuation (shown, never counted). */
  hit: boolean | null
}

/** The sentence split into words (heard or missed, matched in order) and the share of words heard. */
export function alignSentence(target: string, heardText: string): { tokens: ShadowToken[]; score: number } {
  const parts = target.match(/[\p{L}\p{N}’']+|[^\p{L}\p{N}’']+/gu) ?? []
  const wordIdx = parts.map((p, i) => (norm(p) ? i : -1)).filter((i) => i >= 0)
  const a = wordIdx.map((i) => norm(parts[i]!))
  const b = heardText.split(/\s+/).map(norm).filter(Boolean)
  // Longest common subsequence: the words heard in the right order.
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
  const hits = new Set<number>()
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) {
      hits.add(i)
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++
    else j++
  }
  const tokens = parts.map((text, i): ShadowToken => {
    const k = wordIdx.indexOf(i)
    return { text, hit: k < 0 ? null : hits.has(k) }
  })
  return { tokens, score: a.length ? hits.size / a.length : 0 }
}

export interface SpeechAttemptLike {
  dictId: number
  target: string
  heard: string
  ok: boolean
}

/** Words the Mac heard as a different word (one or two words heard), most frequent first. */
export function misheardPairs(attempts: readonly SpeechAttemptLike[]): { dictId: number; target: string; heard: string; count: number }[] {
  const pairs = new Map<string, { dictId: number; target: string; heard: string; count: number }>()
  for (const a of attempts) {
    const heard = a.heard.trim().toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, '')
    if (a.ok || !heard || heard.split(/\s+/).length > 2 || heard === a.target.toLowerCase()) continue
    const key = `${a.target.toLowerCase()}|${heard}`
    const p = pairs.get(key) ?? { dictId: a.dictId, target: a.target, heard, count: 0 }
    p.count++
    pairs.set(key, p)
  }
  return [...pairs.values()].sort((x, y) => y.count - x.count)
}
