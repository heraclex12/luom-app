// Whether the guided sidebar tour is running: started by the welcome flow, Home's one-time offer or Settings, and
// shown by the overlay in AppShell (so it survives the navigation to Home that ends the welcome flow).
let running = false
const listeners = new Set<() => void>()

function set(next: boolean): void {
  if (running === next) return
  running = next
  for (const l of listeners) l()
}

export const tourStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: (): boolean => running,
}

export const startTour = (): void => set(true)
export const endTour = (): void => set(false)
