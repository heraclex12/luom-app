// Recordings go to the speech helper as 16 kHz mono 16-bit WAV: the header must be exact or nothing is heard.
import { describe, expect, it } from 'vitest'
import { downsample, encodeWav, isSpeech } from './wav'

describe('downsample', () => {
  it('averages down to the target rate', () => {
    const out = downsample(new Float32Array([0, 1, 1, 1, 0.5, 0.5]), 48_000, 16_000)
    expect(out).toHaveLength(2)
    expect(out[0]).toBeCloseTo(2 / 3)
    expect(out[1]).toBeCloseTo(2 / 3)
  })
  it('keeps the samples when the rate already matches', () => {
    const s = new Float32Array([0.1, 0.2])
    expect(downsample(s, 16_000, 16_000)).toBe(s)
  })
})

describe('encodeWav', () => {
  it('writes a 44-byte PCM header and clipped 16-bit samples', () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 2]), 16_000)
    const v = new DataView(wav.buffer)
    const str = (o: number) => String.fromCharCode(...wav.slice(o, o + 4))
    expect(wav.byteLength).toBe(44 + 8)
    expect([str(0), str(8), str(12), str(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data'])
    expect(v.getUint32(4, true)).toBe(36 + 8)
    expect(v.getUint16(22, true)).toBe(1) // mono
    expect(v.getUint32(24, true)).toBe(16_000)
    expect(v.getUint16(34, true)).toBe(16)
    expect(v.getUint32(40, true)).toBe(8)
    expect([0, 1, 2, 3].map((i) => v.getInt16(44 + i * 2, true))).toEqual([0, 32767, -32768, 32767])
  })
})

describe('isSpeech', () => {
  it('a recording with a louder stretch is speech; near-silence is not', () => {
    expect(isSpeech([0.001, 0.002, 0.08, 0.1, 0.002])).toBe(true)
    expect(isSpeech([0.001, 0.003, 0.002])).toBe(false)
  })
})
