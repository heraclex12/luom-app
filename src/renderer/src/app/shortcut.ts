// Global hotkey helpers: keyboard event → Electron accelerator, and accelerator → macOS symbols.

export interface KeyLike {
  key: string
  code: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

/** Physical key → accelerator key name (uses e.code so ⌥ combos still map to the letter). */
function keyName(code: string): string | null {
  let m = /^Key([A-Z])$/.exec(code)
  if (m) return m[1]!
  m = /^Digit(\d)$/.exec(code)
  if (m) return m[1]!
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code
  const named: Record<string, string> = {
    Space: 'Space',
    Enter: 'Enter',
    Tab: 'Tab',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  }
  return named[code] ?? null
}

/** A keydown → accelerator (e.g. "Alt+Command+E"); null unless ⌘/⌃/⌥ is held with a real key. */
export function acceleratorFromKey(e: KeyLike): string | null {
  if (!e.metaKey && !e.ctrlKey && !e.altKey) return null
  const key = keyName(e.code)
  if (!key) return null
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Control')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Command')
  parts.push(key)
  return parts.join('+')
}

/** "Alt+Command+E" → "⌥⌘E" (empty = Off). */
export function prettyAccelerator(acc: string): string {
  if (!acc) return 'Off'
  const symbols: Record<string, string> = { Control: '⌃', Alt: '⌥', Shift: '⇧', Command: '⌘' }
  return acc
    .split('+')
    .map((p) => symbols[p] ?? p)
    .join('')
}
