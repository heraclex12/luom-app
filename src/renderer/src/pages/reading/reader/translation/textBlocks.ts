// Two DOM primitives for inline translation: collect translatable text blocks from a section
// document, and compute the lazy translation window from visible block indices. Based on readest's
// walkTextNodes / useTextTranslation, minus iframe / shadow recursion (we get the doc via the adapter).

/** Tags skipped while walking: code / math, and STYLE / LINK / SCRIPT. */
const REJECT_TAGS = new Set(['PRE', 'CODE', 'MATH', 'STYLE', 'LINK', 'SCRIPT'])

/** Class of appended translation nodes; excluded so translations aren't re-translated. */
export const TRANSLATION_CLASS = 'qy-translation'

/**
 * Collect translatable blocks in a section document: leaf text elements, or elements with a direct
 * non-empty text node (e.g. `<p>Hello <b>x</b></p>` yields the `<p>`). Pure containers are descended.
 */
export function collectTextBlocks(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = []
  const walk = (node: Element, depth: number): void => {
    if (depth > 15) return
    for (const child of Array.from(node.children) as HTMLElement[]) {
      if (REJECT_TAGS.has(child.tagName)) continue
      if (child.classList.contains(TRANSLATION_CLASS)) continue
      const hasDirectText = Array.from(child.childNodes).some(
        (n) => n.nodeType === 3 /* TEXT_NODE */ && !!n.textContent?.trim(),
      )
      if (child.children.length === 0 && child.textContent?.trim()) out.push(child)
      else if (hasDirectText) out.push(child)
      else if (child.children.length > 0) walk(child, depth + 1)
    }
  }
  walk(root, 0)
  return out
}

/**
 * From the min / max visible block index, compute the inclusive range `[start, end]` to translate:
 * 1 block before, 2 after (ready for the next page), clamped to `[0, len-1]`. Returns null when
 * nothing is visible (`firstVisible > lastVisible`).
 */
export function lookAheadRange(
  len: number,
  firstVisible: number,
  lastVisible: number,
): { start: number; end: number } | null {
  if (len <= 0 || lastVisible < 0 || firstVisible > lastVisible) return null
  return {
    start: Math.max(0, firstVisible - 1),
    end: Math.min(len - 1, lastVisible + 2),
  }
}
