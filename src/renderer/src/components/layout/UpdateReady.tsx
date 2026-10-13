import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { updateBridge } from '@/platform'
import type { UpdateState } from '../../../../shared/update'
import { readyUpdate } from './updateNotice'

/**
 * Sidebar notice above the free AI meter once an update is downloaded: a red dot, the version and Restart. Lượm keeps
 * running in the menu bar, so many people never quit it and an update waiting for "the next quit" can wait for weeks.
 * Collapsed sidebar: just the restart icon with its red dot.
 */
export function UpdateReady(): React.JSX.Element | null {
  const [state, setState] = useState<UpdateState | null>(null)
  const [restarting, setRestarting] = useState(false)
  useEffect(() => {
    void updateBridge.get().then(setState)
    return updateBridge.onState(setState)
  }, [])
  const version = readyUpdate(state)
  if (!version) return null

  const restart = (): void => {
    setRestarting(true)
    void updateBridge.install()
  }
  const label = `Lượm ${version} is ready. Restart to update.`

  return (
    <div className="px-2 pb-1.5">
      {/* Collapsed sidebar: one icon button with the dot. */}
      <button
        type="button"
        onClick={restart}
        title={label}
        aria-label={label}
        className="can-focus relative mx-auto hidden size-9 place-items-center rounded-[12px] text-rail-fg hover:bg-rail-hover in-data-collapsed:grid"
      >
        <RotateCw className="size-4" strokeWidth={2} />
        <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-fill-danger ring-2 ring-rail-bg" />
      </button>

      <div
        role="status"
        className="flex items-center gap-2.5 rounded-[14px] bg-surface-2 py-2 pl-3 pr-2 shadow-panel-sm in-data-collapsed:hidden"
      >
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-fill-danger" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-xs font-semibold text-rail-fg">Update ready</span>
          <span className="block truncate text-[11px] text-rail-muted">Lượm {version}</span>
        </span>
        <button
          type="button"
          onClick={restart}
          disabled={restarting}
          title={label}
          className="can-focus btn-squish shrink-0 rounded-full bg-fill-brand px-3 py-1.5 text-xs font-semibold text-on-brand transition-colors hover:bg-fill-brand-hover disabled:opacity-60"
        >
          {restarting ? 'Restarting…' : 'Restart'}
        </button>
      </div>
    </div>
  )
}
