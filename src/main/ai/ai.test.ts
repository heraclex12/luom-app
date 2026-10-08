// AI provider plumbing (pure parts): models answer in free text, so JSON has to be dug out (code fences, chatty
// preambles, reasoning); the free catalogue gives the newest model per Lượm tier; a Custom API's /models list is read
// in the shapes servers actually return.
import { describe, expect, it } from 'vitest'
import { extractJson, hasForeignScript, luomTierModels, parseModelList, readSse } from './parse'

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

const free = { prompt: '0', completion: '0' }
const paid = { prompt: '0.000001', completion: '0.000002' }

describe('luomTierModels', () => {
  it('picks the newest free Nemotron model for each tier', () => {
    const data = {
      data: [
        { id: 'nvidia/nemotron-3-super-120b-a12b:free', created: 100, pricing: free },
        { id: 'nvidia/nemotron-4-super:free', created: 200, pricing: free },
        { id: 'nvidia/nemotron-3.5-lightning:free', created: 150, pricing: free },
        { id: 'nvidia/nemotron-3-ultra-550b-a55b', created: 300, pricing: paid },
        { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', created: 120, pricing: free },
        { id: 'nvidia/nemotron-3.5-content-safety:free', created: 400, pricing: free },
        { id: 'qwen/qwen3-super:free', created: 500, pricing: free },
      ],
    }
    expect(luomTierModels(data)).toEqual({
      super: 'nvidia/nemotron-4-super:free',
      lightning: 'nvidia/nemotron-3.5-lightning:free',
      nano: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    })
  })
  it('is empty for anything unexpected', () => {
    expect(luomTierModels(null)).toEqual({})
    expect(luomTierModels({ data: 'x' })).toEqual({})
  })
})

describe('parseModelList', () => {
  it('reads an OpenAI-style list, sorted by id, without repeats', () => {
    expect(
      parseModelList({ object: 'list', data: [{ id: 'gpt-b' }, { id: 'gpt-a', name: 'GPT A' }, { id: 'gpt-b' }] }),
    ).toEqual([
      { id: 'gpt-a', name: 'GPT A' },
      { id: 'gpt-b', name: 'gpt-b' },
    ])
  })
  it('uses display names and also reads a bare array or a models field', () => {
    expect(parseModelList({ data: [{ id: 'claude-x', display_name: 'Claude X' }] })).toEqual([
      { id: 'claude-x', name: 'Claude X' },
    ])
    expect(parseModelList([{ id: 'm1' }])).toEqual([{ id: 'm1', name: 'm1' }])
    expect(parseModelList({ models: [{ name: 'llama3' }] })).toEqual([{ id: 'llama3', name: 'llama3' }])
  })
  it('is empty for anything unexpected', () => {
    expect(parseModelList('nope')).toEqual([])
    expect(parseModelList({ data: [{ id: 3 }, null] })).toEqual([])
  })
})

describe('hasForeignScript', () => {
  it('accepts English, Vietnamese and IPA', () => {
    expect(hasForeignScript('The eloquent lawyer. Luật sư hùng biện đã thuyết phục bồi thẩm đoàn. /ˈɛləkwənt/ “quoted” — ok')).toBe(false)
  })
  it('flags stray Thai, Korean, Chinese, Japanese, Cyrillic or Arabic text', () => {
    expect(hasForeignScript('thuyết phụcฝúm')).toBe(true)
    expect(hasForeignScript('hội đồng 재판')).toBe(true)
    expect(hasForeignScript('chính sách 政策')).toBe(true)
    expect(hasForeignScript('カタカナ')).toBe(true)
    expect(hasForeignScript('привет')).toBe(true)
    expect(hasForeignScript('مرحبا')).toBe(true)
  })
})

describe('readSse', () => {
  it('splits a streamed answer into complete events and keeps the unfinished rest', () => {
    const chunk =
      ': OPENROUTER PROCESSING\n\n' +
      'data: {"choices":[{"delta":{"reasoning":"Let me think"}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n' +
      'data: [DONE]\n\n' +
      'data: {"choi'
    const { events, rest } = readSse(chunk)
    expect(events).toEqual([
      { progress: true, content: '' },
      { progress: true, content: 'Hel' },
      { progress: true, content: 'lo' },
      { done: true },
    ])
    expect(rest).toBe('data: {"choi')
  })
  it('keep-alive comments are not progress; an error in the stream is reported', () => {
    expect(readSse(': OPENROUTER PROCESSING\n').events).toEqual([])
    expect(readSse('data: {"error":{"message":"Provider returned error"}}\n').events).toEqual([
      { progress: false, content: '', error: 'Provider returned error' },
    ])
  })
})
