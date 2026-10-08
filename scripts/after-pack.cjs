// electron-builder afterPack (macOS):
// 1. Shown name "Lượm" (Finder, Dock, Spotlight). The bundle itself must stay ASCII ("Luom"): Electron finds its
//    helper apps through CFBundleName and aborts otherwise. macOS shows the localized CFBundleDisplayName instead of
//    the file name when LSHasLocalizedDisplayName is set (electron-builder.yml mac.extendInfo).
// 2. The desktop widget (native/widget/.build/LuomWidget.appex from scripts/build-widget.mjs) goes into
//    Contents/PlugIns. It is always signed on its own with its sandbox entitlements before the app around it.
// 3. Code signing, done here (electron-builder's own signing is off, mac.identity: null) so the widget keeps its
//    entitlements and the seal covers step 1:
//    - Developer ID (a "Developer ID Application" identity in the keychain, or LUOM_SIGN_IDENTITY): hardened runtime
//      with build/entitlements.mac.plist, signed inside-out by @electron/osx-sign, then notarized by Apple and
//      stapled (notarytool keychain profile LUOM_NOTARY_PROFILE, default "luom"; LUOM_NOTARIZE=0 skips it for local
//      builds). Gatekeeper then opens the app without any warning.
//    - otherwise the stable self-signed certificate in ~/.luom-signing (README → Releases), else ad-hoc.
//    A stable signature is what lets auto-update install new versions (macOS checks the update is signed like the
//    running app) and keeps permissions (Accessibility, microphone, notifications) across updates.
const { execFileSync } = require('node:child_process')
const { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { homedir } = require('node:os')
const { join } = require('node:path')

const DISPLAY_NAME = 'Lượm'
const SELF_SIGNED = 'Luom Self-Signed Code Signing'
const ENTITLEMENTS = join(__dirname, '..', 'build', 'entitlements.mac.plist')
const NOTARY_PROFILE = process.env.LUOM_NOTARY_PROFILE || 'luom'
const SIGNING_DIR = process.env.LUOM_SIGNING_DIR || join(homedir(), '.luom-signing')
const WIDGET = join(__dirname, '..', 'native', 'widget', '.build', 'LuomWidget.appex')
const WIDGET_ENTITLEMENTS = join(__dirname, '..', 'native', 'widget', 'LuomWidget.entitlements')

function embedWidget(appPath) {
  if (!existsSync(WIDGET)) {
    console.warn('  • after-pack: no widget build (npm run build:widget); the app ships without its desktop widget')
    return null
  }
  const plugins = join(appPath, 'Contents', 'PlugIns')
  mkdirSync(plugins, { recursive: true })
  const dest = join(plugins, 'LuomWidget.appex')
  cpSync(WIDGET, dest, { recursive: true })
  return dest
}

function localizeName(appPath) {
  const resources = join(appPath, 'Contents', 'Resources')
  for (const lang of ['en', 'vi', 'Base']) {
    const dir = join(resources, `${lang}.lproj`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'InfoPlist.strings'), `CFBundleDisplayName = "${DISPLAY_NAME}";\n`, 'utf8')
  }
}

/** The Developer ID identity to sign with, or null for the self-signed path. */
function developerId() {
  const wanted = process.env.LUOM_SIGN_IDENTITY
  if (wanted) return wanted.startsWith('Developer ID Application:') ? wanted : null
  const found = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], { encoding: 'utf8' })
  return /"(Developer ID Application: [^"]+)"/.exec(found)?.[1] ?? null
}

async function signDeveloperId(appPath, widget, identity) {
  const runtime = ['--force', '--options', 'runtime', '--timestamp', '--sign', identity]
  if (widget) execFileSync('codesign', [...runtime, '--entitlements', WIDGET_ENTITLEMENTS, widget], { stdio: 'inherit' })
  const { signAsync } = require('@electron/osx-sign')
  await signAsync({
    app: appPath,
    identity,
    platform: 'darwin',
    type: 'distribution',
    preAutoEntitlements: false,
    // Already signed above with its own sandbox entitlements.
    ignore: (file) => file.includes('LuomWidget.appex'),
    optionsForFile: () => ({ hardenedRuntime: true, entitlements: ENTITLEMENTS }),
  })
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
  console.log(`  • after-pack: signed with ${identity}`)
  if (process.env.LUOM_NOTARIZE === '0') {
    console.warn('  • after-pack: LUOM_NOTARIZE=0, not notarized (Gatekeeper will warn on other Macs)')
    return
  }
  console.log(`  • after-pack: notarizing (Apple usually takes a few minutes)…`)
  const { notarize } = require('@electron/notarize')
  await notarize({ appPath, keychainProfile: NOTARY_PROFILE })
  execFileSync('spctl', ['--assess', '--type', 'execute', '--verbose=2', appPath], { stdio: 'inherit' })
  console.log('  • after-pack: notarized and stapled')
}

function signSelf(appPath, widget) {
  const keychain = join(SIGNING_DIR, 'luom-signing.keychain-db')
  const passwordFile = join(SIGNING_DIR, 'keychain-password.txt')
  let identity = '-'
  if (existsSync(keychain) && existsSync(passwordFile)) {
    execFileSync('security', ['unlock-keychain', '-p', readFileSync(passwordFile, 'utf8').trim(), keychain])
    identity = SELF_SIGNED
  } else {
    console.warn(`  • after-pack: no signing keychain in ${SIGNING_DIR}; ad-hoc signing (auto-update will not work)`)
  }
  execFileSync('codesign', ['--force', '--deep', '--sign', identity, appPath], { stdio: 'inherit' })
  if (widget) {
    execFileSync('codesign', ['--force', '--sign', identity, '--entitlements', WIDGET_ENTITLEMENTS, widget], { stdio: 'inherit' })
    execFileSync('codesign', ['--force', '--sign', identity, appPath], { stdio: 'inherit' })
  }
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
  console.log(`  • after-pack: signed with ${identity === '-' ? 'ad-hoc' : identity}`)
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  localizeName(appPath)
  const widget = embedWidget(appPath)
  const identity = developerId()
  if (identity) await signDeveloperId(appPath, widget, identity)
  else signSelf(appPath, widget)
}
