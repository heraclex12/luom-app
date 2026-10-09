import { cn } from '@/lib/cn'
import { resolveShownAccent, resolveWordAudioUrl, type WordAudioColumns } from '@/lib/audio'
import { SpeakerIcon } from '@/components/common/SpeakerIcon'

/**
 * Phonetic row: US/UK accent pill + one-line phonetics. The meaning source toggle lives elsewhere.
 *
 * Available accents depend on the phonetics: both → toggle; only one → show that one (no toggle,
 * ignores `accent`); none → a plain speaker button. The speaker depends on audio
 * (hasAudio + onSpeak). With neither phonetics nor audio the row renders nothing.
 *
 * `accent` is controlled; speaking goes up via onSpeak(locale). Pages that need to stop click
 * propagation (Study reveal) do it in their own handlers.
 */

/** Accent pill, same look as the meaning source toggle (clickable ones add btn-squish). */
const PILL = 'inline-flex items-center gap-1 rounded-full bg-fill-control px-2.5 py-1 text-xs font-semibold text-text-secondary'

interface PhoneticRowProps {
  phoneticUK: string
  phoneticUS: string
  /** Current accent (only used when both phonetics exist) */
  accent?: 'uk' | 'us'
  /** Accent toggle callback (only used when both phonetics exist) */
  onToggleAccent?: () => void
  onSpeak?: (locale?: 'en-GB' | 'en-US') => void
  /**
   * Whether audio is available (default true). When false, no speaker button.
   */
  hasAudio?: boolean
  /**
   * Audio URL columns (usually the dict row). Resolved by the accent actually shown so the
   * speaker animation matches what plays. Omit to disable the animation.
   */
  audioRow?: WordAudioColumns
  /**
   * Stop click propagation on buttons (default false); used by Study's click-to-reveal.
   */
  stopClickPropagation?: boolean
}

export function PhoneticRow({
  phoneticUK,
  phoneticUS,
  accent = 'us',
  onToggleAccent,
  onSpeak,
  hasAudio = true,
  audioRow,
  stopClickPropagation = false,
}: PhoneticRowProps): React.JSX.Element | null {
  // Can speak = audio exists and the page passed onSpeak.
  const canSpeak = hasAudio && !!onSpeak
  const hasUK = !!phoneticUK
  const hasUS = !!phoneticUS
  const bothAccents = hasUK && hasUS

  /** Speak (optional locale), stopping propagation if needed. */
  const speak = (e: React.MouseEvent, locale?: 'en-GB' | 'en-US'): void => {
    if (stopClickPropagation) e.stopPropagation()
    onSpeak?.(locale)
  }

  // No phonetics at all: just a speaker (fallback audio_url); nothing if there's no audio either.
  if (!hasUK && !hasUS) {
    if (!canSpeak) return null
    // onSpeak() without locale here: the card falls back to the current accent.
    return (
      <button type="button" aria-label="Play pronunciation" onClick={(e) => speak(e)} className={cn('btn-squish', PILL)}>
        <SpeakerIcon url={audioRow && resolveWordAudioUrl(audioRow, accent)} className="size-3.5" />
      </button>
    )
  }

  // With one phonetic only, pin to that side (same rule as autoplay, see resolveShownAccent).
  const shown = resolveShownAccent({ hasUS, hasUK }, accent)
  const locale = shown === 'uk' ? 'en-GB' : 'en-US'
  const phonetic = shown === 'uk' ? phoneticUK : phoneticUS
  const label = shown === 'uk' ? 'UK' : 'US'
  // Pill is clickable if it can toggle (both sides) or speak; otherwise it's just a label.
  const pillActive = bothAccents || canSpeak
  // Speaker follows `shown`, not the external accent.
  const audioUrl = audioRow ? resolveWordAudioUrl(audioRow, shown) : null

  return (
    <div className="flex items-center gap-2.5">
      {pillActive ? (
        <button
          type="button"
          onClick={(e) => {
            // One side only: the pill just plays audio.
            if (!bothAccents) {
              speak(e, locale)
              return
            }
            if (stopClickPropagation) e.stopPropagation()
            onToggleAccent?.()
            // Play the accent we're switching to (state hasn't updated yet, so use the opposite).
            onSpeak?.(shown === 'uk' ? 'en-US' : 'en-GB')
          }}
          className={cn('btn-squish', PILL)}
        >
          {label}
          {canSpeak && <SpeakerIcon url={audioUrl} className="size-3.5" />}
        </button>
      ) : (
        <span className={PILL}>{label}</span>
      )}
      {canSpeak ? (
        <button
          type="button"
          onClick={(e) => speak(e, locale)}
          className="btn-squish text-sm font-semibold text-text-secondary"
        >
          {phonetic}
        </button>
      ) : (
        <span className="text-sm font-semibold text-text-secondary">{phonetic}</span>
      )}
    </div>
  )
}
