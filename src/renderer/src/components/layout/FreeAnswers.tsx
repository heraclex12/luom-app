import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { aiBridge } from '@/platform'
import { getSettings, onSettingsChange } from '@/settings'
import { FREE_DAILY_ANSWERS } from '../../../../shared/ai'

/** Re-read now and then: the count starts again at local midnight. */
const REFRESH_MS = 10 * 60_000

/** Lượm (Free) answers left today, while Lượm (Free) is the AI service (null otherwise). */
function useFreeAnswersLeft(): number | null {
  const [onLuom, setOnLuom] = useState(false)
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const readService = (): void => void getSettings().then((s) => setOnLuom(s.aiProvider === 'luom'))
    const readLeft = (): void => void aiBridge.freeLeft().then(setLeft).catch(() => setLeft(null))
    readService()
    readLeft()
    const offSettings = onSettingsChange(readService)
    const offLeft = aiBridge.onFreeLeft(setLeft)
    const timer = setInterval(readLeft, REFRESH_MS)
    window.addEventListener('focus', readLeft)
    return () => {
      offSettings()
      offLeft()
      clearInterval(timer)
      window.removeEventListener('focus', readLeft)
    }
  }, [])
  return onLuom ? left : null
}

/**
 * Sidebar meter above Settings: today's Lượm (Free) AI answers left (each AI answer uses one; more at midnight).
 * Opens Settings → AI, where another service can be chosen.
 */
export function FreeAnswers({ onOpen }: { onOpen: () => void }): React.JSX.Element | null {
  const left = useFreeAnswersLeft()
  if (left === null) return null
  const used = left === 0
  const label = used
    ? `Today’s ${FREE_DAILY_ANSWERS} free AI answers are used. More tomorrow. Click to change the AI service.`
    : `${left} of ${FREE_DAILY_ANSWERS} free AI answers left today. Click to change the AI service.`
  return (
    <div className="px-2 pb-2">
      <button
        type="button"
        onClick={onOpen}
        title={label}
        aria-label={label}
        className="can-focus flex w-full flex-col gap-1.5 rounded-[4px] px-2.5 py-2 text-start transition-colors hover:bg-rail-hover in-data-collapsed:items-center in-data-collapsed:px-0"
      >
        <span className="flex w-full items-center gap-2 text-xs in-data-collapsed:flex-col in-data-collapsed:gap-0.5">
          <Sparkles className="size-4 shrink-0 text-hoe" strokeWidth={2} />
          <span className="flex-1 truncate text-rail-muted in-data-collapsed:hidden">
            {used ? 'Free AI: more tomorrow' : 'Free AI answers'}
          </span>
          <span className="font-medium tabular-nums text-rail-fg in-data-collapsed:text-[11px]">
            {left}
            <span className="text-rail-muted in-data-collapsed:hidden">/{FREE_DAILY_ANSWERS}</span>
          </span>
        </span>
        <span className="block h-1 w-full overflow-hidden rounded-full bg-rail-active in-data-collapsed:hidden">
          <span
            className="block h-full rounded-full bg-hoe transition-[width] duration-300"
            style={{ width: `${(left / FREE_DAILY_ANSWERS) * 100}%` }}
          />
        </span>
      </button>
    </div>
  )
}
