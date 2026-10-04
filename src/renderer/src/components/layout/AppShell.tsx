import { useSyncExternalStore } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/Sidebar'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { settingsDialogStore } from '@/app/settingsStore'

/**
 * App shell: sidebar + main area (Outlet renders the current route).
 * The settings dialog floats above every page, so its open state lives in a tiny store
 * (the menu bar's "Settings…" item opens it too).
 */
export function AppShell(): React.JSX.Element {
  const settingsOpen = useSyncExternalStore(settingsDialogStore.subscribe, settingsDialogStore.getSnapshot)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-page-bg">
      <AppSidebar onOpenSettings={() => settingsDialogStore.setOpen(true)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={settingsDialogStore.setOpen} />
    </div>
  )
}
