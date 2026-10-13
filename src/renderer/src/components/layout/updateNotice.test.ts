// Sidebar "update ready" notice: shown only once an update is downloaded and waiting for a restart.
import { describe, expect, it } from 'vitest'
import { readyUpdate } from './updateNotice'

describe('update notice', () => {
  it('names the version that is downloaded and waiting for a restart', () => {
    expect(readyUpdate({ kind: 'ready', version: '0.8.1' })).toBe('0.8.1')
  })

  it('stays hidden while checking, downloading, up to date, unsupported, after an error, or before main answers', () => {
    expect(readyUpdate(null)).toBeNull()
    expect(readyUpdate({ kind: 'idle' })).toBeNull()
    expect(readyUpdate({ kind: 'unsupported' })).toBeNull()
    expect(readyUpdate({ kind: 'checking' })).toBeNull()
    expect(readyUpdate({ kind: 'downloading', version: '0.8.1', percent: 40 })).toBeNull()
    expect(readyUpdate({ kind: 'none', checkedAt: 1 })).toBeNull()
    expect(readyUpdate({ kind: 'error', message: 'offline' })).toBeNull()
  })
})
