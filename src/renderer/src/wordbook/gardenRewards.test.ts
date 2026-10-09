// Garden rewards beyond levels: streak visitors, seasons and night, trophies for word lists and collections, and the
// one-time news when something new arrives.
import { describe, expect, it } from 'vitest'
import {
  VISITORS,
  collectionTrophy,
  gardenNews,
  listTrophy,
  lookFor,
  nextVisitor,
  visitorsFor,
} from './gardenRewards'

describe('visitors', () => {
  it('come with the best streak ever and stay', () => {
    expect(visitorsFor(0)).toEqual([])
    expect(visitorsFor(6)).toEqual([])
    expect(visitorsFor(7)).toEqual(['hedgehog'])
    expect(visitorsFor(30)).toEqual(['hedgehog', 'fox'])
    expect(visitorsFor(365)).toEqual(VISITORS.map((v) => v.kind))
  })
  it('the next one and the streak it needs', () => {
    expect(nextVisitor(0)).toMatchObject({ kind: 'hedgehog', streak: 7 })
    expect(nextVisitor(30)).toMatchObject({ kind: 'owl', streak: 60 })
    expect(nextVisitor(400)).toBeNull()
  })
})

describe('lookFor', () => {
  const at = (month: number, hour: number): Date => new Date(2026, month, 15, hour)
  it('is always summer before level 100', () => {
    expect(lookFor('winter', 99, at(0, 12))).toBe('summer')
    expect(lookFor('auto', 50, at(0, 23))).toBe('summer')
  })
  it('a chosen look from level 100', () => {
    expect(lookFor('winter', 100, at(6, 12))).toBe('winter')
    expect(lookFor('night', 120, at(6, 12))).toBe('night')
  })
  it('auto follows the time of day and the month', () => {
    expect(lookFor('auto', 100, at(6, 21))).toBe('night')
    expect(lookFor('auto', 100, at(6, 5))).toBe('night')
    expect(lookFor('auto', 100, at(3, 10))).toBe('spring')
    expect(lookFor('auto', 100, at(6, 10))).toBe('summer')
    expect(lookFor('auto', 100, at(9, 10))).toBe('autumn')
    expect(lookFor('auto', 100, at(0, 10))).toBe('winter')
    expect(lookFor('auto', 100, at(11, 10))).toBe('winter')
  })
})

describe('trophies', () => {
  const terms = Array.from({ length: 400 }, (_, i) => `word${i}`)
  const book = { id: 3, title: 'Everyday English 3', terms }
  const learned = (n: number): Set<string> => new Set(terms.slice(0, n))
  it('a word list earns bronze at 100 words, silver at half, gold when every word is learned', () => {
    expect(listTrophy(book, learned(99))).toBeNull()
    expect(listTrophy(book, learned(100))).toEqual({
      key: 'list:3',
      medal: 'bronze',
      title: 'Everyday English 3',
      detail: '100 of 400 words learned',
    })
    expect(listTrophy(book, learned(200))?.medal).toBe('silver')
    expect(listTrophy(book, learned(400))).toMatchObject({ medal: 'gold', detail: 'All 400 words learned' })
  })
  it('matches terms ignoring case', () => {
    expect(listTrophy({ id: 1, title: 'X', terms: ['Apple', ...terms.slice(1)] }, learned(400).add('apple'))?.medal).toBe('gold')
  })
  it('a collection of 10+ words earns gold when all are learned', () => {
    expect(collectionTrophy({ id: 5, name: 'Travel', total: 12, learned: 12 })).toEqual({
      key: 'col:5',
      medal: 'gold',
      title: 'Travel',
      detail: 'All 12 words learned',
    })
    expect(collectionTrophy({ id: 5, name: 'Travel', total: 12, learned: 11 })).toBeNull()
    expect(collectionTrophy({ id: 6, name: 'Tiny', total: 9, learned: 9 })).toBeNull()
  })
})

describe('gardenNews', () => {
  const base = { level: 1, tierSeen: 0, visitors: [], trophies: [], seen: [] }
  it('nothing new, no news', () => {
    expect(gardenNews(base)).toEqual([])
  })
  it('a new world, then new visitors, then trophies (one item each)', () => {
    const news = gardenNews({
      ...base,
      level: 25,
      visitors: ['hedgehog', 'fox'],
      trophies: [{ key: 'list:1', medal: 'silver', title: 'Everyday English 1', detail: '500 of 1000 words learned' }],
      seen: ['visitor:hedgehog', 'trophy:list:1:bronze'],
    })
    expect(news.map((n) => n.reveal)).toEqual(['tier:2', 'visitor:fox', 'trophy:list:1'])
    expect(news.map((n) => n.key)).toEqual(['tier:2', 'visitor:fox', 'trophy:list:1:silver'])
    expect(news[0].title).toBe('Your garden grew into a cottage garden')
    expect(news[1].title).toBe('A fox moved in')
    expect(news[2].title).toBe('A silver trophy for “Everyday English 1”')
  })
  it('an island has its own news', () => {
    const [n] = gardenNews({ ...base, level: 110, tierSeen: 8 })
    expect(n.title).toBe('A new island joined your garden: Sa Pa terraces')
  })
  it('a world already seen is not news; a trophy already seen at that medal is not news', () => {
    expect(
      gardenNews({
        ...base,
        level: 25,
        tierSeen: 2,
        trophies: [{ key: 'col:2', medal: 'gold', title: 'Travel', detail: 'All 12 words learned' }],
        seen: ['trophy:col:2:gold'],
      }),
    ).toEqual([])
  })
})
