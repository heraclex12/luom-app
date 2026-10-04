import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { translateBridge } from '@/platform'
import type { TranslationProvider } from '../translation/providerMemory'
import { useViewportAnchor } from './useViewportAnchor'

/**
 * Sentence translator popup shown after "Translate" in the annotation toolbar (layout follows
 * readest's TranslatorPopup: original / divider / translation / provider switch). Source is fixed
 * to English and target to Vietnamese, so only a Google / Azure switch is offered. Requests go
 * through main (`translateBridge`, avoids CORS); switching provider re-translates.
 * The provider is remembered per device (host stores it in localStorage).
 *
 * Dismissal is owned by SelectionAnnotator, hence `data-annotation-layer` and no close button.
 * The provider dropdown portals to body; the host already exempts Radix popper content.
 */

const PROVIDERS: { value: TranslationProvider; label: string }[] = [
  { value: 'google', label: 'Google' },
  { value: 'azure', label: 'Azure' },
]

export interface TranslatorPopupProps {
  /** Selected English text. */
  text: string
  /** Anchor x: horizontal center of the selection. */
  x: number
  /** Anchor y: bottom edge of the selection (clamped by useViewportAnchor). */
  y: number
  /** Selection height, used to clear the text when flipping above. */
  height: number
  /** Current provider (owned by host, from device memory). */
  provider: TranslationProvider
  /** Provider change: host persists it; this popup re-translates. */
  onProviderChange: (p: TranslationProvider) => void
}

export function TranslatorPopup({
  text,
  x,
  y,
  height,
  provider,
  onProviderChange,
}: TranslatorPopupProps): React.JSX.Element {
  const { ref, left, top } = useViewportAnchor<HTMLDivElement>(x, y, height)
  const [translation, setTranslation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Re-translate on text/provider change; `alive` drops stale results.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    setTranslation(null)
    translateBridge
      .sentence({ text, provider })
      .then((result) => {
        if (!alive) return
        setTranslation(result)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setError(true)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [text, provider])

  const providerLabel = PROVIDERS.find((p) => p.value === provider)?.label

  return (
    <div
      ref={ref}
      // Exempts this layer from the host's click-outside dismissal (see SelectionAnnotator).
      data-annotation-layer=""
      className="anim-pop fixed z-50 w-[380px] -translate-x-1/2 select-text rounded-card bg-surface-3 text-text-primary shadow-popover"
      style={{ left, top }}
      onMouseDown={(e) => e.preventDefault()} // keep the selection when clicking the popup
    >
      <div className="max-h-[50vh] overflow-y-auto">
        {/* Original */}
        <div className="px-4 pt-3.5">
          <div className="mb-1.5 text-xs font-medium text-text-muted">Original</div>
          <p className="text-[15px] leading-relaxed text-text-primary">{text}</p>
        </div>

        <div className="mx-4 my-3 h-px bg-border-300" />

        {/* Translation */}
        <div className="px-4">
          <div className="mb-1.5 text-xs font-medium text-text-muted">Vietnamese</div>
          {loading ? (
            <p className="text-[15px] leading-relaxed text-text-muted">Translating…</p>
          ) : error ? (
            <p className="text-[15px] leading-relaxed text-text-danger">Translation failed. Try again later or switch provider.</p>
          ) : (
            <p className="text-[15px] leading-relaxed text-text-primary">{translation || 'No translation returned.'}</p>
          )}
        </div>
      </div>

      {/* Footer: attribution + provider switch */}
      <div className="mt-3 flex items-center justify-between gap-2 px-4 pb-3">
        <span className="min-w-0 truncate text-[11px] text-text-muted">
          {!loading && !error && providerLabel ? `Translated by ${providerLabel}` : ''}
        </span>
        <Select value={provider} onValueChange={(v) => onProviderChange(v as TranslationProvider)}>
          <SelectTrigger className="h-7 shrink-0 text-xs" aria-label="Translation provider">
            <SelectValue />
          </SelectTrigger>
          {/* Host already exempts popper content; this marker is a fallback for item-aligned positioning. */}
          <SelectContent data-annotation-layer="" className="min-w-[7rem]">
            {PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
