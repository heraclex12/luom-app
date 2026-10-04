// Dev-time Dock icon.
//
// The packaged app icon comes from build/icon.icns at build time. In dev, the Electron binary from
// node_modules shows the default Electron icon in the Dock, so we swap it at runtime.
import { app, nativeImage } from 'electron'
import { join } from 'node:path'

export function applyDevDockIcon(): void {
  // Dock is macOS-only; packaged builds use the .icns.
  if (process.platform !== 'darwin' || app.isPackaged) return

  // In dev __dirname is out/main; the icon lives in <root>/build/.
  const icon = nativeImage.createFromPath(join(__dirname, '../../build/icon.png'))
  if (icon.isEmpty()) return

  app.dock?.setIcon(icon)
}
