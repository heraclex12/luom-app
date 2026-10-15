// Play next: one suggested game with a reason, so the games list does not leave the learner choosing.
import { describe, expect, it } from 'vitest'
import { markPlayed, readLastPlayed, suggestGame, surpriseGame, type KeyValue, type PlayId } from './next'

const NOW = 1_800_000_000_000
const HOUR = 3_600_000
const never = {} as Partial<Record<PlayId, number>>
const first = (): number => 0

function memoryStore(): KeyValue {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }
}

describe('suggestGame', () => {
  it('suggests nothing until there are enough words to play', () => {
    expect(suggestGame({ ready: 3, shaky: 5, steady: 0 }, never, NOW, first)).toBeNull()
  })

  it('due words mostly still new: a recognition game first', () => {
    const s = suggestGame({ ready: 20, shaky: 6, steady: 2 }, never, NOW, first)!
    expect(['frog', 'fishing', 'garden']).toContain(s.id)
    expect(s.reason).toMatch(/8 words are due, most still new to you/)
    expect(suggestGame({ ready: 20, shaky: 3, steady: 0 }, never, NOW, first)!.reason).toMatch(/3 words are due, all still new to you/)
  })

  it('due words mostly familiar: spelling or listening from memory', () => {
    const s = suggestGame({ ready: 20, shaky: 1, steady: 9 }, never, NOW, first)!
    expect(['bridge', 'tea', 'firefly']).toContain(s.id)
    expect(s.reason).toMatch(/10 words are due and you know most of them/)
    expect(suggestGame({ ready: 20, shaky: 0, steady: 2 }, never, NOW, first)!.reason).toMatch(/2 words are due and you know them\. Make them stick/)
  })

  it('rotates: the game of that kind played longest ago comes next', () => {
    const played = { frog: NOW - HOUR, fishing: NOW - 3 * HOUR, garden: NOW - 2 * HOUR }
    expect(suggestGame({ ready: 20, shaky: 4, steady: 0 }, played, NOW, first)!.id).toBe('fishing')
    // Never played beats played.
    expect(suggestGame({ ready: 20, shaky: 4, steady: 0 }, { frog: NOW - HOUR, fishing: NOW - HOUR }, NOW, first)!.id).toBe('garden')
  })

  it('one due word reads in the singular', () => {
    expect(suggestGame({ ready: 20, shaky: 1, steady: 0 }, never, NOW, first)!.reason).toMatch(/1 word is due, still new to you/)
    expect(suggestGame({ ready: 20, shaky: 0, steady: 1 }, never, NOW, first)!.reason).toMatch(/1 word is due and you know it\. Make it stick/)
  })

  it('nothing due: use the words (Write back, then Say it), then a quick drill', () => {
    const idle = { ready: 20, shaky: 0, steady: 0 }
    expect(suggestGame(idle, never, NOW, first)!.id).toBe('write')
    expect(suggestGame(idle, { write: NOW - HOUR }, NOW, first)!.id).toBe('say')
    const drill = suggestGame(idle, { write: NOW - HOUR, say: NOW - 2 * HOUR }, NOW, first)!
    expect(['match', 'unscramble', 'lightning', 'rain', 'sound']).toContain(drill.id)
    // Written yesterday: suggested again today.
    expect(suggestGame(idle, { write: NOW - 30 * HOUR }, NOW, first)!.id).toBe('write')
  })
})

describe('surpriseGame', () => {
  it('picks a review round while words are due, otherwise any game, never the one just played', () => {
    const rounds = ['bridge', 'tea', 'fishing', 'garden', 'firefly', 'frog']
    for (let i = 0; i < 20; i++) {
      const r = (): number => (i + 0.5) / 20
      expect(rounds).toContain(surpriseGame({ ready: 20, shaky: 2, steady: 2 }, { bridge: NOW }, r))
      expect(surpriseGame({ ready: 20, shaky: 2, steady: 2 }, { bridge: NOW }, r)).not.toBe('bridge')
      expect(surpriseGame({ ready: 20, shaky: 0, steady: 0 }, { match: NOW }, r)).not.toBe('match')
    }
  })

  it('suggests nothing until there are enough words to play', () => {
    expect(surpriseGame({ ready: 0, shaky: 0, steady: 0 }, never, first)).toBeNull()
  })
})

describe('last played', () => {
  it('remembers when each game was opened and survives junk in storage', () => {
    const store = memoryStore()
    expect(readLastPlayed(store)).toEqual({})
    markPlayed('frog', NOW, store)
    markPlayed('write', NOW + 1, store)
    expect(readLastPlayed(store)).toEqual({ frog: NOW, write: NOW + 1 })
    store.setItem('envi.games.lastPlayed', '{not json')
    expect(readLastPlayed(store)).toEqual({})
    store.setItem('envi.games.lastPlayed', JSON.stringify({ frog: 'x', nope: 5, tea: 7 }))
    expect(readLastPlayed(store)).toEqual({ tea: 7 })
    expect(readLastPlayed(null)).toEqual({})
  })
})
