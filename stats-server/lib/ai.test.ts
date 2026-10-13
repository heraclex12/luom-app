// The backup AI relay (api/ai.ts): the app sends a system and a user prompt, the server adds the paid model's key
// (which never ships in the app) and answers with the text. Strict input, daily caps per IP and in total, so the bill
// stays bounded even if someone calls the endpoint directly.
import { describe, expect, it } from 'vitest'
import { AI_MAX_SYSTEM, AI_MAX_USER, AI_PER_DAY, AI_PER_IP_PER_DAY, answerText, dailyLimit, overLimit, parseAsk } from './ai'

describe('parseAsk', () => {
  it('takes a system and a user prompt, nothing else', () => {
    expect(parseAsk({ system: 'You write stories.', user: 'Write one.', extra: 1 })).toEqual({ system: 'You write stories.', user: 'Write one.' })
  })
  it('refuses a missing, empty or oversized prompt', () => {
    expect(parseAsk(null)).toBeNull()
    expect(parseAsk({ system: 'x' })).toBeNull()
    expect(parseAsk({ system: 'x', user: '   ' })).toBeNull()
    expect(parseAsk({ system: 'x'.repeat(AI_MAX_SYSTEM + 1), user: 'u' })).toBeNull()
    expect(parseAsk({ system: 's', user: 'x'.repeat(AI_MAX_USER + 1) })).toBeNull()
    expect(parseAsk({ system: 's', user: 42 })).toBeNull()
  })
})

describe('daily caps', () => {
  it('a few calls a day per IP, and a total for everyone that the owner can change', () => {
    // The app gives 10 free AI answers a day; a few people can share one IP, so the per-IP cap matches one learner.
    expect(AI_PER_IP_PER_DAY).toBe(10)
    expect(AI_PER_DAY).toBe(1000)
    expect(dailyLimit(undefined)).toBe(AI_PER_DAY)
    expect(dailyLimit('50')).toBe(50)
    expect(dailyLimit('nonsense')).toBe(AI_PER_DAY)
    expect(dailyLimit('-3')).toBe(AI_PER_DAY)
  })
  it('names the cap that was hit (counts include this call)', () => {
    expect(overLimit({ ip: 1, all: 1 }, 400)).toBeNull()
    expect(overLimit({ ip: 10, all: 400 }, 400)).toBeNull()
    expect(overLimit({ ip: 11, all: 30 }, 400)).toBe('ip')
    expect(overLimit({ ip: 2, all: 401 }, 400)).toBe('all')
  })
})

describe('answerText', () => {
  it('reads the answer of an OpenAI-style chat completion', () => {
    expect(answerText({ choices: [{ message: { content: '{"a":1}' } }] })).toBe('{"a":1}')
    expect(answerText({ choices: [] })).toBe('')
    expect(answerText('nope')).toBe('')
  })
})
