// Auto-update status shared by main (src/main/updater.ts) and the renderer (Settings → Data & about).
export type UpdateState =
  | { kind: 'idle' }
  /** Development build or not installed from a release: updates are off. */
  | { kind: 'unsupported' }
  | { kind: 'checking' }
  | { kind: 'none'; checkedAt: number }
  | { kind: 'downloading'; version: string; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }
