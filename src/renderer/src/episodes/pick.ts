// Word choice for a daily episode (pure; tested in pick.test.ts).

export interface WordRef {
  dictId: number
  term: string
}

/** Most words woven into one episode. */
export const EPISODE_WORDS = 7

export function pickEpisodeWords(
  lists: { due: readonly WordRef[]; today: readonly WordRef[]; recent: readonly WordRef[] },
  recentlyUsed: readonly number[],
  max = EPISODE_WORDS,
): WordRef[] {
  const ordered = [...lists.due, ...lists.today, ...lists.recent].filter((x) => x.term.trim())
  const seen = new Set<number>()
  const unique = ordered.filter((x) => !seen.has(x.dictId) && seen.add(x.dictId))
  const used = new Set(recentlyUsed)
  const fresh = unique.filter((x) => !used.has(x.dictId))
  return [...fresh, ...unique.filter((x) => used.has(x.dictId))].slice(0, max)
}
