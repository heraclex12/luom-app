// Pure auto-update status logic (tested in updateState.test.ts); src/main/updater.ts feeds it electron-updater events.
import type { UpdateState } from '../shared/update'

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'none'; at: number }
  | { type: 'error'; message: string }

/** Check on launch, then this often while the app runs. */
export const UPDATE_CHECK_INTERVAL_MS = 6 * 3_600_000

export const shouldCheckForUpdate = (now: number, lastCheckAt: number | null): boolean =>
  lastCheckAt == null || now - lastCheckAt >= UPDATE_CHECK_INTERVAL_MS

function friendlyError(message: string): string {
  if (/ERR_INTERNET_DISCONNECTED|ENOTFOUND|ERR_NAME_NOT_RESOLVED|ETIMEDOUT|ECONNRESET|ERR_NETWORK/i.test(message))
    return 'You seem to be offline.'
  if (/code signature|did not pass validation|code requirement/i.test(message))
    return 'The update is not signed like this copy. Download the latest version from GitHub.'
  const first = message.split('\n')[0].trim()
  return first.length > 160 ? `${first.slice(0, 157)}…` : first
}

export function nextUpdateState(prev: UpdateState, e: UpdateEvent): UpdateState {
  // A downloaded update waits for a restart; nothing later changes that.
  if (prev.kind === 'ready') return prev
  switch (e.type) {
    case 'checking':
      return prev.kind === 'downloading' ? prev : { kind: 'checking' }
    case 'available':
      return { kind: 'downloading', version: e.version, percent: 0 }
    case 'progress':
      return prev.kind === 'downloading' ? { ...prev, percent: Math.round(e.percent) } : prev
    case 'downloaded':
      return { kind: 'ready', version: e.version }
    case 'none':
      return { kind: 'none', checkedAt: e.at }
    case 'error':
      return { kind: 'error', message: friendlyError(e.message) }
  }
}
