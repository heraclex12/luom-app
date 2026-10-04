import { describe, expect, it, vi } from 'vitest'
import { generateSecMsGec, genSSML, parseAudioMetadataBody } from './edgeTts'

describe('genSSML', () => {
  it('wraps plain text in an SSML envelope with voice, rate and lang', () => {
    const ssml = genSSML('en-US', 'Hello world', 'en-US-AndrewNeural', 1)
    expect(ssml).toContain('xml:lang="en-US"')
    expect(ssml).toContain('name="en-US-AndrewNeural"')
    expect(ssml).toContain('rate="1"')
    expect(ssml).toContain('Hello world')
  })

  it('escapes XML special characters so & < > do not break the SSML', () => {
    const ssml = genSSML('en-US', 'Tom & Jerry <3', 'v', 1)
    expect(ssml).toContain('Tom &amp; Jerry &lt;3')
  })
})

describe('parseAudioMetadataBody', () => {
  it('keeps only WordBoundary entries; missing Duration defaults to 0', () => {
    const body = JSON.stringify({
      Metadata: [
        { Type: 'WordBoundary', Data: { Offset: 1000, Duration: 500, text: { Text: 'Hello' } } },
        { Type: 'SentenceBoundary', Data: { Offset: 0, text: { Text: 'x' } } },
        { Type: 'WordBoundary', Data: { Offset: 2000, text: { Text: 'world' } } },
      ],
    })
    expect(parseAudioMetadataBody(body)).toEqual([
      { offset: 1000, duration: 500, text: 'Hello' },
      { offset: 2000, duration: 0, text: 'world' },
    ])
  })

  it('returns an empty array for bad JSON instead of throwing', () => {
    expect(parseAudioMetadataBody('not json')).toEqual([])
  })
})

describe('generateSecMsGec', () => {
  it('outputs 64 uppercase hex chars', () => {
    expect(generateSecMsGec()).toMatch(/^[0-9A-F]{64}$/)
  })

  it('is stable within a 5-minute bucket and changes across buckets', () => {
    vi.useFakeTimers()
    try {
      // 1770000000s is divisible by 300, i.e. a bucket start.
      const base = 1_770_000_000_000
      vi.setSystemTime(base)
      const a = generateSecMsGec()
      vi.setSystemTime(base + 150_000) // same bucket (+150s)
      const b = generateSecMsGec()
      vi.setSystemTime(base + 300_000) // next bucket (+300s)
      const c = generateSecMsGec()
      expect(a).toBe(b)
      expect(a).not.toBe(c)
    } finally {
      vi.useRealTimers()
    }
  })
})
