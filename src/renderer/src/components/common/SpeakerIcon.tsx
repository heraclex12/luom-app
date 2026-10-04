import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { audioStore, getAudioPhase, type AudioPhase } from '@/lib/audio'

/**
 * Speaker icon that subscribes to @/lib/audio playback state and switches between idle /
 * loading / playing. Used by every pronunciation button instead of a bare lucide Volume2.
 *
 * - loading: a spinner (same as CDS Button loading);
 * - playing: the speaker with pulsing sound waves, tinted accent blue;
 * - idle / failed: a plain speaker.
 *
 * Shape matches lucide `volume-2`, with the two arcs split into separate paths for staggered
 * animation. Colour is only overridden while playing; otherwise it follows className.
 */

/** Playback phase for this url; always idle when url is empty (no audio). */
export function useAudioPhase(url: string | null | undefined): AudioPhase {
  const getPhase = React.useCallback(() => getAudioPhase(url), [url])
  return React.useSyncExternalStore(audioStore.subscribe, getPhase)
}

export function SpeakerIcon({
  url,
  className,
}: {
  /** The audio URL this speaker plays (resolveWordAudioUrl or an example's audioUrl). */
  url: string | null | undefined
  className?: string
}): React.JSX.Element {
  const phase = useAudioPhase(url)

  // Loading: show the spinner (it appears after 150ms, so instant plays don't flash). The key
  // forces a fresh node when swapping with the speaker; both are <svg>, and a reused node would
  // not restart the CSS animation.
  if (phase === 'loading') {
    return <Loader2 key="spinner" className={cn('speaker-spinner', className)} strokeWidth={2} aria-hidden />
  }

  const sounding = phase === 'playing'

  return (
    <svg
      key="speaker"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('transition-colors duration-150', className, sounding && 'text-fill-accent')}
    >
      <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
      <path d="M16 9a5 5 0 0 1 0 6" className={sounding ? 'speaker-wave-inner' : undefined} />
      <path
        d="M19.364 18.364a9 9 0 0 0 0-12.728"
        className={sounding ? 'speaker-wave-outer' : undefined}
      />
    </svg>
  )
}
