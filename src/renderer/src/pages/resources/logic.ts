// Resources (pure): searching the lists and picking quiz questions.

/** Lower case, without Vietnamese tone and vowel marks (đ → d), so "tu bo" finds "từ bỏ". */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .trim()
}

/** Every word of the query appears somewhere in the fields (case and accents ignored). */
export function matchesQuery(query: string, fields: readonly string[]): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = foldText(fields.join(' \u0001 '))
  return words.every((w) => hay.includes(w))
}

export interface Question {
  /** Which item (pair, ending group…). */
  index: number
  /** Which side of it (0 or 1): the word played in a sound-pair round. */
  side: number
}

/** A new question: any item but the last one asked (when there is a choice), and a random side. */
export function pickQuestion(count: number, random: () => number, last: Question | null): Question {
  let index = Math.floor(random() * count)
  if (count > 1 && last && index === last.index) index = (index + 1 + Math.floor(random() * (count - 1))) % count
  return { index, side: random() < 0.5 ? 0 : 1 }
}
