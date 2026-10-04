// Hotkey recorder: a keydown becomes an Electron accelerator only with at least one of ⌘/⌃/⌥ plus a real key,
// so plain typing never steals a global shortcut.
import { describe, expect, it } from 'vitest'
import { acceleratorFromKey, prettyAccelerator } from './shortcut'

const ev = (key: string, code: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
  key,
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
})

describe('acceleratorFromKey', () => {
  it('builds modifier+key accelerators from the physical key (⌥ changes e.key on macOS)', () => {
    expect(acceleratorFromKey(ev('´', 'KeyE', { altKey: true, metaKey: true }))).toBe('Alt+Command+E')
    expect(acceleratorFromKey(ev('D', 'KeyD', { ctrlKey: true, shiftKey: true }))).toBe('Control+Shift+D')
    expect(acceleratorFromKey(ev('1', 'Digit1', { metaKey: true }))).toBe('Command+1')
    expect(acceleratorFromKey(ev(' ', 'Space', { altKey: true }))).toBe('Alt+Space')
    expect(acceleratorFromKey(ev('F5', 'F5', { metaKey: true }))).toBe('Command+F5')
  })
  it('rejects modifier-only presses, missing modifiers and Shift-only combos', () => {
    expect(acceleratorFromKey(ev('Meta', 'MetaLeft', { metaKey: true }))).toBeNull()
    expect(acceleratorFromKey(ev('e', 'KeyE'))).toBeNull()
    expect(acceleratorFromKey(ev('E', 'KeyE', { shiftKey: true }))).toBeNull()
  })
})

describe('prettyAccelerator', () => {
  it('renders macOS symbols', () => {
    expect(prettyAccelerator('Alt+Command+E')).toBe('⌥⌘E')
    expect(prettyAccelerator('Control+Shift+Space')).toBe('⌃⇧Space')
    expect(prettyAccelerator('')).toBe('Off')
  })
})
