/**
 * App theme: preference system / light / dark, applied as the data-mode attribute on <html>.
 *
 * Colours are handled entirely in CSS (styles/system.css): data-mode=dark forces dark,
 * data-mode=light forces light, and without it `@media (prefers-color-scheme)` follows the OS.
 * So "system" just removes the attribute; OS changes apply live with no JS listener.
 */

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'qiyan.theme'

/** Read the stored preference; defaults to system when nothing is stored. */
export function readThemePreference(): ThemePreference {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

/** Apply to <html>: system removes data-mode (back to the media query), others force that mode. */
export function applyThemePreference(pref: ThemePreference): void {
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.mode
  else root.dataset.mode = pref
}

/** Persist the preference; system is the default, so it just clears the record. */
export function storeThemePreference(pref: ThemePreference): void {
  if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, pref)
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Whether the app is *actually* dark right now (preference resolved to light/dark). CSS doesn't
 * need this, but non-CSS consumers do — e.g. the foliate engine inside the book iframe, which
 * doesn't use CDS tokens and must be told explicitly.
 */
export function isDarkMode(): boolean {
  const mode = document.documentElement.dataset.mode
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia(DARK_QUERY).matches
}

/**
 * Subscribe to actual light/dark changes; returns an unsubscribe function. Covers both sources:
 * the user changing the preference (data-mode on <html>) and the OS switching while on "system".
 */
export function subscribeDarkMode(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] })
  const mq = window.matchMedia(DARK_QUERY)
  mq.addEventListener('change', onChange)
  return () => {
    observer.disconnect()
    mq.removeEventListener('change', onChange)
  }
}
