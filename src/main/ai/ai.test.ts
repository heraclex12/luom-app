// AI provider plumbing (pure parts): models other than Claude answer in free text, so JSON has to be dug out
// (code fences, chatty preambles, reasoning); the ChatGPT bridge streams Responses SSE that must be stitched back
// together; OpenRouter's catalogue is filtered to genuinely free models.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectResponsesText, extractJson, parseBridgeModels, parseFreeModels } from './parse'

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

describe('collectResponsesText (bridge SSE)', () => {
  const sse = [
    'event: response.created\ndata: {"type":"response.created","response":{"id":"r1"}}\n',
    'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Xin "}\n',
    ': keep-alive\n',
    'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"chào"}\n',
    'event: response.completed\ndata: {"type":"response.completed","response":{"status":"completed"}}\n',
  ].join('\n')
  it('joins text deltas', () => {
    expect(collectResponsesText(sse)).toEqual({ text: 'Xin chào', error: null })
  })
  it('falls back to the completed response output when no deltas were streamed', () => {
    const only = 'data: {"type":"response.completed","response":{"output":[{"type":"message","content":[{"type":"output_text","text":"done"}]}]}}\n\n'
    expect(collectResponsesText(only).text).toBe('done')
  })
  it('reports a failed response', () => {
    const failed = 'data: {"type":"response.failed","response":{"error":{"message":"Not signed in"}}}\n\n'
    expect(collectResponsesText(failed)).toEqual({ text: '', error: 'Not signed in' })
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
  it('lists the ChatGPT web models exposed by the bridge', () => {
    const data = { data: [{ id: 'gpt-5.6' }, { id: 'chatgpt-web/medium', display_name: 'GPT-5.6 Sol (Web)' }, { id: 'chatgpt-web/zero-risk' }] }
    expect(parseBridgeModels(data)).toEqual([{ id: 'chatgpt-web/medium', name: 'GPT-5.6 Sol (Web)' }])
  })
})
