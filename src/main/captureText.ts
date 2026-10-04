// Pure rules for the capture hotkey's text (kept free of Electron imports so it is unit-testable).

export interface HelperResult {
  text: string
  /** ax = read via Accessibility, copy = clean ⌘C, none = nothing selected. */
  source: 'ax' | 'copy' | 'none'
  /** Whether the app has Accessibility permission. */
  trusted: boolean
}

export type CaptureSource = 'selection' | 'clipboard' | 'none'

/** Longer selections are sentences/paragraphs, not vocabulary. */
export const MAX_CAPTURE_LENGTH = 120

export function parseHelperOutput(stdout: string): HelperResult | null {
  try {
    const v = JSON.parse(stdout.trim()) as Partial<HelperResult>
    if (typeof v.text !== 'string' || typeof v.trusted !== 'boolean') return null
    if (v.source !== 'ax' && v.source !== 'copy' && v.source !== 'none') return null
    return { text: v.text, source: v.source, trusted: v.trusted }
  } catch {
    return null
  }
}

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim()

/** Selection first; the clipboard only when nothing is selected. Over-long text → empty (user types instead). */
export function chooseCaptureText(
  helper: HelperResult | null,
  clipboardText: string,
): { text: string; source: CaptureSource } {
  const selected = helper && helper.source !== 'none' ? clean(helper.text) : ''
  const pick = selected
    ? { text: selected, source: 'selection' as const }
    : clean(clipboardText)
      ? { text: clean(clipboardText), source: 'clipboard' as const }
      : { text: '', source: 'none' as const }
  return pick.text.length > MAX_CAPTURE_LENGTH ? { text: '', source: pick.source } : pick
}
