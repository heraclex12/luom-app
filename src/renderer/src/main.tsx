import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { Toaster } from './components/common/Toaster'
import { initSession } from './session'
import { initAppIntegration } from './app'
import { applyThemePreference, readThemePreference } from './lib/theme'
import './styles/globals.css'

// Apply the persisted appearance before the first frame to avoid a light/dark flash.
applyThemePreference(readThemePreference())

if (import.meta.env.DEV) {
  import('react-grab')
}

// Open the local database first, then render — every page reads from it.
initSession()
  .catch((e) => console.error('[session] failed to open the local database', e))
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <RouterProvider router={router} />
        <Toaster />
      </React.StrictMode>
    )
    // Wire main-process events (global hotkey capture, reminder clicks, tray actions) into the router.
    initAppIntegration(router)
  })
