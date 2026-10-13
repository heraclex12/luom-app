import { describe, expect, it } from 'vitest'
import { generateSecMsGec, genSSML, parseAudioMetadataBody, skewFromServerDate } from './edgeTts'

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
  it('outputs a v2 token: 16 hex, a dash, 64 hex (uppercase)', () => {
    expect(generateSecMsGec()).toMatch(/^[0-9A-F]{16}-[0-9A-F]{64}$/)
  })

  it('is stable within a 5-minute bucket and changes across buckets', () => {
    // 1770000000s is divisible by 300, i.e. a bucket start.
    const base = 1_770_000_000_000
    const a = generateSecMsGec(base)
    expect(generateSecMsGec(base + 150_000)).toBe(a) // same bucket (+150s)
    expect(generateSecMsGec(base + 300_000)).not.toBe(a) // next bucket (+300s)
  })
})

describe('skewFromServerDate', () => {
  it('is the server clock minus ours, in ms', () => {
    const now = Date.parse('Tue, 13 Oct 2026 22:20:00 GMT')
    expect(skewFromServerDate('Tue, 13 Oct 2026 22:30:00 GMT', now)).toBe(600_000)
    expect(skewFromServerDate('Tue, 13 Oct 2026 22:19:00 GMT', now)).toBe(-60_000)
  })

  it('is null without a usable Date header', () => {
    expect(skewFromServerDate(undefined)).toBeNull()
    expect(skewFromServerDate('not a date')).toBeNull()
  })
})
