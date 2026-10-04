/**
 * Per-device memory: things the UI passively remembers ("last used" highlight style, sentence
 * translation engine, app theme…).
 *
 * Stored in localStorage only — not in `user_setting`, not in sqlite, not synced, and not shown in
 * settings. Rule of thumb: the user wouldn't expect it to follow them to another device. Real user
 * settings (font size / font family…) go through `@/settings`.
 *
 * This helper only does read + validate/fallback + write; deliberately no central registry,
 * change subscriptions or schema validation. Keys follow `qiyan.<domain>.<name>`.
 */

/** Read/write handle for one device memory. read never throws: unknown values fall back to the default. */
export interface DeviceMemory<T> {
  read: () => T
  store: (value: T) => void
}

/**
 * Define a device memory.
 *
 * @param key       localStorage key, `qiyan.<domain>.<name>` (renaming loses the user's last choice)
 * @param fallback  default when missing / storage error / invalid
 * @param sanitize  turn the parsed unknown value into a valid T (fall back for unknown parts)
 */
export function defineDeviceMemory<T>(
  key: string,
  fallback: T,
  sanitize: (raw: unknown) => T,
): DeviceMemory<T> {
  return {
    read() {
      try {
        const raw = localStorage.getItem(key)
        if (raw === null) return fallback
        return sanitize(JSON.parse(raw))
      } catch {
        // Storage unavailable / bad JSON / sanitize threw: one bad record shouldn't break the feature.
        return fallback
      }
    },
    store(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        // Write failed (private mode / quota): we just won't remember; the action itself still works.
        console.warn(`[deviceMemory] failed to write ${key}:`, e)
      }
    },
  }
}
