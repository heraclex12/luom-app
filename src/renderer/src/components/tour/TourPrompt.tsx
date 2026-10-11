import { useEffect, useState, useSyncExternalStore } from 'react'
import { Compass, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { startTour, tourStore } from '@/app/tourStore'
import { getSettings, onSettingsChange, updateSettings } from '@/settings'
import { shouldOfferTour } from './tour'

/**
 * Home's one-time offer of the guided tour, for people who set Lượm up before the tour existed. Taking the tour or
 * closing the card marks it seen (Settings → General can replay it any time).
 */
export function TourPrompt({ className }: { className?: string }): React.JSX.Element | null {
  const running = useSyncExternalStore(tourStore.subscribe, tourStore.getSnapshot)
  const [state, setState] = useState<{ onboarded: 0 | 1; tourSeen: 0 | 1 } | null>(null)

  useEffect(() => {
    const load = (): void => void getSettings().then((s) => setState({ onboarded: s.onboarded, tourSeen: s.tourSeen }))
    load()
    return onSettingsChange(load)
  }, [])

  if (!state || !shouldOfferTour(state, running)) return null
  const dismiss = (): void => {
    setState({ ...state, tourSeen: 1 })
    void updateSettings({ tourSeen: 1 })
  }

  return (
    <section className={className} aria-label="Take the tour">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card bg-bg-accent/50 px-5 py-4">
        <Compass className="size-5 shrink-0 text-text-accent" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p className="font-hand text-base leading-none text-text-accent">New</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">A one-minute tour of Lượm</p>
          <p className="text-sm text-text-secondary">See where everything lives: capture, games, stories, reading and more.</p>
        </div>
        <Button variant="brand" size="sm" onClick={() => startTour()}>
          Take the tour
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Not now" onClick={dismiss}>
          <X className="size-4" strokeWidth={2} />
        </Button>
      </div>
    </section>
  )
}
