import { useMemo, useState } from 'react'
import * as wordbook from '@/wordbook'

/**
 * What the garden shows on Home, from the progress numbers and the garden extras: level, visitors, look, and the
 * news card (one at a time; dismissing remembers it). Values are memoised so the 3D scene is rebuilt only when
 * something really changes.
 */
export function useGardenView(input: { xp: number; bestStreak: number; extras: wordbook.GardenExtras } | null): {
  level: number
  visitors: readonly wordbook.VisitorKind[]
  trophies: readonly wordbook.Trophy[]
  news: wordbook.GardenNews | null
  reveal: ReadonlySet<string>
  look: wordbook.ShownLook
  lookChoice: wordbook.GardenLook
  setLook: (look: wordbook.GardenLook) => void
  dismissNews: () => void
} {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [lookChoice, setLookChoice] = useState<wordbook.GardenLook | null>(null)
  const xp = input?.xp ?? 0
  const best = input?.bestStreak ?? 0
  const extras = input?.extras ?? null
  const derived = useMemo(() => {
    const level = wordbook.levelFor(xp).level
    const visitors = wordbook.visitorsFor(best)
    const news = extras
      ? wordbook.gardenNews({ level, tierSeen: extras.tierSeen, visitors, trophies: extras.trophies, seen: extras.seen })
      : []
    return { level, visitors, news, trophies: extras?.trophies ?? [] }
  }, [xp, best, extras])
  const news = derived.news.find((n) => !dismissed.includes(n.key)) ?? null
  const revealKey = news?.reveal ?? ''
  const reveal = useMemo(() => new Set(revealKey ? [revealKey] : []), [revealKey])
  const choice = lookChoice ?? extras?.look ?? 'summer'
  return {
    level: derived.level,
    visitors: derived.visitors,
    trophies: derived.trophies,
    news,
    reveal,
    look: wordbook.lookFor(choice, derived.level, new Date()),
    lookChoice: choice,
    setLook: (look) => {
      setLookChoice(look)
      void wordbook.setGardenLook(look)
    },
    dismissNews: () => {
      if (!news) return
      setDismissed((d) => [...d, news.key])
      void wordbook.markGardenNewsSeen(news.key)
    },
  }
}
