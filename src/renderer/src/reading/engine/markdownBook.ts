// Markdown in the library: the reader engine (foliate) has no Markdown parser, so a .md file is turned into a
// small EPUB 3 when it is imported or opened. Chapters come from the headings; everything else (contents, progress,
// highlights, word lookup) then works like any EPUB. The original .md file stays on disk unchanged.
import { zipSync, strToU8 } from 'fflate'
import { marked } from 'marked'

export interface MdChapter {
  title: string
  markdown: string
}

const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/
const FENCE = /^[ \t]{0,3}(```|~~~)/

/** Headings outside fenced code blocks: line index, level, text. */
function headings(lines: readonly string[]): { line: number; level: number; text: string }[] {
  const out: { line: number; level: number; text: string }[] = []
  let fence: string | null = null
  lines.forEach((l, i) => {
    const f = FENCE.exec(l)
    if (f) {
      if (fence === null) fence = f[1]
      else if (f[1] === fence) fence = null
      return
    }
    if (fence !== null) return
    const h = HEADING.exec(l)
    if (h) out.push({ line: i, level: h[1].length, text: h[2].trim() })
  })
  return out
}

/**
 * Title + chapters. Title = first `#` heading, else the file name. Chapters split at `##` when there are several,
 * else at `#` when there are several, else the whole text is one chapter. Text before the first chapter heading
 * becomes a chapter named after the book (dropped when blank).
 */
export function splitChapters(markdown: string, fallbackTitle: string): { title: string; chapters: MdChapter[] } {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const hs = headings(lines)
  const title = hs.find((h) => h.level === 1)?.text || fallbackTitle
  const h2 = hs.filter((h) => h.level === 2).length
  const h1 = hs.filter((h) => h.level === 1).length
  const splitLevel = h2 >= 2 ? 2 : h1 >= 2 ? 1 : 0
  if (splitLevel === 0) return { title, chapters: [{ title, markdown: markdown.trim() }] }

  const starts = hs.filter((h) => h.level <= splitLevel)
  const chapters: MdChapter[] = []
  const preamble = lines.slice(0, starts[0].line).join('\n').trim()
  if (preamble) chapters.push({ title, markdown: preamble })
  starts.forEach((h, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].line : lines.length
    chapters.push({ title: h.text, markdown: lines.slice(h.line, end).join('\n').trim() })
  })
  return { title, chapters }
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const CSS = `body { line-height: 1.6 }
pre { white-space: pre-wrap; background: rgba(127,127,127,.12); padding: .6em .8em; border-radius: 6px }
code { font-family: ui-monospace, Menlo, monospace; font-size: .92em }
blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid rgba(127,127,127,.4) }
table { border-collapse: collapse } th, td { border: 1px solid rgba(127,127,127,.4); padding: .3em .6em }
img { max-width: 100% }`

/** EPUB 3 files in zip order (mimetype first). `body` = well-formed XHTML for each chapter. */
export function epubFiles(book: { title: string; lang?: string; chapters: { title: string; body: string }[] }): [string, string][] {
  const lang = book.lang ?? 'en'
  const ids = book.chapters.map((_, i) => `c${i + 1}`)
  const page = (title: string, body: string): string =>
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}">
<head><meta charset="UTF-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>${body}</body>
</html>`
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${lang}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:envi-learn:markdown:${esc(book.title)}</dc:identifier>
<dc:title>${esc(book.title)}</dc:title>
<dc:language>${lang}</dc:language>
<meta property="dcterms:modified">2000-01-01T00:00:00Z</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${ids.map((id) => `<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine>
${ids.map((id) => `<itemref idref="${id}"/>`).join('\n')}
</spine>
</package>`
  const nav = page(
    book.title,
    `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${book.chapters
      .map((c, i) => `<li><a href="${ids[i]}.xhtml">${esc(c.title)}</a></li>`)
      .join('')}</ol></nav>`,
  )
  return [
    ['mimetype', 'application/epub+zip'],
    [
      'META-INF/container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
    ],
    ['OEBPS/content.opf', opf],
    ['OEBPS/nav.xhtml', nav],
    ['OEBPS/style.css', CSS],
    ...book.chapters.map((c, i): [string, string] => [`OEBPS/${ids[i]}.xhtml`, page(c.title, c.body)]),
  ]
}

/** Zip the files as an EPUB: `mimetype` first and stored (uncompressed), the rest deflated. */
export function zipEpub(files: readonly [string, string][]): Uint8Array {
  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {}
  for (const [path, text] of files) entries[path] = [strToU8(text), { level: path === 'mimetype' ? 0 : 6 }]
  return zipSync(entries)
}

/** HTML fragment → well-formed XHTML (DOM round trip); scripts and inline handlers dropped. */
function toXhtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed').forEach((n) => n.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) if (/^on/i.test(a.name)) el.removeAttribute(a.name)
  })
  const ser = new XMLSerializer()
  return [...doc.body.childNodes].map((n) => ser.serializeToString(n)).join('')
}

/** A Markdown file as an EPUB File for the reader engine (runs in the renderer: needs DOMParser). */
export async function markdownFileToEpub(file: Blob, fallbackTitle: string): Promise<File> {
  const { title, chapters } = splitChapters(await file.text(), fallbackTitle)
  const files = epubFiles({
    title,
    chapters: chapters.map((c) => ({ title: c.title || 'Text', body: toXhtml(marked.parse(c.markdown, { async: false, gfm: true })) })),
  })
  return new File([zipEpub(files) as Uint8Array<ArrayBuffer>], 'book.epub', { type: 'application/epub+zip' })
}
