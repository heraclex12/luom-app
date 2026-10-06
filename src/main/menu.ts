// macOS application menu (Lượm / File / Edit / View / Window / Help). Custom commands and their shortcuts come
// from the keyboard map in ./menuMap; navigation shows the main window (it may be hidden to the menu bar) and sends
// the route over the existing 'app:navigate' channel, which the renderer's app/ composition root handles.
import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron'
import { getCaptureShortcut, onCaptureShortcutChange, openCapture } from './capture'
import { effectiveAccelerator, MENU_COMMANDS, type MenuCommand } from './menuMap'
import { showMainWindow } from './window'
import { SETTINGS_ROUTE } from '../shared/app'

const WEBSITE_URL = 'https://heraclex12.github.io/luom-app/'
const APP_NAME = 'Lượm'

function run(command: MenuCommand): void {
  const { action } = command
  if (action.kind === 'capture') openCapture('')
  else if (action.kind === 'settings') showMainWindow(SETTINGS_ROUTE)
  else showMainWindow(action.route)
}

function item(command: MenuCommand, captureShortcut: string | null): MenuItemConstructorOptions {
  return {
    id: command.id,
    label: command.label,
    accelerator: effectiveAccelerator(command, captureShortcut),
    click: () => run(command),
  }
}

export function buildAppMenu(captureShortcut: string | null = getCaptureShortcut()): Menu {
  const cmd = (command: MenuCommand): MenuItemConstructorOptions => item(command, captureShortcut)
  const dev = !app.isPackaged

  const template: MenuItemConstructorOptions[] = [
    {
      label: APP_NAME,
      submenu: [
        { label: `About ${APP_NAME}`, role: 'about' },
        { type: 'separator' },
        cmd(MENU_COMMANDS.settings),
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { label: `Hide ${APP_NAME}`, role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { label: `Quit ${APP_NAME}`, role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        cmd(MENU_COMMANDS.addWord),
        cmd(MENU_COMMANDS.lookUp),
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    // Standard roles: without them ⌘C / ⌘V / ⌘Z stop working in text fields.
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        cmd(MENU_COMMANDS.myWords),
        cmd(MENU_COMMANDS.dictionary),
        cmd(MENU_COMMANDS.reading),
        cmd(MENU_COMMANDS.play),
        { type: 'separator' },
        cmd(MENU_COMMANDS.studyNow),
        { type: 'separator' },
        ...(dev
          ? ([{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }] as MenuItemConstructorOptions[])
          : []),
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [{ label: `${APP_NAME} Website`, click: () => void shell.openExternal(WEBSITE_URL) }],
    },
  ]
  return Menu.buildFromTemplate(template)
}

/** Install the application menu (call once the app is ready); rebuilt when the capture hotkey changes. */
export function installAppMenu(): void {
  app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: app.getVersion() })
  Menu.setApplicationMenu(buildAppMenu())
  onCaptureShortcutChange((acc) => Menu.setApplicationMenu(buildAppMenu(acc)))
}
