import { describe, expect, it } from 'vitest'
import {
  commandsClashingWith,
  DEFAULT_CAPTURE_SHORTCUT,
  effectiveAccelerator,
  MENU_COMMANDS,
  MENU_COMMAND_LIST,
  normalizeAccelerator,
  ROLE_ACCELERATORS,
} from './menuMap'

describe('normalizeAccelerator', () => {
  it('canonicalises modifier aliases, order and case', () => {
    expect(normalizeAccelerator('Alt+Cmd+e')).toBe('command+alt+e')
    expect(normalizeAccelerator('Command+Option+E')).toBe('command+alt+e')
    expect(normalizeAccelerator('CmdOrCtrl+Shift+S')).toBe('command+shift+s')
  })
})

describe('menu keyboard map', () => {
  it('has unique ids and unique accelerators', () => {
    const ids = MENU_COMMAND_LIST.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    const accs = MENU_COMMAND_LIST.map((c) => normalizeAccelerator(c.accelerator))
    expect(new Set(accs).size).toBe(accs.length)
  })

  it('every shortcut uses ⌘, so bare study / game keys (1/2/3/Z/Enter/Space) never trigger the menu', () => {
    for (const c of MENU_COMMAND_LIST) expect(normalizeAccelerator(c.accelerator).startsWith('command+')).toBe(true)
  })

  it('does not collide with the standard role items or the default capture hotkey', () => {
    const taken = new Set([...ROLE_ACCELERATORS, DEFAULT_CAPTURE_SHORTCUT].map(normalizeAccelerator))
    for (const c of MENU_COMMAND_LIST) expect(taken.has(normalizeAccelerator(c.accelerator))).toBe(false)
  })

  it('maps the navigation commands to their routes', () => {
    expect(MENU_COMMANDS.myWords.action).toEqual({ kind: 'route', route: '/wordbook' })
    expect(MENU_COMMANDS.dictionary.action).toEqual({ kind: 'route', route: '/lookup' })
    expect(MENU_COMMANDS.reading.action).toEqual({ kind: 'route', route: '/reading' })
    expect(MENU_COMMANDS.play.action).toEqual({ kind: 'route', route: '/wordbook/play' })
    expect(MENU_COMMANDS.studyNow.action).toEqual({ kind: 'route', route: '/wordbook/study' })
    expect(MENU_COMMANDS.settings.action).toEqual({ kind: 'settings' })
    expect(MENU_COMMANDS.addWord.action).toEqual({ kind: 'capture' })
  })
})

describe('capture hotkey clashes', () => {
  it('finds a command the user rebinds the capture hotkey onto', () => {
    expect(commandsClashingWith('Cmd+Shift+S').map((c) => c.id)).toEqual(['study-now'])
    expect(commandsClashingWith(DEFAULT_CAPTURE_SHORTCUT)).toEqual([])
    expect(commandsClashingWith(null)).toEqual([])
  })

  it('drops the accelerator from a clashing command only', () => {
    expect(effectiveAccelerator(MENU_COMMANDS.studyNow, 'Shift+Command+S')).toBeUndefined()
    expect(effectiveAccelerator(MENU_COMMANDS.play, 'Shift+Command+S')).toBe('Command+4')
  })
})
