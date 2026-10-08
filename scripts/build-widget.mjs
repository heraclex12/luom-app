// Build the desktop widget (native/widget/LuomWidget.swift → native/widget/.build/LuomWidget.appex), a WidgetKit
// extension that scripts/after-pack.cjs puts into Luom.app/Contents/PlugIns and signs. Needs Xcode (15 or later) with
// its license accepted. Done the way Xcode builds an extension, without an Xcode project:
// 1. swiftc compiles the widget and also emits the compile-time values of its App Intents (the widget's buttons and
//    Edit menu are App Intents);
// 2. appintentsmetadataprocessor turns those into Contents/Resources/Metadata.appintents. Without it macOS doesn't
//    know the intents, so Show meaning / Again / Got it would do nothing.
// Fails the release when anything is missing, so a release never ships a broken widget by accident.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const SRC = resolve('native/widget/LuomWidget.swift')
const BUILD = resolve('native/widget/.build')
const APPEX = join(BUILD, 'LuomWidget.appex')
const WORK = join(BUILD, 'work')
const MODULE = 'LuomWidget'
const BUNDLE_ID = 'com.envilearn.app.widget'
const MIN_MACOS = '14.0'
const TRIPLE = `arm64-apple-macos${MIN_MACOS}`
// Protocols whose conformances the compiler records for App Intents (Xcode's SWIFT_EMIT_CONST_VALUE_PROTOCOLS).
const CONST_PROTOCOLS = [
  'AppIntent', 'EntityQuery', 'AppEntity', 'TransientEntity', 'AppEnum', 'AppShortcutProviding',
  'AppShortcutsProvider', 'AnyResolverProviding', 'AppIntentsPackage', 'DynamicOptionsProvider',
  '_IntentValueRepresentable', '_AssistantIntentsProvider', '_GenerativeFunctionExtractable', 'IntentValueQuery',
  'Resolver',
]

