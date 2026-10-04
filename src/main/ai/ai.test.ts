// AI provider plumbing (pure parts): models other than Claude answer in free text, so JSON has to be dug out
// (code fences, chatty preambles, reasoning); OpenRouter's catalogue is filtered to genuinely free models.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractJson, parseFreeModels } from './parse'

describe('extractJson', () => {
  it('reads plain JSON, fenced JSON and JSON after a preamble', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
    expect(extractJson('Here you go:\n```json\n{"a": [1, 2]}\n```\nEnjoy!')).toEqual({ a: [1, 2] })
    expect(extractJson('Sure! {"title": "x {not a brace}", "n": 2} trailing')).toEqual({ title: 'x {not a brace}', n: 2 })
  })
  it('skips <think> blocks and returns null when there is no object', () => {
    expect(extractJson('<think>{"draft": true}</think>{"final": true}')).toEqual({ final: true })
    expect(extractJson('no json here')).toBeNull()
    expect(extractJson('{"broken": ')).toBeNull()
  })
})

describe('model lists', () => {
  it('keeps only free OpenRouter models, sorted by name', () => {
    const data = JSON.parse(readFileSync(join(__dirname, '..', '__fixtures__', 'openrouter-models.json'), 'utf-8'))
    const free = parseFreeModels(data)
    expect(free.length).toBe(3)
    expect(free.every((m) => m.id && m.name)).toBe(true)
    expect([...free.map((m) => m.name)]).toEqual([...free.map((m) => m.name)].sort((a, b) => a.localeCompare(b)))
  })
})
