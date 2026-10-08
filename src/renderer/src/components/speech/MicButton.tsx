import { Loader2, Mic, Square } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ListenState } from './useListen'

/**
 * Round microphone button: tap to speak, tap again to stop (it also stops by itself when you stop talking). While
 * listening, a ring swells with your voice; while checking, a spinner.
 */
export function MicButton({
  state,
  onStart,
  onStop,
  size = 'md',
  label = 'Speak',
  quiet = false,
  className,
}: {
  state: ListenState
  onStart: () => void
  onStop: () => void
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** A small muted button until it listens (one per paragraph, say). */
  quiet?: boolean
  className?: string
}): React.JSX.Element {
  const listening = state.kind === 'listening'
  const busy = state.kind === 'asking' || state.kind === 'checking'
  const level = listening ? state.level : 0
  const box = size === 'lg' ? 'size-16' : size === 'sm' ? 'size-8' : 'size-11'
  const icon = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-4' : 'size-5'
  return (
    <button
      type="button"
      aria-label={listening ? 'Stop' : label}
      disabled={busy}
      data-on={listening || busy}
      onClick={(e) => {
        e.stopPropagation()
        if (listening) onStop()
        else onStart()
      }}
      className={cn(
        'btn-squish relative grid shrink-0 place-items-center rounded-full transition-colors disabled:opacity-70',
        listening
          ? 'bg-son text-on-brand'
          : quiet
            ? 'text-text-muted hover:bg-bg-neutral hover:text-text-primary'
            : 'bg-fill-brand text-on-brand hover:opacity-90',
        box,
        className,
      )}
    >
      {listening && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-son transition-transform duration-100"
          style={{ transform: `scale(${1.15 + level * 0.6})`, opacity: 0.35 + level * 0.5 }}
        />
      )}
      {busy ? (
        <Loader2 className={cn(icon, 'animate-spin')} />
      ) : listening ? (
        <Square className={cn(icon, 'fill-current')} strokeWidth={0} />
      ) : (
        <Mic className={icon} />
      )}
    </button>
  )
}

/** One line under a mic button: what it is doing, or the error with a way to fix it. */
export function ListenHint({
  state,
  idle,
  onOpenSettings,
}: {
  state: ListenState
  idle: string
  onOpenSettings: (pane: 'microphone' | 'speech') => void
}): React.JSX.Element {
  if (state.kind === 'error')
    return (
      <p className="text-xs text-text-danger">
        {state.message}{' '}
        {state.pane && (
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => onOpenSettings(state.pane!)}>
            Open Settings
          </button>
        )}
      </p>
    )
  return (
    <p className="text-xs text-text-muted">
      {state.kind === 'asking'
        ? 'Asking for the microphone…'
        : state.kind === 'listening'
          ? 'Listening… stop talking or tap to finish.'
          : state.kind === 'checking'
            ? 'Checking…'
            : idle}
    </p>
  )
}
