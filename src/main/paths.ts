// Paths to bundled resources (menu bar icon, native helper).
import { app } from 'electron'
import { join } from 'node:path'

/** resources/ lives next to the app in dev and under Contents/Resources when packaged. */
export function resourcePath(...parts: string[]): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'resources', ...parts)
    : join(app.getAppPath(), 'resources', ...parts)
}
