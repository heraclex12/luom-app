// Read study settings (default meaning source / accent…) once on mount. Writes go through updateSettings in the settings UI.
import { useEffect, useState } from 'react'
import { getSettings } from '@/settings'
import type { Settings } from '@/settings'
import type { MeaningSource } from '@/types/word'

export function useSettings(): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    let alive = true
    void getSettings().then((s) => {
      if (alive) setSettings(s)
    })
    return () => {
      alive = false
    }
  }, [])
  return settings
}

/** Settings meaning source ('concise'|'collins') → card display MeaningSource ('simple'|'collins'). */
export function meaningSourceToDisplay(m: Settings['meaningSource'] | undefined): MeaningSource {
  return m === 'collins' ? 'collins' : 'simple'
}
