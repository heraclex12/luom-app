// Local-only session: this is a single-user personal app with no account and no server.
// Startup = open the local database (fixed local user id) + warm the clock; the DB stays open for the app's lifetime.
import { db, openUserDb } from '@/db/client'
import { primeClockOffset } from '@/sync/clock'

/** The one local user. The DB file name derives from it (main/db.ts), so it must stay stable forever. */
export const LOCAL_USER_ID = 1

let ready = false

/** Whether the local database is open (route guards render a fallback until it is). */
export const isAuthenticated = (): boolean => ready

/** Open the local database once at startup; must be awaited before the first render. */
export async function initSession(): Promise<void> {
  await openUserDb(LOCAL_USER_ID)
  ready = true
  try {
    await primeClockOffset(db)
  } catch (e) {
    console.warn('[session] clock warm-up failed; falling back to the local clock', e)
  }
}
