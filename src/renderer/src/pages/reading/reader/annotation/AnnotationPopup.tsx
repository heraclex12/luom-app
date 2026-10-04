import { useState } from 'react'
import { BookText, Check, Copy, Highlighter, Languages, PenLine, Trash2, Volume2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui'
import { HIGHLIGHT_COLORS, HIGHLIGHT_PALETTE } from '../constants'
import { useViewportAnchor } from './useViewportAnchor'
import type { HighlightColor, HighlightStyle } from '@/reading'

/**
 * Toolbar shown after selecting text — Copy / Highlight / Note / Look up / Translate / Read aloud.
 * Two-level like readest: "Highlight" immediately adds one with the current style + remembered
 * color and reveals a style (fill / underline / wavy) + color strip; clicking again (now "Remove")
 * deletes it. Style / color changes redraw the same highlight; each style remembers its color.
 * If the selection is already a highlight, the popup opens in edit mode for it.
 * Look up and Translate open separate popups via the host (`DictPopup` / `TranslatorPopup`).
 * Fixed below the selection; disappears when the selection clears.
 */

export interface AnnotationPopupProps {
  /** Anchor: center x + bottom y + selection height (to clear the text when flipping above). */
  anchor: { x: number; y: number; height: number }
  /** Existing highlight under the selection: opens in edit mode instead of creating one. */
  existingHighlight?: { id: string; color: HighlightColor; style: HighlightStyle }
  /**
   * Initial style (seeded from memory). Defaults to `fill`; `existingHighlight` wins if present.
   */
  initialStyle?: HighlightStyle
  /** Last color per style; follows on style switch. Defaults to yellow for all. */
  initialStyleColors?: Record<HighlightStyle, HighlightColor>
  /** Add a highlight with the given style/color; returns its id for later tweaks. */
  onHighlight: (color: HighlightColor, style: HighlightStyle) => string
  /** Update this highlight's style/color in place by id. */
  onRestyleHighlight: (id: string, color: HighlightColor, style: HighlightStyle) => void
  /** Remove this highlight by id. */
  onRemoveHighlight: (id: string) => void
  onWriteNote: () => void
  /** "Translate": host opens TranslatorPopup. */
  onTranslate: () => void
  /**
   * "Look up": host opens DictPopup.
   * Omit to hide the button — when the selection has no lookup-able term (e.g. only punctuation).
   */
  onLookup?: () => void
  onCopy: () => void
  onSpeak: () => void
  /** Speaker button label: "Pronounce" for a word / short phrase, "Read aloud" otherwise. */
  speakLabel?: string
}

/** Default memory seed: fill style, yellow for every style. */
const DEFAULT_STYLE: HighlightStyle = 'fill'
const DEFAULT_STYLE_COLORS: Record<HighlightStyle, HighlightColor> = {
  fill: 'yellow',
  underline: 'yellow',
  wavy: 'yellow',
}

const STYLE_OPTIONS: { value: HighlightStyle; label: string }[] = [
  { value: 'fill', label: 'Fill' },
  { value: 'underline', label: 'Underline' },
  { value: 'wavy', label: 'Wavy' },
]

export function AnnotationPopup({
  anchor,
  existingHighlight,
  initialStyle = DEFAULT_STYLE,
  initialStyleColors = DEFAULT_STYLE_COLORS,
  onHighlight,
  onRestyleHighlight,
  onRemoveHighlight,
  onWriteNote,
  onTranslate,
  onLookup,
  onCopy,
  onSpeak,
  speakLabel = 'Read aloud',
}: AnnotationPopupProps): React.JSX.Element {
  // Current style + per-style colors (as in readest). Seeded from memory, or from the existing highlight.
  const [activeStyle, setActiveStyle] = useState<HighlightStyle>(existingHighlight?.style ?? initialStyle)
  const [stylesColor, setStylesColor] = useState<Record<HighlightStyle, HighlightColor>>(() => {
    const base = { ...initialStyleColors }
    if (existingHighlight) base[existingHighlight.style] = existingHighlight.color
    return base
  })
  // Id of the highlight for this selection; redrawn on style/color change, removed on Remove.
  const [highlightId, setHighlightId] = useState<string | null>(existingHighlight?.id ?? null)
  // Below the selection, clamped into the viewport.
  const { ref: popupRef, left, top } = useViewportAnchor<HTMLDivElement>(anchor.x, anchor.y, anchor.height)

  // Ensure a highlight exists: create it, or redraw in place.
  const ensureHighlight = (color: HighlightColor, style: HighlightStyle): void => {
    if (highlightId) onRestyleHighlight(highlightId, color, style)
    else setHighlightId(onHighlight(color, style))
  }
  // Highlight / Remove button: create with current style + color, or delete and reset.
  const toggleHighlight = (): void => {
    if (highlightId) {
      onRemoveHighlight(highlightId)
      setHighlightId(null)
    } else {
      ensureHighlight(stylesColor[activeStyle], activeStyle)
    }
  }
  // Switch style: restore its remembered color and redraw (create if none).
  const selectStyle = (next: HighlightStyle): void => {
    setActiveStyle(next)
    ensureHighlight(stylesColor[next], next)
  }
  // Change color: remember for the current style and redraw (create if none).
  const selectColor = (color: HighlightColor): void => {
    setStylesColor((prev) => ({ ...prev, [activeStyle]: color }))
    ensureHighlight(color, activeStyle)
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div
        ref={popupRef}
        // Exempts this layer from the host's click-outside dismissal (see SelectionAnnotator).
        data-annotation-layer=""
        className="fixed z-50 -translate-x-1/2"
        style={{ left, top }}
        onMouseDown={(e) => e.preventDefault()} // keep the selection when clicking the toolbar
      >
        <div data-state="open" className="anim-pop rounded-card bg-surface-3 p-1 text-text-primary shadow-popover">
          <div className="flex flex-col gap-1">
            {/* Top row: actions. "Highlight" becomes "Remove" once a highlight exists. */}
            <div className="flex items-center gap-0.5">
              <Tool icon={<Copy className="size-[18px]" />} label="Copy" onClick={onCopy} />
              {highlightId ? (
                <Tool icon={<Trash2 className="size-[18px]" />} label="Remove highlight" onClick={toggleHighlight} />
              ) : (
                <Tool icon={<Highlighter className="size-[18px]" />} label="Highlight" onClick={toggleHighlight} />
              )}
              <Tool icon={<PenLine className="size-[18px]" />} label="Add note" onClick={onWriteNote} />
              {/* Hidden when there's no lookup-able term (see onLookup). */}
              {onLookup && <Tool icon={<BookText className="size-[18px]" />} label="Look up" onClick={onLookup} />}
              <Tool icon={<Languages className="size-[18px]" />} label="Translate" onClick={onTranslate} />
              <Tool icon={<Volume2 className="size-[18px]" />} label={speakLabel} onClick={onSpeak} />
            </div>

            {/* Style/color strip: shown only once a highlight exists. */}
            {highlightId && (
              <>
                {/* Divider */}
                <span className="mx-1 h-px bg-border-300" />

                {/* Styles on the left, colors on the right (readest layout). */}
                <div className="flex items-center justify-between gap-4 px-1">
                  {/* Styles: "A" preview, selected uses its remembered color */}
                  <div className="flex items-center gap-0.5">
                    {STYLE_OPTIONS.map((s) => (
                      <StyleButton
                        key={s.value}
                        style={s.value}
                        label={s.label}
                        active={activeStyle === s.value}
                        color={stylesColor[s.value]}
                        onClick={() => selectStyle(s.value)}
                      />
                    ))}
                  </div>
                  {/* Colors: check mark on the current style's color */}
                  <div className="flex items-center gap-1.5">
                    {HIGHLIGHT_COLORS.map((c) => {
                      const selected = stylesColor[activeStyle] === c
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-label={`${HIGHLIGHT_PALETTE[c].label} highlight`}
                          aria-pressed={selected}
                          onClick={() => selectColor(c)}
                          className={cn(
                            'btn-squish grid size-6 place-items-center rounded-full ring-1 ring-inset transition-transform hover:scale-110',
                            HIGHLIGHT_PALETTE[c].swatch,
                          )}
                        >
                          {selected && <Check className="size-3.5 text-text-100" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

/** Toolbar icon button with a hover tooltip. */
function Tool({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="btn-squish grid size-8 place-items-center rounded-md text-text-secondary transition-colors hover:bg-fill-ghost-hover hover:text-text-100"
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

/** Style option: "A" preview — remembered color when selected, neutral gray otherwise. */
function StyleButton({
  style,
  label,
  active,
  color,
  onClick,
}: {
  style: HighlightStyle
  label: string
  active: boolean
  color: HighlightColor
  onClick: () => void
}): React.JSX.Element {
  const pal = HIGHLIGHT_PALETTE[color]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            'btn-squish grid size-7 place-items-center rounded-md transition-colors',
            active ? 'text-text-100' : 'text-text-secondary hover:bg-fill-ghost-hover',
          )}
        >
          <span
            className={cn(
              'grid size-5 place-items-center text-sm font-semibold leading-none',
              style === 'fill' && cn('rounded-sm', active ? pal.fill : 'bg-fill-secondary'),
              style === 'underline' &&
                cn('underline decoration-2 underline-offset-2', active ? pal.line : 'decoration-border-400'),
              style === 'wavy' &&
                cn('underline decoration-wavy underline-offset-2', active ? pal.line : 'decoration-border-400'),
            )}
          >
            A
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

