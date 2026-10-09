// The bundled resource lists stay clean as they grow: no duplicates, nothing empty, sets that make sense.
import { describe, expect, it } from 'vitest'
import { CONFUSING_WORDS } from './confusing'
import { IRREGULAR_VERBS } from './irregular'
import { PHRASAL_VERBS } from './phrasal'
import { PHRASES } from './phrases'
import { ENDINGS, SOUND_CONTRASTS } from './sounds'

const dupes = (xs: string[]): string[] => xs.filter((x, i) => xs.indexOf(x) !== i)
const filled = (s: string): boolean => s.trim().length > 0 && s === s.trim()

describe('irregular verbs', () => {
  it('are unique, complete and in alphabetical order', () => {
    expect(dupes(IRREGULAR_VERBS.map((v) => v.base))).toEqual([])
    for (const v of IRREGULAR_VERBS) for (const f of [v.base, v.past, v.participle, v.vi]) expect(filled(f), v.base).toBe(true)
    const bases = IRREGULAR_VERBS.map((v) => v.base)
    expect(bases).toEqual([...bases].sort((a, b) => a.localeCompare(b)))
  })
})

describe('phrasal verbs', () => {
  it('are unique, complete, filed under their verb, with an example that uses them', () => {
    const all = PHRASAL_VERBS.flatMap((g) => g.items)
    expect(dupes(all.map((p) => p.phrase))).toEqual([])
    expect(dupes(PHRASAL_VERBS.map((g) => g.verb))).toEqual([])
    for (const g of PHRASAL_VERBS)
      for (const p of g.items) {
        for (const f of [p.phrase, p.vi, p.example]) expect(filled(f), p.phrase).toBe(true)
        if (g.verb !== 'other everyday ones') expect(p.phrase.startsWith(`${g.verb} `), p.phrase).toBe(true)
        // The example uses the verb (any form) somewhere.
        expect(/[.!?]$/.test(p.example), p.example).toBe(true)
      }
  })
})

describe('confusing words', () => {
  it('each set has two or three different words, complete, and no word pair repeats', () => {
    const keys = CONFUSING_WORDS.map((s) => s.words.map((w) => w.word.toLowerCase()).sort().join('/'))
    expect(dupes(keys)).toEqual([])
    for (const s of CONFUSING_WORDS) {
      expect(s.words.length).toBeGreaterThanOrEqual(2)
      expect(s.words.length).toBeLessThanOrEqual(3)
      expect(dupes(s.words.map((w) => w.word))).toEqual([])
      expect(filled(s.note)).toBe(true)
      for (const w of s.words) for (const f of [w.word, w.vi, w.example]) expect(filled(f), w.word).toBe(true)
    }
  })
})

describe('everyday phrases', () => {
  it('situations are unique; phrases complete and not repeated anywhere', () => {
    expect(dupes(PHRASES.map((s) => s.id))).toEqual([])
    const all = PHRASES.flatMap((s) => s.phrases.map((p) => p.en.toLowerCase()))
    expect(dupes(all)).toEqual([])
    for (const s of PHRASES) {
      expect(s.phrases.length).toBeGreaterThan(0)
      for (const p of s.phrases) for (const f of [p.en, p.vi]) expect(filled(f), p.en).toBe(true)
    }
  })
})

describe('sounds', () => {
  it('sound pairs are two different words; endings have three groups', () => {
    for (const c of SOUND_CONTRASTS) for (const [a, b] of c.pairs) expect(a).not.toBe(b)
    for (const e of ENDINGS) expect(e.groups).toHaveLength(3)
  })
})
