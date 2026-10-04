import { useSyncExternalStore } from 'react'
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/toast'
import { dismissToast, toastStore } from '@/lib/toast'

/**
 * Toast host: mounted once globally (see main.tsx); subscribes to the toast store.
 * Trigger toasts with toast.error / warning / info from lib/toast.ts.
 */
export function Toaster(): React.JSX.Element {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot)
  return (
    <ToastProvider swipeDirection="right">
      {items.map((item) => (
        <Toast
          key={item.id}
          variant={item.variant}
          open
          onOpenChange={(open) => {
            if (!open) dismissToast(item.id)
          }}
        >
          {item.message}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
