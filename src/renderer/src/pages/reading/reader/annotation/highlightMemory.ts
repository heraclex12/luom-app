/**
 * Highlight habits for the selection popup: default style + last color per style.
 *
 * Device-level memory (see [lib/deviceMemory.ts](../../../../lib/deviceMemory.ts)): stored in
 * localStorage, not synced. Unreadable / unknown values fall back to defaults (fill + yellow).
 */
import { defineDeviceMemory } from '@/lib/deviceMemory'
import type { HighlightColor, HighlightStyle } from '@/reading'

export interface HighlightMemory {
  style: HighlightStyle
  colors: Record<HighlightStyle, HighlightColor>
}

const STORAGE_KEY = 'qiyan.reading.highlight'

const STYLES: HighlightStyle[] = ['fill', 'underline', 'wavy']
const COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'red']

const DEFAULT: HighlightMemory = {
  style: 'fill',
  colors: { fill: 'yellow', underline: 'yellow', wavy: 'yellow' },
}

const asStyle = (v: unknown): HighlightStyle | null =>
  STYLES.includes(v as HighlightStyle) ? (v as HighlightStyle) : null
const asColor = (v: unknown, fallback: HighlightColor): HighlightColor =>
  COLORS.includes(v as HighlightColor) ? (v as HighlightColor) : fallback

/** Validate per field so one bad value doesn't discard the rest. */
const memory = defineDeviceMemory<HighlightMemory>(STORAGE_KEY, DEFAULT, (raw) => {
  const parsed = (raw ?? {}) as { style?: unknown; colors?: Partial<Record<HighlightStyle, unknown>> }
  const colors = parsed.colors ?? {}
  return {
    style: asStyle(parsed.style) ?? DEFAULT.style,
    colors: {
      fill: asColor(colors.fill, DEFAULT.colors.fill),
      underline: asColor(colors.underline, DEFAULT.colors.underline),
      wavy: asColor(colors.wavy, DEFAULT.colors.wavy),
    },
  }
})

export const readHighlightMemory = memory.read
export const storeHighlightMemory = memory.store
