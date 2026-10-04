// Toast command bridge: wraps the CDS components/ui/toast as an imperative API
// (toast.error / warning / info / success) for non-component contexts. The host is
// components/common/Toaster.tsx (mounted once).
import type { ToastVariant } from '@/components/ui/toast'

export interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
}

let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Minimal pub/sub store for useSyncExternalStore. */
export const toastStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot(): ToastItem[] {
    return items
  },
}

/** Dismiss a toast (on timeout or manual close). */
export function dismissToast(id: number): void {
  items = items.filter((item) => item.id !== id)
  emit()
}

function push(variant: ToastVariant, message: string): void {
  items = [...items, { id: ++seq, variant, message }]
  emit()
}

/** Imperative toast API for interceptors / business code. */
export const toast = {
  error: (message: string): void => push('danger', message),
  warning: (message: string): void => push('warning', message),
  info: (message: string): void => push('info', message),
  /** Confirmation messages use the neutral info style. */
  success: (message: string): void => push('info', message),
}
