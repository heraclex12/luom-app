// Why an AI call failed, for the anonymous stats: offline, the service busy or too slow, a server error, an answer that
// could not be used, a rejected key; anything else is "other". Never the message itself.
import { describe, expect, it } from 'vitest'
import { AiError, failReason } from './failure'
import { FatalAiError } from './fallback'

describe('failReason', () => {
  it('reads the reason an AI error carries', () => {
    expect(failReason(new AiError('could not be reached', 'offline'))).toBe('offline')
    expect(failReason(new AiError('busy right now', 'busy'))).toBe('busy')
    expect(failReason(new AiError('no usable answer', 'bad-answer'))).toBe('bad-answer')
  })
  it('a rejected key is "key"; any other error is "other"', () => {
    expect(failReason(new FatalAiError('rejected the API key'))).toBe('key')
    expect(failReason(new Error('something'))).toBe('other')
    expect(failReason('not an error')).toBe('other')
  })
})
