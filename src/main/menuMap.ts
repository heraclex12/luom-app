// Application menu keyboard map: every custom menu command with its accelerator and what it does, in one place.
// Pure data (no electron import) so it can be unit-tested; src/main/menu.ts turns it into the native menu.
// Rules: every accelerator carries ⌘ (the study screen and games use bare 1/2/3/Z/Enter/Space and ignore modified
// keys), and none may equal the global capture hotkey (default ⌥⌘E, user-configurable).

/** Where a command goes in the app. `route` is a hash route; `settings` opens the Settings dialog. */
export type MenuAction =
  | { kind: 'route'; route: string }
  | { kind: 'settings' }
  | { kind: 'capture' }

export interface MenuCommand {
  id: string
  label: string
  accelerator: string
  action: MenuAction
}

export const MENU_COMMANDS = {
  settings: { id: 'settings', label: 'Settings…', accelerator: 'Command+,', action: { kind: 'settings' } },
  addWord: { id: 'add-word', label: 'Add a Word…', accelerator: 'Command+N', action: { kind: 'capture' } },
  lookUp: { id: 'look-up', label: 'Look Up…', accelerator: 'Command+L', action: { kind: 'route', route: '/lookup' } },
  myWords: { id: 'my-words', label: 'My Words', accelerator: 'Command+1', action: { kind: 'route', route: '/wordbook' } },
  dictionary: { id: 'dictionary', label: 'Dictionary', accelerator: 'Command+2', action: { kind: 'route', route: '/lookup' } },
  reading: { id: 'reading', label: 'Reading', accelerator: 'Command+3', action: { kind: 'route', route: '/reading' } },
  play: { id: 'play', label: 'Play', accelerator: 'Command+4', action: { kind: 'route', route: '/wordbook/play' } },
  studyNow: {
    id: 'study-now',
    label: 'Study Now',
    accelerator: 'Command+Shift+S',
    action: { kind: 'route', route: '/wordbook/study' },
  },
} as const satisfies Record<string, MenuCommand>

export const MENU_COMMAND_LIST: readonly MenuCommand[] = Object.values(MENU_COMMANDS)

const MODIFIER_ALIASES: Record<string, string> = {
  cmd: 'command',
  command: 'command',
  cmdorctrl: 'command',
  commandorcontrol: 'command',
  ctrl: 'control',
  control: 'control',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
}
const MODIFIER_ORDER = ['command', 'control', 'alt', 'shift']

/** Canonical form of an Electron accelerator ("Alt+Cmd+e" and "Command+Option+E" → "command+alt+e"). */
export function normalizeAccelerator(acc: string): string {
  const parts = acc
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
  const mods = new Set<string>()
  const keys: string[] = []
  for (const p of parts) {
    const mod = MODIFIER_ALIASES[p]
    if (mod) mods.add(mod)
    else keys.push(p)
  }
  return [...MODIFIER_ORDER.filter((m) => mods.has(m)), ...keys].join('+')
}

/** Menu commands whose accelerator equals `accelerator` (e.g. the user's capture hotkey). */
export function commandsClashingWith(accelerator: string | null | undefined, commands = MENU_COMMAND_LIST): MenuCommand[] {
  if (!accelerator) return []
  const target = normalizeAccelerator(accelerator)
  return commands.filter((c) => normalizeAccelerator(c.accelerator) === target)
}

/**
 * The accelerator to show on a command: none when it would clash with the global capture hotkey (the global
 * shortcut wins anyway, so the menu shouldn't advertise a key that never reaches it).
 */
export function effectiveAccelerator(command: MenuCommand, captureShortcut: string | null | undefined): string | undefined {
  return commandsClashingWith(captureShortcut, [command]).length ? undefined : command.accelerator
}

/** Accelerators the standard macOS role items already own (Edit / Window / View roles, Hide, Quit). */
export const ROLE_ACCELERATORS = [
  'Command+Q', // quit
  'Command+H', // hide
  'Command+Alt+H', // hideOthers
  'Command+W', // close
  'Command+M', // minimize
  'Command+Z', // undo
  'Command+Shift+Z', // redo
  'Command+X',
  'Command+C',
  'Command+V',
  'Command+Alt+Shift+V', // pasteAndMatchStyle
  'Command+A', // selectAll
  'Control+Command+F', // togglefullscreen
  'Command+R', // reload (dev)
  'Command+Alt+I', // toggleDevTools (dev)
] as const

/** Global capture hotkey default (settings `app.captureShortcut`). */
export const DEFAULT_CAPTURE_SHORTCUT = 'Alt+Command+E'
