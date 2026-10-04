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
  /** Buttons (macOS shows them on the notification; with several, under "Options"). */
  actions?: { id: string; label: string }[]
  /** Opaque data handed back with the chosen action (e.g. a dict id). */
  payload?: string
}

/** A notification button pressed by the user. */
export interface NotificationAction {
  actionId: string
  payload?: string
}

/** Pseudo-route main sends to open the settings dialog. */
export const SETTINGS_ROUTE = 'settings'

/** Where the capture popup's text came from: the live selection, the clipboard, or nothing (typed). */
export interface CaptureInfo {
  source: 'selection' | 'clipboard' | 'none'
  /** Accessibility permission granted (needed to read selections). */
  trusted: boolean
}
