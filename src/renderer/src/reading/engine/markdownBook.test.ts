// Markdown in the library: a .md file is turned into a small EPUB when it is opened, so the reader gets chapters,
// a contents list, progress, highlights and word lookup like any book. These pin the pure parts: chapter splitting,
// the EPUB files and the zip layout readers require.
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { epubFiles, splitChapters, zipEpub } from './markdownBook'

describe('splitChapters', () => {
  it('uses the first # heading as the title and splits at ## when there are several', () => {
    const md = '# My Notes\n\nIntro line.\n\n## Animals\n\ncat, dog\n\n## Vegetables\n\ncarrot\n'
    const book = splitChapters(md, 'notes')
    expect(book.title).toBe('My Notes')
    expect(book.chapters.map((c) => c.title)).toEqual(['My Notes', 'Animals', 'Vegetables'])
    expect(book.chapters[1].markdown).toContain('cat, dog')
    expect(book.chapters[0].markdown).toContain('Intro line.')
  })
  it('splits at # when there are several top-level headings', () => {
    const book = splitChapters('# One\n\na\n\n# Two\n\nb\n', 'file')
    expect(book.title).toBe('One')
    expect(book.chapters.map((c) => c.title)).toEqual(['One', 'Two'])
  })
  it('keeps a document without headings as one chapter named after the file', () => {
    const book = splitChapters('just some text\n\nmore', 'reading list')
    expect(book.title).toBe('reading list')
    expect(book.chapters).toEqual([{ title: 'reading list', markdown: 'just some text\n\nmore' }])
  })
  it('ignores headings inside fenced code blocks', () => {
    const md = '# Guide\n\n## Step 1\n\n```\n## not a heading\n```\n\n## Step 2\n\nok'
    expect(splitChapters(md, 'x').chapters.map((c) => c.title)).toEqual(['Guide', 'Step 1', 'Step 2'])
  })
  it('drops an empty preamble', () => {
    const book = splitChapters('## A\n\n1\n\n## B\n\n2', 'f')
    expect(book.chapters.map((c) => c.title)).toEqual(['A', 'B'])
    expect(book.title).toBe('f')
  })
})

describe('epubFiles', () => {
  const files = epubFiles({
    title: 'Tom & Jerry <notes>',
    chapters: [
      { title: 'Intro', body: '<p>Hi</p>' },
      { title: 'Words & "phrases"', body: '<p>Bye</p>' },
    ],
  })
  const byPath = Object.fromEntries(files)
  it('starts with the mimetype file and declares the package', () => {
    expect(files[0]).toEqual(['mimetype', 'application/epub+zip'])
    expect(byPath['META-INF/container.xml']).toContain('full-path="OEBPS/content.opf"')
  })
  it('lists every chapter in the manifest, spine and contents, escaping text', () => {
    const opf = byPath['OEBPS/content.opf']
    expect(opf).toContain('<dc:title>Tom &amp; Jerry &lt;notes&gt;</dc:title>')
    expect(opf.indexOf('idref="c1"')).toBeLessThan(opf.indexOf('idref="c2"'))
    expect(byPath['OEBPS/nav.xhtml']).toContain('<a href="c2.xhtml">Words &amp; &quot;phrases&quot;</a>')
    expect(byPath['OEBPS/c1.xhtml']).toContain('<p>Hi</p>')
    expect(byPath['OEBPS/c2.xhtml']).toContain('<title>Words &amp; &quot;phrases&quot;</title>')
  })
})

describe('zipEpub', () => {
  it('stores mimetype first and uncompressed, and round-trips the files', () => {
    const files: [string, string][] = [
      ['mimetype', 'application/epub+zip'],
      ['OEBPS/c1.xhtml', '<p>xin chào</p>'],
    ]
    const zip = zipEpub(files)
    expect(new TextDecoder().decode(zip.subarray(30, 38))).toBe('mimetype')
    expect(zip[8] | (zip[9] << 8)).toBe(0) // compression method: stored
    const out = unzipSync(zip)
    expect(new TextDecoder().decode(out['OEBPS/c1.xhtml'])).toBe('<p>xin chào</p>')
  })
})
