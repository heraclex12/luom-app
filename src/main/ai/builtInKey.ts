// Built-in OpenRouter key (free models for everyone who has not added their own). It comes from the git-ignored
// `.env.local` at build time (see electron.vite.config.ts) and is stored scrambled so it does not show up in a plain
// text search of the app bundle. This is obfuscation, not secrecy: anyone with the app can recover it, so use a key
// whose credit limit is $0 (free models only).

const PAD = 'EnVi Learn: free models for learners'

const xor = (bytes: Uint8Array): Uint8Array => bytes.map((b, i) => b ^ PAD.charCodeAt(i % PAD.length))

export function scrambleKey(key: string): string {
  if (!key) return ''
  return Buffer.from(xor(new TextEncoder().encode(key)).reverse()).toString('base64')
}

export function unscrambleKey(scrambled: string): string | null {
  if (!scrambled || !/^[A-Za-z0-9+/]+=*$/.test(scrambled)) return null
  const key = new TextDecoder().decode(xor(Uint8Array.from(Buffer.from(scrambled, 'base64')).reverse()))
  return /^[\x21-\x7e]+$/.test(key) ? key : null
}

declare const __BUILTIN_OPENROUTER_KEY__: string

/** The built-in key, or null when this build has none. */
export const builtInOpenRouterKey = (): string | null => unscrambleKey(__BUILTIN_OPENROUTER_KEY__)
