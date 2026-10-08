// Main process entry: app lifecycle + registration of the platform modules (each a Node/Electron primitive with no
// learning logic — all of that lives in the renderer).
import { app, protocol } from 'electron'
import { applyDevDockIcon } from './appIcon'
import { BOOK_SCHEME_PRIVILEGES, registerBooksIpc } from './books'
import { registerCaptureIpc } from './capture'
import { registerDbIpc } from './db'
import { registerDictionaryIpc } from './dictionary'
import { registerAiIpc } from './ai'
import { registerChatGptWebIpc } from './chatgptWeb'
import { registerEnrichIpc } from './enrich'
import { installAppMenu } from './menu'
import { createTray, registerMenubarIpc } from './menubar'
import { registerUpdaterIpc, startUpdater } from './updater'
import { registerEpisodesIpc } from './episodes'
import { registerPopQuizIpc } from './popQuiz'
import { handleWidgetLinks, registerWidgetIpc } from './widget'
import { registerSpeechProtocol, SPEECH_SCHEME_PRIVILEGES } from './speech'
import { registerStoryIpc } from './story'
import { registerSuggestIpc } from './suggest'
import { registerTranslateIpc } from './translate'
import { registerTtsIpc } from './tts'
import { createWindow, showMainWindow } from './window'

// Custom schemes must be declared privileged before app ready, all in one call.
protocol.registerSchemesAsPrivileged([BOOK_SCHEME_PRIVILEGES, SPEECH_SCHEME_PRIVILEGES])

// One instance only: a second launch just brings the existing window forward.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())
  handleWidgetLinks() // luom:// links from the desktop widget (may launch the app, so before ready)

  app.whenReady().then(() => {
    applyDevDockIcon()
    registerDbIpc() // local database executor: db:open/close/exec/batch
    registerBooksIpc() // book file storage + cover protocol
    registerSuggestIpc() // search suggestions (Datamuse)
    registerTranslateIpc() // reader sentence translation → Vietnamese
    registerTtsIpc() // Edge TTS synthesis for the reader's read-aloud
    registerSpeechProtocol() // speak:// pronunciation URLs (cached)
    registerDictionaryIpc() // dictionary:lookup (EN→VI entry)
    registerAiIpc() // AI providers: keys, status, model lists
    registerChatGptWebIpc() // built-in ChatGPT window: sign in / out
    registerEnrichIpc() // AI enrichment (Improve with AI)
    registerStoryIpc() // Story mode (Claude stories with your words)
    registerEpisodesIpc() // Daily Episodes: season plan + one episode a day
    registerPopQuizIpc() // pop quiz card for word flashes
    registerWidgetIpc() // desktop widget: writes widget.json for the WidgetKit extension
    registerCaptureIpc() // global hotkey quick capture
    registerMenubarIpc() // menu bar status, notifications, login item
    registerUpdaterIpc() // auto-update status / check / install

    // Launched at login → start hidden in the menu bar; otherwise show the window.
    const openedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin
    createWindow({ show: !openedAtLogin })
    installAppMenu() // Lượm / File / Edit / View / Window / Help (shortcuts in ./menuMap)
    createTray()
    startUpdater() // GitHub Releases: check on launch and every few hours (packaged builds only)

    app.on('activate', () => showMainWindow())
  })
}

// macOS apps keep running with no windows (menu bar + reminders); other platforms quit.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
