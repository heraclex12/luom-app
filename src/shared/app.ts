// App-shell bridge contract (menu bar status, notifications, navigation requests from main).

/** Pushed by the renderer whenever its counts change; drives the menu bar title and dock badge. */
export interface AppStatus {
  /** Words due for review now. */
  due: number
  /** New words still available to learn today (within the daily limit). */
  newAvailable: number
}

/** A native notification; clicking it opens the main window at `route`. */
export interface AppNotification {
  title: string
  body: string
  route?: string
}

/** Pseudo-route main sends to open the settings dialog. */
export const SETTINGS_ROUTE = 'settings'
