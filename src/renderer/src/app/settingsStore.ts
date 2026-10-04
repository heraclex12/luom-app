// Open state of the global settings dialog, so main-process requests (menu bar "Settings…") can open it.
let open = false
const listeners = new Set<() => void>()

function set(next: boolean): void {
  if (open === next) return
  open = next
  for (const l of listeners) l()
}

export const settingsDialogStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: (): boolean => open,
  setOpen: set,
}

export const openSettingsDialog = (): void => set(true)
