import { useEffect, useSyncExternalStore } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useSettings } from '@/hooks/useSettings'
import { AppSidebar } from '@/components/layout/Sidebar'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { openSettingsDialog, settingsDialogStore } from '@/app/settingsStore'

/**
 * App shell: sidebar + main area (Outlet renders the current route).
 * The settings dialog floats above every page, so its open state lives in a tiny store
 * (the menu bar's "Settings…" item opens it too).
 */
export function AppShell(): React.JSX.Element {
  const settingsOpen = useSyncExternalStore(settingsDialogStore.subscribe, settingsDialogStore.getSnapshot)
  const settingsSection = useSyncExternalStore(settingsDialogStore.subscribe, settingsDialogStore.getSection)
  // First launch: run the setup questions once.
  const settings = useSettings()
  const navigate = useNavigate()
  useEffect(() => {
    if (settings && settings.onboarded === 0) navigate('/welcome', { replace: true })
  }, [settings, navigate])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-page-bg">
      <AppSidebar onOpenSettings={(section) => openSettingsDialog(section)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={settingsDialogStore.setOpen} initialSection={settingsSection} />
    </div>
  )
}
