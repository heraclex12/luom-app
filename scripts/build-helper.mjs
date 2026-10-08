// Compile the native helpers into resources/bin/ (Xcode Command Line Tools, swiftc). Each is skipped when its binary
// is newer than its source.
// - selection-helper: reads the selected text for quick capture (native/selection-helper.swift);
// - speech-helper: on-device speech recognition for Say it and shadowing (native/speech-helper.swift). It carries its
//   own Info.plist (the speech recognition usage text macOS shows when asking for permission).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

if (process.platform !== 'darwin') process.exit(0)
mkdirSync('resources/bin', { recursive: true })

// Linked into the binary, so it only needs to exist while compiling (not shipped).
const SPEECH_PLIST = join(tmpdir(), 'luom-speech-helper-Info.plist')
rmSync('resources/bin/.speech-helper-Info.plist', { force: true })
writeFileSync(
  SPEECH_PLIST,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>com.envilearn.app.speech-helper</string>
  <key>CFBundleName</key><string>Lượm speech</string>
  <key>NSSpeechRecognitionUsageDescription</key><string>Lượm listens to you say your words, on this Mac, to tell you if they came across clearly.</string>
</dict></plist>
`,
)

const HELPERS = [
  {
    src: 'native/selection-helper.swift',
    out: 'resources/bin/selection-helper',
    args: ['-target', 'arm64-apple-macos12', '-framework', 'Cocoa', '-framework', 'ApplicationServices'],
    fallback: 'Capture will fall back to AppleScript.',
  },
  {
    src: 'native/speech-helper.swift',
    out: 'resources/bin/speech-helper',
    args: ['-target', 'arm64-apple-macos13', '-framework', 'Speech',
      '-Xlinker', '-sectcreate', '-Xlinker', '__TEXT', '-Xlinker', '__info_plist', '-Xlinker', SPEECH_PLIST],
    fallback: 'Say it and shadowing will be unavailable.',
  },
]

for (const h of HELPERS) {
  if (existsSync(h.out) && statSync(h.out).mtimeMs >= statSync(h.src).mtimeMs) continue
  try {
    execFileSync('swiftc', ['-O', '-o', h.out, h.src, ...h.args], { stdio: 'inherit' })
    console.log(`built ${h.out}`)
  } catch {
    console.warn(`[build-helper] swiftc failed for ${h.src}: install the Xcode Command Line Tools (xcode-select --install). ${h.fallback}`)
  }
}
