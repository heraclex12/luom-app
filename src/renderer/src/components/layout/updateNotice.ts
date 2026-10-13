// When the sidebar shows "Update ready" (pure; the view is ./UpdateReady.tsx): only once main has downloaded an
// update that waits for a restart, so people who keep Lượm running in the menu bar see it and restart.
import type { UpdateState } from '../../../../shared/update'

/** The downloaded version waiting for a restart, or null when there is nothing to restart for. */
export const readyUpdate = (s: UpdateState | null): string | null => (s?.kind === 'ready' ? s.version : null)
