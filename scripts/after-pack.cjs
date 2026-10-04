// electron-builder afterPack (macOS):
// 1. Shown name "Lượm" (Finder, Dock, Spotlight). The bundle itself must stay ASCII ("Luom"): Electron finds its
//    helper apps through CFBundleName and aborts otherwise. macOS shows the localized CFBundleDisplayName instead of
//    the file name when LSHasLocalizedDisplayName is set (electron-builder.yml mac.extendInfo).
// 2. Code signing with the stable self-signed certificate in ~/.luom-signing (README → Releases). A stable signature
//    is what lets auto-update install new versions (macOS checks the update is signed like the running app) and keeps
//    permissions (Accessibility, notifications) across updates. Signed here, after step 1, so the seal covers it;
//    electron-builder's own signing is off (mac.identity: null) because it only accepts Apple-issued certificates.
const { execFileSync } = require('node:child_process')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { homedir } = require('node:os')
const { join } = require('node:path')

const DISPLAY_NAME = 'Lượm'
const IDENTITY = process.env.LUOM_SIGN_IDENTITY || 'Luom Self-Signed Code Signing'
const SIGNING_DIR = process.env.LUOM_SIGNING_DIR || join(homedir(), '.luom-signing')

function localizeName(appPath) {
  const resources = join(appPath, 'Contents', 'Resources')
  for (const lang of ['en', 'vi', 'Base']) {
    const dir = join(resources, `${lang}.lproj`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'InfoPlist.strings'), `CFBundleDisplayName = "${DISPLAY_NAME}";\n`, 'utf8')
  }
}

function sign(appPath) {
  const keychain = join(SIGNING_DIR, 'luom-signing.keychain-db')
  const passwordFile = join(SIGNING_DIR, 'keychain-password.txt')
  let identity = '-'
  if (existsSync(keychain) && existsSync(passwordFile)) {
    execFileSync('security', ['unlock-keychain', '-p', readFileSync(passwordFile, 'utf8').trim(), keychain])
    identity = IDENTITY
  } else {
    console.warn(`  • after-pack: no signing keychain in ${SIGNING_DIR}; ad-hoc signing (auto-update will not work)`)
  }
  execFileSync('codesign', ['--force', '--deep', '--sign', identity, appPath], { stdio: 'inherit' })
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
  console.log(`  • after-pack: signed with ${identity === '-' ? 'ad-hoc' : identity}`)
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  localizeName(appPath)
  sign(appPath)
}
