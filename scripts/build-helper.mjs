// Compile the native selection helper (native/selection-helper.swift → resources/bin/selection-helper).
// Needs the Xcode Command Line Tools (swiftc). Skips when the binary is newer than its source.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'

const src = 'native/selection-helper.swift'
const out = 'resources/bin/selection-helper'
if (process.platform !== 'darwin') process.exit(0)
if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) process.exit(0)
mkdirSync('resources/bin', { recursive: true })
try {
  execFileSync('swiftc', ['-O', '-target', 'arm64-apple-macos12', '-o', out, src, '-framework', 'Cocoa', '-framework', 'ApplicationServices'], { stdio: 'inherit' })
  console.log(`built ${out}`)
} catch {
  console.warn('[build-helper] swiftc failed — install the Xcode Command Line Tools (xcode-select --install). Capture will fall back to AppleScript.')
}
