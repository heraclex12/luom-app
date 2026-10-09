// Resources: searching the lists (English or Vietnamese, accents optional) and picking quiz questions.
import { describe, expect, it } from 'vitest'
import { foldText, matchesQuery, pickQuestion } from './logic'

describe('matchesQuery', () => {
  it('matches every word of the query anywhere in the fields, ignoring case', () => {
    expect(matchesQuery('give up', ['give up', 'từ bỏ'])).toBe(true)
    expect(matchesQuery('UP', ['give up'])).toBe(true)
    expect(matchesQuery('up give', ['give up'])).toBe(true)
    expect(matchesQuery('give in', ['give up', 'từ bỏ'])).toBe(false)
  })
  it('finds Vietnamese with or without accents', () => {
    expect(matchesQuery('tu bo', ['give up', 'từ bỏ'])).toBe(true)
    expect(matchesQuery('từ bỏ', ['give up', 'từ bỏ'])).toBe(true)
    expect(matchesQuery('duoc', ['get by', 'xoay xở được'])).toBe(true)
  })
  it('an empty query matches everything', () => {
    expect(matchesQuery('  ', ['anything'])).toBe(true)
  })
})

describe('foldText', () => {
  it('lower-cases and drops Vietnamese marks (đ too)', () => {
    expect(foldText('Đường Phố')).toBe('duong pho')
  })
})

describe('pickQuestion', () => {
  it('picks an index and a side, never the same question twice in a row', () => {
    const seq = [0.1, 0.9, 0.1, 0.9]
    let i = 0
    const random = (): number => seq[i++ % seq.length]
    const first = pickQuestion(5, random, null)
    expect(first).toEqual({ index: 0, side: 1 })
    const second = pickQuestion(5, () => 0.1, first)
    expect(second.index).not.toBe(first.index)
  })
  it('works with a single item', () => {
    expect(pickQuestion(1, () => 0.5, { index: 0, side: 0 }).index).toBe(0)
  })
})
