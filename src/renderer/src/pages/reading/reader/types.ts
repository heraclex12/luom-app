/**
 * Reader UI data types: body typography parameters.
 *
 * Body rendering and TOC come from the foliate engine; highlights / bookmarks from the local DB. Both get their types
 * (`AnnotationRecord` / `BookmarkRecord` / `HighlightColor` / `HighlightStyle`) from the `@/reading` facade.
 *
 * Typography comes in two halves:
 * **Font size / font family** are user settings stored in `user_setting`, edited only in the Reading section
 * of the global settings dialog (via `@/settings`); **everything else** is fixed for now (`getFixedTypography` in `constants.ts`).
 * Page light/dark is not here: it follows the app theme (`lib/theme.ts`).
 */

// ─────────────────────────── Body typography ───────────────────────────

/** Body font family: serif / sans-serif. */
export type FontFamily = 'serif' | 'sans'

/** Columns: single / double (capped at 2 on wide screens, matching foliate's default). */
export type ColumnMode = 'single' | 'double'

/** Typography fixed for now, not user-configurable (source: `constants.ts`, values from CDS `--reading-*` tokens). */
export interface FixedTypography {
  /** Line-height multiplier. */
  lineHeight: number
  /** Max line width in px (maps to foliate max-inline-size). */
  maxWidth: number
  /** Justify paragraphs. */
  justify: boolean
  /** Paragraph spacing in px. */
  paragraphSpacing: number
  /** Page margin in px (maps to foliate margin-*). */
  marginPx: number
  /** Automatic hyphenation for English. */
  hyphenate: boolean
  /** Single / double column (maps to foliate max-column-count). */
  columns: ColumnMode
}

/** Full typography fed to the engine: the two user-adjustable values plus the fixed rest. */
export interface ReaderAppearance extends FixedTypography {
  family: FontFamily
  /** Body font size in px. */
  fontSize: number
}
