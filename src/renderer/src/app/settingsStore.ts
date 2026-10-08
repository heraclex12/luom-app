// Open state of the global settings dialog, so main-process requests (menu bar "Settings…") can open it, and the
// section to show when an entry point opens it in context (the sidebar's free answers → AI).
let open = false
let section: string | undefined
const listeners = new Set<() => void>()

function set(next: boolean, nextSection?: string): void {
  if (open === next && section === nextSection) return
  open = next
  if (next) section = nextSection
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
  /** Section id requested by the last open (undefined = keep the last visited one). */
  getSection: (): string | undefined => section,
  setOpen: (next: boolean): void => set(next),
}

/** Open settings, optionally on one section (see SETTINGS_SECTIONS). */
export const openSettingsDialog = (sectionId?: string): void => set(true, sectionId)
