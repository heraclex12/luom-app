// Partial MD5 contract tests. Two kinds of assertions:
// 1. The 12 sample offsets are hard-coded: `step << (2 * i)` at i = -1 yields 0 (not 256) because JS
//    masks shift counts mod 32, and every book's identity depends on it.
// 2. Fixed test vectors from deterministic in-memory bytes lock the hex output.
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { makeReadAt, partialMd5, partialMd5OfFile, sampleRanges } from './partialMd5'

/**
 * Deterministic bytes for vectors: `byte(i) = (i * 7 + 13) % 251`.
 * Mod 251 (prime), not 256 — offsets are multiples of 1024, so 256 would make every sample identical.
 */
function byteAt(i: number): number {
  return (i * 7 + 13) % 251
}

/** Reader that computes bytes on demand, so GB-sized files can be simulated. */
function syntheticReader(fileSize: number) {
  return async (offset: number, length: number): Promise<Uint8Array> => {
    const n = Math.max(0, Math.min(length, fileSize - offset))
    const buf = new Uint8Array(n)
    for (let k = 0; k < n; k++) buf[k] = byteAt(offset + k)
    return buf
  }
}

describe('sampleRanges', () => {
  it('offsets are 0 and 1024·4^i (i=0..10), 12 points; the first is 0, not 256', () => {
    const starts = sampleRanges(2 ** 31).map(([start]) => start)
    expect(starts).toEqual([
      0, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864, 268435456,
      1073741824,
    ])
  })

  it('reads 1024 bytes per point (before EOF)', () => {
    for (const [start, end] of sampleRanges(2 ** 31)) expect(end - start).toBe(1024)
  })

  it('truncates the last range at EOF and stops once offset >= size', () => {
    expect(sampleRanges(500)).toEqual([[0, 500]])
    expect(sampleRanges(5000)).toEqual([
      [0, 1024],
      [1024, 2048],
      [4096, 5000],
    ])
    expect(sampleRanges(0)).toEqual([])
  })
})

describe('partialMd5 test vectors', () => {
  it('empty file → MD5 of empty input', async () => {
    expect(await partialMd5(0, syntheticReader(0))).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('vector A: 500 bytes (< 1024, one sample covering the whole file)', async () => {
    expect(await partialMd5(500, syntheticReader(500))).toBe('32a1872dffc56c1cc991d58a10732445')
  })

  it('vector B: 5000 bytes (3 samples, last one truncated)', async () => {
    expect(await partialMd5(5000, syntheticReader(5000))).toBe('afabfdd49774b09fb97cc79a49184a34')
  })

  it('vector C: 2^30 + 512 bytes (all 12 samples, last one only 512 bytes)', async () => {
    expect(await partialMd5(2 ** 30 + 512, syntheticReader(2 ** 30 + 512))).toBe(
      '29bae18ef4a9c99e632b176a211eb561',
    )
  })

  it('equals the whole-file MD5 below 1024 bytes', async () => {
    const bytes = new Uint8Array(500)
    for (let i = 0; i < bytes.length; i++) bytes[i] = byteAt(i)
    const whole = createHash('md5').update(bytes).digest('hex')
    expect(await partialMd5(500, syntheticReader(500))).toBe(whole)
  })
})

describe('makeReadAt (short reads)', () => {
  it('a reader returning 100 bytes at a time gives the same hex as a full read', async () => {
    const size = 5000
    // Simulate POSIX short reads: no error, just fewer bytes. One missing byte changes the hash.
    const shortRead = async (
      buf: Uint8Array,
      offset: number,
      length: number,
      position: number,
    ): Promise<{ bytesRead: number }> => {
      const n = Math.max(0, Math.min(length, 100, size - position))
      for (let k = 0; k < n; k++) buf[offset + k] = byteAt(position + k)
      return { bytesRead: n }
    }
    expect(await partialMd5(size, makeReadAt(shortRead))).toBe(
      await partialMd5(size, syntheticReader(size)),
    )
  })
})

describe('partialMd5OfFile (fs wrapper)', () => {
  it('matches the injected reader for a real file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qiyan-md5-'))
    try {
      const size = 5000
      const bytes = new Uint8Array(size)
      for (let i = 0; i < size; i++) bytes[i] = byteAt(i)
      const path = join(dir, 'book.epub')
      await writeFile(path, bytes)
      expect(await partialMd5OfFile(path)).toBe(await partialMd5(size, syntheticReader(size)))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
