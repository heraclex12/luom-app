import { useRef, useState } from 'react'
import { BookOpenText, Gamepad2, Keyboard, Sprout, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import appIcon from '@/assets/app-icon.png'

/**
 * The 60-second intro video (welcome flow + Settings). Bundled as a static file in src/renderer/public/onboarding/
 * (copied next to index.html, so the relative URL works from the dev server and from file:// in the packaged app).
 * Starts muted (it reads without sound) unless the user prefers reduced motion; native controls give sound, pause and
 * seeking. A missing or broken file falls back to a short written summary, so the step never shows an empty box.
 */

export const INTRO_VIDEO_SRC = './onboarding/luom-intro.mp4'
export const INTRO_POSTER_SRC = './onboarding/luom-intro-poster.jpg'

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

const SUMMARY = [
  {
    icon: Keyboard,
    text: 'Select a word in any app and press the capture hotkey to save it with its Vietnamese meaning.',
  },
  { icon: BookOpenText, text: 'Your words come back for a quick review right before you would forget them.' },
  { icon: Gamepad2, text: 'Play games, read a daily story and practise speaking and writing with your own words.' },
  { icon: Sprout, text: 'Every word is a plant in your garden. Keep going and it grows into a whole world.' },
]

/** `note` shows under the video only when it plays (not under the written fallback). */
export function IntroVideo({ className, note }: { className?: string; note?: React.ReactNode }): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const [ended, setEnded] = useState(false)
  const [autoPlay] = useState(() => !prefersReducedMotion())
  const video = useRef<HTMLVideoElement>(null)

  if (failed) {
    return (
      <div className={cn('flex flex-col gap-4 rounded-card bg-surface-1 p-6', className)}>
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="" className="size-10" />
          <p className="text-base font-semibold text-text-primary">Lượm in a minute</p>
        </div>
        <ul className="flex flex-col gap-3">
          {SUMMARY.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm leading-relaxed text-text-secondary">
              <Icon className="mt-0.5 size-4 shrink-0 text-text-accent" strokeWidth={2} />
              {text}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-card bg-surface-1 shadow-card-ring">
        <video
          ref={video}
          className="block aspect-video w-full bg-surface-1"
          src={INTRO_VIDEO_SRC}
          poster={INTRO_POSTER_SRC}
          controls
          muted
          autoPlay={autoPlay}
          playsInline
          preload="metadata"
          aria-label="Lượm in 60 seconds: capture a word, review it, play, and watch your garden grow"
          onError={() => setFailed(true)}
          onEnded={() => setEnded(true)}
          onPlay={() => setEnded(false)}
        />
        {ended && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-backdrop">
            <Button
              variant="secondary"
              className="pointer-events-auto gap-1.5"
              onClick={() => {
                const v = video.current
                if (!v) return
                v.currentTime = 0
                void v.play()
              }}
            >
              <RotateCcw className="size-4" strokeWidth={2} />
              Watch again
            </Button>
          </div>
        )}
      </div>
      {note && <p className="mt-4 text-xs text-text-muted">{note}</p>}
    </div>
  )
}
