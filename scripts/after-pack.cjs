// electron-builder afterPack: give the app its shown name "Lượm" (Finder, Dock, Spotlight, Launchpad).
// The bundle itself must stay ASCII ("Luom"): Electron locates its helper apps through CFBundleName and fails to start
// otherwise. macOS shows a localized CFBundleDisplayName instead of the file name when LSHasLocalizedDisplayName is set
// (electron-builder.yml mac.extendInfo), so write it for English and Vietnamese.
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const DISPLAY_NAME = 'Lượm'

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const resources = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
  for (const lang of ['en', 'vi', 'Base']) {
    const dir = join(resources, `${lang}.lproj`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'InfoPlist.strings'), `CFBundleDisplayName = "${DISPLAY_NAME}";\n`, 'utf8')
  }
}
