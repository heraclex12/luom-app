// Export my words as CSV (Excel / Google Sheets / Anki friendly).

export interface ExportRow {
  word: string
  phonetic: string
  meaning: string
  state: string
  due: number | null
}

const field = (v: string): string => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

function isoDay(ms: number | null): string {
  if (ms == null) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Rows → CSV text with a UTF-8 BOM (so Excel shows Vietnamese correctly) and CRLF line ends. */
export function toCsv(rows: readonly ExportRow[]): string {
  const lines = [['word', 'phonetic', 'vietnamese', 'state', 'next_review'].join(',')]
  for (const r of rows) {
    lines.push([r.word, r.phonetic, r.meaning, r.state, isoDay(r.due)].map(field).join(','))
  }
  return '﻿' + lines.join('\r\n')
}
