// "The app is quitting" for windows that hide instead of closing (main window, ChatGPT worker). Set by before-quit,
// and explicitly before an update restart: quitAndInstall closes the windows *before* before-quit fires, so without
// this they would cancel the close and the restart would never happen.
import { app } from 'electron'

let quitting = false

app.on('before-quit', () => {
  quitting = true
})

export const markQuitting = (): void => {
  quitting = true
}

export const isQuitting = (): boolean => quitting
