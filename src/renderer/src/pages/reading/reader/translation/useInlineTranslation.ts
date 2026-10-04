import { useEffect, useRef } from 'react'
import { translateBridge } from '@/platform'
import type { FoliateEngine } from '@/reading'
import type { TranslationProvider } from './providerMemory'
import { collectTextBlocks, lookAheadRange, TRANSLATION_CLASS } from './textBlocks'

/**
 * Inline translation: when on, translates the currently visible paragraphs into Vietnamese and
 * appends each translation below the original (always bilingual, never replaces the original).
 *
 * Lazy (modeled on readest's useTextTranslation): one IntersectionObserver per section iframe
 * (created in that iframe's realm, so off-page columns don't count as visible). Translates visible
 * paragraphs plus a little lookahead; continues on page turns (IO), new sections (`onLoad`), and
 * seeds already-rendered sections from `contentDocuments`. Requests go through main via
 * `translateBridge` (EN → VI, avoids CORS), max 5 concurrent, cached by provider + text.
 * Turning it off removes all translation nodes and marks.
 *
 * Stops on failure: any failed paragraph halts this run and calls `onFail` once — no auto retry.
 * The host turns the toggle off and shows a notice; retrying = toggling on again or switching
 * provider (cache survives).
 *
 * Only meaningful for reflowable EPUB; callers pass `enabled` only when `!engine.isFixedLayout`.
 */

/** Max in-flight requests: the free Google/Azure endpoints shouldn't be hammered. */
const MAX_CONCURRENT = 5

/** "Processed" mark on source paragraphs (failed ones too, no auto retry); cleared on teardown. */
const SOURCE_MARK = 'data-qy-translated'

/** Per-section state: document, ordered blocks, observer, visible set. */
interface DocState {
  doc: Document
  blocks: HTMLElement[]
  observer: IntersectionObserver
  visible: Set<HTMLElement>
}

/** Build a translation block appended to the source paragraph (`<font>` avoids `<p>` margins). */
function createTargetNode(doc: Document, text: string): HTMLElement {
  const font = doc.createElement('font')
  font.className = TRANSLATION_CLASS
  font.setAttribute('lang', 'vi') // language hint for font selection
  font.style.display = 'block'
  font.style.marginTop = '0.15em'
  font.style.opacity = '0.75' // visually secondary to the original
  font.textContent = text
  return font
}

/**
 * @param provider Translation provider (device memory, owned by the reader). Switching applies to
 *   subsequent paragraphs; the cache is keyed by provider + text.
 * @param onFail Called once per run on failure; the host turns the toggle off and notifies.
 */
export function useInlineTranslation(
  engine: FoliateEngine | null,
  enabled: boolean,
  provider: TranslationProvider,
  onFail: () => void,
): void {
  // Read enabled / provider via refs so in-flight requests see current values.
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const providerRef = useRef(provider)
  providerRef.current = provider
  // Callback via ref too, so an unstable host callback doesn't restart the run.
  const onFailRef = useRef(onFail)
  onFailRef.current = onFail

  // State that survives effects (cache / queue / in-flight / docs) — toggling keeps the cache.
  const cacheRef = useRef(new Map<string, string>())
  const queueRef = useRef<HTMLElement[]>([])
  const activeRef = useRef(0)
  const docsRef = useRef(new Map<Document, DocState>())

  useEffect(() => {
    if (!engine || !enabled) return

    const cache = cacheRef.current
    const queue = queueRef.current
    const docs = docsRef.current
    // Halt gate: set on the first failure in this effect run; stops scheduling and callbacks.
    // Synchronous, so it stops other in-flight work before React processes the toggle-off.
    let halted = false

    const translateOne = async (el: HTMLElement): Promise<void> => {
      const text = el.textContent?.replace(/\s+/g, ' ').trim()
      if (!text) return
      el.setAttribute(SOURCE_MARK, '1') // mark synchronously so it isn't scheduled twice
      const key = `${providerRef.current}::${text}`
      try {
        let translated = cache.get(key)
        if (translated == null) {
          translated = await translateBridge.sentence({ text, provider: providerRef.current })
          cache.set(key, translated)
        }
        if (!enabledRef.current) return // turned off mid-flight: teardown already cleaned up
        if (!translated || translated === text) return // empty or identical to source: nothing to append
        if (el.querySelector(`.${TRANSLATION_CLASS}`)) return
        el.appendChild(createTargetNode(el.ownerDocument, translated))
      } catch (e) {
        console.warn('[reading] paragraph translation failed:', e)
        if (halted || !enabledRef.current) return // already reported / turned off
        halted = true
        queue.length = 0
        onFailRef.current()
      }
    }

    const drain = (): void => {
      while (activeRef.current < MAX_CONCURRENT && queue.length > 0) {
        const el = queue.shift()!
        if (el.getAttribute(SOURCE_MARK) || !enabledRef.current) continue
        activeRef.current++
        void translateOne(el).finally(() => {
          activeRef.current--
          drain()
        })
      }
    }

    const schedule = (el: HTMLElement | undefined): void => {
      if (!el || halted || !enabledRef.current) return
      if (el.classList.contains(TRANSLATION_CLASS) || el.getAttribute(SOURCE_MARK)) return
      if (queue.includes(el)) return
      queue.push(el)
      drain()
    }

    const scheduleVisible = (doc: Document): void => {
      const st = docs.get(doc)
      if (!st) return
      let first = st.blocks.length
      let last = -1
      for (const el of st.visible) {
        const i = st.blocks.indexOf(el)
        if (i < 0) continue
        if (i < first) first = i
        if (i > last) last = i
      }
      const range = lookAheadRange(st.blocks.length, first, last)
      if (!range) return
      for (let i = range.start; i <= range.end; i++) schedule(st.blocks[i])
    }

    // Drop sections foliate has unloaded (defaultView is null): disconnect and unregister.
    const pruneDeadDocs = (): void => {
      for (const [doc, st] of docs) {
        if (!doc.defaultView) {
          st.observer.disconnect()
          docs.delete(doc)
        }
      }
    }

    const setupDoc = (doc: Document): void => {
      pruneDeadDocs()
      if (docs.has(doc) || !doc.body) return
      const IO = doc.defaultView?.IntersectionObserver
      if (!IO) return
      const blocks = collectTextBlocks(doc.body)
      if (blocks.length === 0) return
      const visible = new Set<HTMLElement>()
      const observer = new IO(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target as HTMLElement)
            else visible.delete(entry.target as HTMLElement)
          }
          scheduleVisible(doc)
        },
        { threshold: 0 },
      )
      blocks.forEach((b) => observer.observe(b))
      docs.set(doc, { doc, blocks, observer, visible })
    }

    // On enable: seed already-rendered sections; new sections continue via onLoad.
    engine.contentDocuments().forEach(setupDoc)
    const offLoad = engine.onLoad((d) => setupDoc(d.doc))
    // Fallback: if a page turn didn't fire IO, reschedule after relocate (next frame, after IO updates).
    const offRelocate = engine.onRelocate(() => {
      requestAnimationFrame(() => docs.forEach((_, doc) => scheduleVisible(doc)))
    })

    return () => {
      offLoad()
      offRelocate()
      for (const st of docs.values()) {
        st.observer.disconnect()
        st.doc.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((n) => n.remove())
        st.doc.querySelectorAll(`[${SOURCE_MARK}]`).forEach((n) => n.removeAttribute(SOURCE_MARK))
      }
      docs.clear()
      queue.length = 0
      activeRef.current = 0
    }
  }, [engine, enabled, provider])
}
