// Capture flow: pressing the hotkey on a word should look it up AND save it (one keystroke), unless it is
// already in my words; not-found / offline never save anything.
import { describe, expect, it, vi } from 'vitest'
import { runCapture, type CaptureDeps } from './captureFlow'
import type { LocalDictRow } from '@/dict'

const row: LocalDictRow = {
  dictId: 7,
  term: 'resilient',
  ukPhonetic: null,
  usPhonetic: null,
  ukAudioUrl: null,
  usAudioUrl: null,
  audioUrl: null,
  entry: '{}',
}

function deps(over: Partial<CaptureDeps> = {}): CaptureDeps {
  return {
    lookup: vi.fn(async () => ({ status: 'hit' as const, row })),
    getState: vi.fn(async () => null),
    addWord: vi.fn(async () => {}),
    addToCollection: vi.fn(async () => {}),
    recordHistory: vi.fn(async () => {}),
    ...over,
  }
}

describe('runCapture', () => {
  it('also files the word into the chosen collection (new or existing word)', async () => {
    const d = deps()
    await runCapture('resilient', d, 5)
    expect(d.addToCollection).toHaveBeenCalledWith(5, 7)
    const existing = deps({ getState: vi.fn(async () => ({ state: 2, due: 0 })) })
    await runCapture('resilient', existing, 5)
    expect(existing.addToCollection).toHaveBeenCalledWith(5, 7)
    const none = deps()
    await runCapture('resilient', none)
    expect(none.addToCollection).not.toHaveBeenCalled()
  })

  it('saves a newly found word and reports it as added', async () => {
    const d = deps()
    const out = await runCapture('  resilient. ', d)
    expect(d.lookup).toHaveBeenCalledWith('resilient.')
    expect(d.addWord).toHaveBeenCalledWith(7)
    expect(d.recordHistory).toHaveBeenCalledWith(row)
    expect(out).toEqual({ kind: 'hit', row, saved: 'added' })
  })

  it('does not re-add a word that is already in my words', async () => {
    const d = deps({ getState: vi.fn(async () => ({ state: 2, due: 0 })) })
    const out = await runCapture('resilient', d)
    expect(d.addWord).not.toHaveBeenCalled()
    expect(out).toEqual({ kind: 'hit', row, saved: 'existing' })
  })

  it('passes through not-found and unavailable without saving', async () => {
    for (const status of ['not-found', 'unavailable'] as const) {
      const d = deps({ lookup: vi.fn(async () => ({ status })) })
      const out = await runCapture('qwzxv', d)
      expect(out).toEqual({ kind: status, term: 'qwzxv' })
      expect(d.addWord).not.toHaveBeenCalled()
    }
  })

  it('an empty term is idle', async () => {
    const d = deps()
    expect(await runCapture('   ', d)).toEqual({ kind: 'idle' })
    expect(d.lookup).not.toHaveBeenCalled()
  })
})
