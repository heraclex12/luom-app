/**
 * Chapter grouping for the sidebar Highlights / Bookmarks lists — pure view derivation, not persisted.
 * ("Current" highlighting lives elsewhere: see `util.itemsInRange`.)
 *
 * Chapter membership is computed on the fly: records store only `cfi`, resolved against the current TOC
 * (`findTocItemByCfi`), so groups follow TOC changes automatically.
 * Groups are ordered by TOC preorder; items within a group by `CFI.compare`.
 */
import { compareCfi, findTocItemByCfi } from '@/reading'
import type { TocNode } from '@/reading'

/** One chapter group: stable key + chapter title + its (sorted) items. */
export interface ChapterGroup<T> {
  /**
   * Stable identity (React key): the chapter's TOC preorder index, or `ungrouped`.
   * Not `label` — duplicate or empty chapter titles would collide.
   */
  key: string
  label: string
  items: T[]
}

type Positioned = { cfi: string }

// Items with no chapter (empty TOC, or cfi before the first chapter) go last.
const UNGROUPED = Number.MAX_SAFE_INTEGER

/** TOC preorder index: sort key between groups. */
function chapterOrder(toc: TocNode[]): Map<TocNode, number> {
  const order = new Map<TocNode, number>()
  const walk = (nodes: TocNode[]): void => {
    for (const n of nodes) {
      order.set(n, order.size)
      walk(n.subitems)
    }
  }
  walk(toc)
  return order
}

export function groupByChapter<T extends Positioned>(items: T[], toc: TocNode[]): ChapterGroup<T>[] {
  const order = chapterOrder(toc)
  const groups = new Map<number, ChapterGroup<T>>()

  for (const item of items) {
    const node = findTocItemByCfi(toc, item.cfi)
    const key = node ? (order.get(node) ?? UNGROUPED) : UNGROUPED
    const bucket = groups.get(key)
    if (bucket) bucket.items.push(item)
    else
      groups.set(key, {
        key: key === UNGROUPED ? 'ungrouped' : String(key),
        label: node?.label || 'Ungrouped',
        items: [item],
      })
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, g]) => ({ ...g, items: [...g.items].sort((x, y) => compareCfi(x.cfi, y.cfi)) }))
}

