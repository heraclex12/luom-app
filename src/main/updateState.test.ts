// Auto-update status as shown in Settings and the menu bar, driven by electron-updater events. A downloaded update
// stays "ready" until the app restarts, whatever later checks report; errors are short and readable.
import { describe, expect, it } from 'vitest'
import { nextUpdateState, shouldCheckForUpdate, UPDATE_CHECK_INTERVAL_MS } from './updateState'

describe('nextUpdateState', () => {
  it('follows a check through download to ready', () => {
    let s = nextUpdateState({ kind: 'idle' }, { type: 'checking' })
    expect(s).toEqual({ kind: 'checking' })
    s = nextUpdateState(s, { type: 'available', version: '0.2.0' })
    expect(s).toEqual({ kind: 'downloading', version: '0.2.0', percent: 0 })
    s = nextUpdateState(s, { type: 'progress', percent: 41.7 })
    expect(s).toEqual({ kind: 'downloading', version: '0.2.0', percent: 42 })
    s = nextUpdateState(s, { type: 'downloaded', version: '0.2.0' })
    expect(s).toEqual({ kind: 'ready', version: '0.2.0' })
  })
  it('reports up to date', () => {
    expect(nextUpdateState({ kind: 'checking' }, { type: 'none', at: 5 })).toEqual({ kind: 'none', checkedAt: 5 })
  })
  it('keeps a downloaded update ready through later checks and errors', () => {
    const ready = { kind: 'ready', version: '0.2.0' } as const
    expect(nextUpdateState(ready, { type: 'checking' })).toBe(ready)
    expect(nextUpdateState(ready, { type: 'error', message: 'net::ERR_INTERNET_DISCONNECTED' })).toBe(ready)
  })
  it('turns errors into short messages', () => {
    expect(nextUpdateState({ kind: 'checking' }, { type: 'error', message: 'net::ERR_INTERNET_DISCONNECTED at ...' })).toEqual({
      kind: 'error',
      message: 'You seem to be offline.',
    })
    expect(
      nextUpdateState({ kind: 'checking' }, { type: 'error', message: 'Code signature at URL ... did not pass validation' }),
    ).toEqual({ kind: 'error', message: 'The update is not signed like this copy. Download the latest version from GitHub.' })
    const long = 'x'.repeat(400)
    const s = nextUpdateState({ kind: 'checking' }, { type: 'error', message: long })
    expect(s.kind === 'error' && s.message.length).toBeLessThanOrEqual(160)
  })
})

describe('shouldCheckForUpdate', () => {
  it('checks at start, then every interval', () => {
    expect(shouldCheckForUpdate(1000, null)).toBe(true)
    expect(shouldCheckForUpdate(1000 + UPDATE_CHECK_INTERVAL_MS - 1, 1000)).toBe(false)
    expect(shouldCheckForUpdate(1000 + UPDATE_CHECK_INTERVAL_MS, 1000)).toBe(true)
  })
})
