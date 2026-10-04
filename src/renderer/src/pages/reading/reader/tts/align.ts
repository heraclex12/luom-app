/**
 * Read-aloud text helpers: script detection and pre-synthesis normalization. Pure, no DOM.
 */

// Main CJK ranges (unified ideographs + ext. A + kana + hangul).
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿]/

/** Whether text contains CJK (duration estimate: CJK by character, Latin by word). */
export function isCjk(text: string): boolean {
  return CJK_RE.test(text)
}

/** Normalize before Edge synthesis: collapse whitespace and trim (main does it too; done here for stable estimates / cache keys). */
export function normalizeSynthText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