function fail(message) {
  console.error(`[build-widget] ${message}`)
  process.exit(1)
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

// ── toolchain: Xcode, licensed, with a macOS 14+ SDK ──
let developerDir, sdk, sdkVersion
try {
  developerDir = run('xcode-select', ['-p'])
  sdk = run('xcrun', ['--sdk', 'macosx', '--show-sdk-path'])
  sdkVersion = run('xcrun', ['--sdk', 'macosx', '--show-sdk-version'])
} catch (e) {
  const out = String(e.stderr || e.message)
  fail(
    out.includes('license')
      ? 'accept the Xcode license first: sudo xcodebuild -license accept'
      : `no Xcode toolchain (${out.trim()}): install Xcode and run sudo xcode-select -s /Applications/Xcode.app`,
  )
}
if (!developerDir.includes('.app/')) fail('select Xcode, not the Command Line Tools: sudo xcode-select -s /Applications/Xcode.app')
if (Number.parseFloat(sdkVersion) < 14) fail(`the macOS ${sdkVersion} SDK is too old: install Xcode 15 or later`)
const toolchainDir = join(developerDir, 'Toolchains/XcodeDefault.xctoolchain')
const versionPlist = join(dirname(developerDir), 'version.plist')
const xcodeBuild = run('/usr/libexec/PlistBuddy', ['-c', 'Print :ProductBuildVersion', versionPlist])
const metadataTool = join(toolchainDir, 'usr/bin/appintentsmetadataprocessor')
if (!existsSync(metadataTool)) fail(`App Intents metadata tool missing in ${toolchainDir}: reinstall Xcode`)

// ── 1. compile (+ App Intents compile-time values) ──
rmSync(BUILD, { recursive: true, force: true })
mkdirSync(join(APPEX, 'Contents/MacOS'), { recursive: true })
mkdirSync(join(APPEX, 'Contents/Resources'), { recursive: true })
mkdirSync(WORK, { recursive: true })
const binary = join(APPEX, 'Contents/MacOS', MODULE)
const constValues = join(WORK, `${MODULE}.swiftconstvalues`)
const protocolsFile = join(WORK, 'const_extract_protocols.json')
writeFileSync(protocolsFile, JSON.stringify(CONST_PROTOCOLS))
execFileSync(
  'xcrun',
  ['swiftc', '-O', '-wmo', '-swift-version', '5', '-parse-as-library', '-application-extension',
    '-module-name', MODULE, '-target', TRIPLE, '-sdk', sdk, SRC, '-o', binary,
    '-framework', 'WidgetKit', '-framework', 'SwiftUI', '-framework', 'AppIntents',
    // Extensions start in the system's extension launcher, as Xcode links them (LD_ENTRY_POINT of app extensions);
    // starting at our own main instead crashes in ExtensionFoundation before the widget runs.
    '-Xlinker', '-e', '-Xlinker', '_NSExtensionMain',
    '-emit-const-values-path', constValues, '-Xfrontend', '-const-gather-protocols-file', '-Xfrontend', protocolsFile],
  { stdio: 'inherit' },
)
if (!existsSync(constValues)) fail('the compiler wrote no App Intents values')

// ── 2. App Intents metadata → Contents/Resources/Metadata.appintents ──
const list = (name, lines) => {
  const file = join(WORK, name)
  writeFileSync(file, lines.map((l) => `${l}\n`).join(''))
  return file
}
execFileSync(
  metadataTool,
  ['--toolchain-dir', toolchainDir, '--module-name', MODULE, '--sdk-root', sdk, '--xcode-version', xcodeBuild,
    '--platform-family', 'macOS', '--deployment-target', MIN_MACOS, '--target-triple', TRIPLE,
    '--bundle-identifier', BUNDLE_ID, '--output', join(APPEX, 'Contents/Resources'), '--binary-file', binary,
    '--dependency-file', join(WORK, `${MODULE}_dependency_info.dat`),
    '--stringsdata-file', join(WORK, 'ExtractedAppShortcutsMetadata.stringsdata'),
    '--source-file-list', list(`${MODULE}.SwiftFileList`, [SRC]),
    '--swift-const-vals-list', list(`${MODULE}.SwiftConstValuesFileList`, [constValues]),
    '--metadata-file-list', list(`${MODULE}.DependencyMetadataFileList`, []),
    '--static-metadata-file-list', list(`${MODULE}.DependencyStaticMetadataFileList`, []),
    '--compile-time-extraction', '--deployment-aware-processing', '--no-app-shortcuts-localization', '--force'],
  { stdio: 'inherit' },
)
const actions = join(APPEX, 'Contents/Resources/Metadata.appintents/extract.actionsdata')
if (!existsSync(actions)) fail('no App Intents metadata was written')
for (const intent of ['ShowMeaningIntent', 'AnswerIntent', 'NextWordIntent', 'WordsConfig']) {
  if (!readFileSync(actions, 'utf8').includes(intent)) fail(`App Intents metadata is missing ${intent}`)
}

// ── 3. Info.plist ──
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
writeFileSync(
  join(APPEX, 'Contents/Info.plist'),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleSupportedPlatforms</key><array><string>MacOSX</string></array>
  <key>CFBundleIdentifier</key><string>${BUNDLE_ID}</string>
  <key>CFBundleExecutable</key><string>${MODULE}</string>
  <key>CFBundleName</key><string>${MODULE}</string>
  <key>CFBundleDisplayName</key><string>Lượm</string>
  <key>CFBundlePackageType</key><string>XPC!</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>LSMinimumSystemVersion</key><string>${MIN_MACOS}</string>
  <key>NSExtension</key>
  <dict><key>NSExtensionPointIdentifier</key><string>com.apple.widgetkit-extension</string></dict>
</dict>
</plist>
`,
)
rmSync(WORK, { recursive: true, force: true })
console.log(`[build-widget] ${APPEX} (${version}; Xcode ${xcodeBuild}, macOS ${sdkVersion} SDK)`)
