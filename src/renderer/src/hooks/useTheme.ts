import { useState, useSyncExternalStore } from 'react'
import {
  applyThemePreference,
  isDarkMode,
  readThemePreference,
  storeThemePreference,
  subscribeDarkMode,
  type ThemePreference,
} from '@/lib/theme'

/**
 * Read/write the theme preference: returns [preference, setter]; the setter writes through to
 * <html> and localStorage. Initial application on startup happens in main.tsx.
 */
export function useTheme(): [ThemePreference, (pref: ThemePreference) => void] {
  const [pref, setPref] = useState<ThemePreference>(readThemePreference)

  const set = (next: ThemePreference): void => {
    setPref(next)
    applyThemePreference(next)
    storeThemePreference(next)
  }

  return [pref, set]
}

/**
 * Whether the app is actually dark (resolved from the preference, updates live with preference and
 * OS changes). For non-CSS consumers (e.g. the foliate engine); plain styling should use CDS tokens.
 */
export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribeDarkMode, isDarkMode)
}
