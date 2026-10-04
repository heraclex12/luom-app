// Book identity hash: "partial MD5" — feeds 12 fixed 1024-byte samples into one MD5 instead of
// reading the whole file. The hash is the user_book key and the books/<hash>/ dir name, so it must
// stay stable; the behaviour here is the spec.
//
// Sample offsets are `0, 1024, 4096, …, 1024·4^10`: `step << (2 * i)` at `i = -1` yields **0**
// (not 256) because JS masks shift counts mod 32. Don't "fix" it to 256 — that changes every book's id.
//
// Sampling logic copied from readest `apps/readest-app/src/utils/md5.ts::partialMD5` (AGPL-3.0).
import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'

/**
 * File size → list of `[start, end)` sample ranges (pure, no IO).
 * Separate so tests can pin the 12 offsets.
 */
export function sampleRanges(fileSize: number): Array<[number, number]> {
  const step = 1024
  const size = 1024

  const ranges: Array<[number, number]> = []
  for (let i = -1; i <= 10; i++) {
    const start = Math.min(fileSize, step << (2 * i))
    const end = Math.min(start + size, fileSize)
    if (start >= fileSize) break
    ranges.push([start, end])
  }
  return ranges
}

/** Positional reader: returns bytes in `[offset, offset + length)` (shorter past EOF). */
export type ReadAt = (offset: number, length: number) => Promise<Uint8Array>

/**
 * Core partial MD5 (reader is injectable for tests): feeds samples in offset order into a single
 * MD5 context and returns 32 lowercase hex chars.
 */
export async function partialMd5(fileSize: number, readAt: ReadAt): Promise<string> {
  const hasher = createHash('md5')
  for (const [start, end] of sampleRanges(fileSize)) {
    hasher.update(await readAt(start, end - start))
  }
  return hasher.digest('hex')
}

/** Minimal `fd.read` contract (tests can inject short reads). */
export type PositionalRead = (
  buf: Uint8Array,
  offset: number,
  length: number,
  position: number,
) => Promise<{ bytesRead: number }>

/**
 * Positional reader factory: POSIX reads may return short, so loop until full or EOF.
 * Missing bytes wouldn't error — they'd silently change the hash.
 */
export function makeReadAt(read: PositionalRead): ReadAt {
  return async (offset, length) => {
    const buf = new Uint8Array(length)
    let filled = 0
    while (filled < length) {
      const { bytesRead } = await read(buf, filled, length - filled, offset + filled)
      if (bytesRead <= 0) break // EOF
      filled += bytesRead
    }
    return buf.subarray(0, filled)
  }
}

/** Thin fs wrapper: partial MD5 of a file path (positional reads, never loads the whole file). */
export async function partialMd5OfFile(path: string): Promise<string> {
  const fd = await open(path, 'r')
  try {
    const { size } = await fd.stat()
    return await partialMd5(
      size,
      makeReadAt((buf, offset, length, position) => fd.read(buf, offset, length, position)),
    )
  } finally {
    await fd.close()
  }
}
