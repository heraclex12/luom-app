// English → Vietnamese dictionary: builds an EnViEntry from free web sources, in main (no CORS / Origin issues).
//
// Sources (both keyless):
//   • Google Translate "gtx" endpoint — Vietnamese meanings by part of speech (dt=bd), English definitions (dt=md),
//     example sentences (dt=ex), synonyms (dt=ss), a rough phonetic (dt=rm). This is the primary source.
//   • Free Dictionary API (dictionaryapi.dev, Wiktionary data) — proper UK/US IPA, extra definitions/examples.
//     It is flaky, so it is best-effort with a short timeout.
// English definitions and examples are then machine-translated to Vietnamese in one batched request.
//
// Parsing is pure (unit-tested against recorded fixtures); `lookupWord` does the network orchestration.
import { ipcMain, net } from 'electron'
import type {
  BilingualExample,
  DictionaryLookupResult,
  EnDefinition,
  EnViEntry,
  SynonymSet,
  ViMeaning,
} from '../shared/dictionary'

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single'
const FREEDICT_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const WIKTIONARY_URL = 'https://en.wiktionary.org/w/api.php'
const GOOGLE_TIMEOUT_MS = 10_000
const FREEDICT_TIMEOUT_MS = 5_000

const MAX_TERMS_PER_POS = 6
const MAX_DEFS_PER_POS = 3
const MAX_DEFINITIONS = 6
const MAX_EXAMPLES = 5
const MAX_SYNONYMS_PER_POS = 8

// ─────────────────────────── defensive JSON access ───────────────────────────

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): string => (typeof v === 'string' ? v.normalize('NFC') : '')
const at = (v: unknown, ...path: number[]): unknown =>
  path.reduce<unknown>((cur, i) => (Array.isArray(cur) ? cur[i] : undefined), v)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

export const stripTags = (s: string): string => s.replace(/<[^>]+>/g, '')
const norm = (s: string): string => stripTags(s).trim().toLowerCase().replace(/\s+/g, ' ')
const stripSlashes = (s: string): string => s.trim().replace(/^[/[]+|[/\]]+$/g, '')

/** Wrap whole-word occurrences of the headword in <b> so the card highlights it. */
function boldTerm(sentence: string, term: string): string {
  if (sentence.includes('<b>')) return sentence
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return sentence.replace(new RegExp(`\\b(${escaped}\\w*)`, 'gi'), '<b>$1</b>')
}

// ─────────────────────────── Google (gtx) ───────────────────────────

export interface GoogleResult {
  translation: string
  ipa: string
  meanings: ViMeaning[]
  definitions: { pos: string; en: string; example?: string }[]
  /** English examples with <b> around the headword. */
  examples: string[]
  synonyms: SynonymSet[]
}

/** Parse the gtx array payload. Returns null when the shape is not recognisable. */
export function parseGoogle(data: unknown): GoogleResult | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null
  const segments = asArray(data[0])
  const translation = segments
    .map((seg) => str(at(seg, 0)))
    .join('')
    .trim()
  const ipa = segments.map((seg) => str(at(seg, 3))).find(Boolean) ?? ''

  // dt=bd: [pos, [terms…], [[term, [back-translations], ?, score]…], headword, posId]
  const meanings: ViMeaning[] = asArray(data[1])
    .map((group) => {
      const pos = str(at(group, 0))
      const listed = asArray(at(group, 1)).map(str).filter(Boolean)
      const scored = asArray(at(group, 2))
        .map((e) => ({ term: str(at(e, 0)), score: typeof at(e, 3) === 'number' ? (at(e, 3) as number) : 0 }))
        .filter((e) => e.term)
      // Prefer the scored (frequent) senses first, keep listed order otherwise.
      const order = new Map(scored.map((e, i) => [e.term, { score: e.score, i }]))
      const terms = [...listed].sort((a, b) => {
        const sa = order.get(a)?.score ?? 0
        const sb = order.get(b)?.score ?? 0
        return sb - sa || (order.get(a)?.i ?? 0) - (order.get(b)?.i ?? 0)
      })
      return { pos, terms: terms.slice(0, MAX_TERMS_PER_POS) }
    })
    .filter((m) => m.terms.length > 0)

  // dt=md (index 12): [pos, [[definition, id, example?]…], headword, posId]
  const definitions = asArray(data[12]).flatMap((group) => {
    const pos = str(at(group, 0))
    return asArray(at(group, 1))
      .slice(0, MAX_DEFS_PER_POS)
      .map((d) => {
        const en = str(at(d, 0))
        const example = str(at(d, 2))
        return example ? { pos, en, example } : { pos, en }
      })
      .filter((d) => d.en)
  })

  // dt=ex (index 13): [[[sentence-with-<b>, …]…]]
  const examples = asArray(at(data, 13, 0))
    .map((e) => str(at(e, 0)))
    .filter(Boolean)

  // dt=ss (index 11): [pos, [[[words…], id, [[register]]?]…]] — skip groups labeled rare/informal/dated…
  const synonyms: SynonymSet[] = asArray(data[11])
    .map((group) => {
      const pos = str(at(group, 0))
      const words = asArray(at(group, 1))
        .filter((g) => at(g, 2) == null)
        .flatMap((g) => asArray(at(g, 0)).map(str))
        .filter(Boolean)
      return { pos, words: [...new Set(words)].slice(0, MAX_SYNONYMS_PER_POS) }
    })
    .filter((s) => s.words.length > 0)

  return { translation, ipa, meanings, definitions, examples, synonyms }
}

/** Not found = Google echoed the input back unchanged and has no dictionary data for it. */
export function isNotFound(term: string, g: GoogleResult | null): boolean {
  if (!g) return true
  const hasDictData = g.meanings.length > 0 || g.definitions.length > 0 || g.examples.length > 0
  return !hasDictData && norm(g.translation) === norm(term)
}

// ─────────────────────────── Free Dictionary API ───────────────────────────

export interface FreeDictResult {
  ipaUK: string
  ipaUS: string
  definitions: { pos: string; en: string; example?: string }[]
  synonyms: SynonymSet[]
}

/** Parse dictionaryapi.dev's array payload ({title: 'No Definitions Found'} → null). */
export function parseFreeDict(data: unknown): FreeDictResult | null {
  if (!Array.isArray(data) || data.length === 0) return null
  let ipaUK = ''
  let ipaUS = ''
  const unlabeled: string[] = []
  const definitions: FreeDictResult['definitions'] = []
  const synonymsByPos = new Map<string, string[]>()

  for (const entry of data) {
    if (!isObj(entry)) continue
    for (const p of asArray(entry.phonetics)) {
      if (!isObj(p)) continue
      const text = stripSlashes(str(p.text))
      if (!text) continue
      const audio = str(p.audio)
      if (/-uk\.mp3$/i.test(audio)) ipaUK ||= text
      else if (/-us\.mp3$/i.test(audio)) ipaUS ||= text
      else unlabeled.push(text)
    }
    for (const m of asArray(entry.meanings)) {
      if (!isObj(m)) continue
      const pos = str(m.partOfSpeech)
      const words = synonymsByPos.get(pos) ?? []
      words.push(...asArray(m.synonyms).map(str).filter(Boolean))
      for (const d of asArray(m.definitions).slice(0, MAX_DEFS_PER_POS)) {
        if (!isObj(d)) continue
        const en = str(d.definition)
        if (!en) continue
        const example = str(d.example)
        definitions.push(example ? { pos, en, example } : { pos, en })
        words.push(...asArray(d.synonyms).map(str).filter(Boolean))
      }
      if (words.length) synonymsByPos.set(pos, words)
    }
  }
  // Unlabeled phonetics fill whichever accent is still missing (US first, as Wiktionary lists GenAm second).
  for (const text of unlabeled) {
    if (!ipaUS && text !== ipaUK) ipaUS = text
    else if (!ipaUK && text !== ipaUS) ipaUK = text
  }
  const synonyms = [...synonymsByPos].map(([pos, words]) => ({
    pos,
    words: [...new Set(words)].slice(0, MAX_SYNONYMS_PER_POS),
  }))
  return { ipaUK, ipaUS, definitions, synonyms }
}

// ─────────────────────────── Wiktionary (IPA) ───────────────────────────

const UK_ACCENTS = /\b(RP|UK|SSB|British|England)\b/i
const US_ACCENTS = /\b(GA|US|GenAm|American)\b/i

/** Learner-friendly IPA: drop syllable dots and tie bars, ɹ → r (dictionary convention). */
function simplifyIpa(ipa: string): string {
  return ipa.replace(/[.\u0361\u035c]/g, '').replace(/ɹ/g, 'r').trim()
}

/** UK / US IPA from a Wiktionary page's wikitext (English section only). Empty strings when unknown. */
export function parseWiktionaryIpa(data: unknown): { uk: string; us: string } {
  const text = isObj(data) && isObj(data.parse) ? str(data.parse.wikitext) : ''
  const start = text.indexOf('==English==')
  if (start < 0) return { uk: '', us: '' }
  const rest = text.slice(start + 11)
  const next = rest.search(/\n==[^=]/)
  const section = next >= 0 ? rest.slice(0, next) : rest
  let uk = ''
  let us = ''
  let untagged = ''
  let context = '' // accent label from a parent bullet: * {{a|en|RP}}
  for (const line of section.split('\n')) {
    const depth = /^(\*+)/.exec(line)?.[1]?.length ?? 0
    const label = /\{\{a\|en\|([^}]*)\}\}/.exec(line)?.[1] ?? ''
    if (depth === 1) context = label
    const ipaTpl = /\{\{IPA\|en\|([^}]*)\}\}/.exec(line)
    if (!ipaTpl) continue
    const params = ipaTpl[1]!.split('|')
    const first = params.find((p) => /^\/.+\/$/.test(p.trim()))
    if (!first) continue
    const ipa = simplifyIpa(first.trim().slice(1, -1))
    // a= may hold a note ("yod-coalescence") rather than an accent, so look at every candidate label.
    const labels = [params.find((p) => p.startsWith('a='))?.slice(2) ?? '', label, depth > 1 ? context : '']
    if (labels.some((l) => UK_ACCENTS.test(l))) uk ||= ipa
    else if (labels.some((l) => US_ACCENTS.test(l))) us ||= ipa
    else if (labels.every((l) => !l)) untagged ||= ipa
  }
  return { uk: uk || untagged, us: us || untagged }
}

// ─────────────────────────── merge + translate ───────────────────────────

/** Split a batched translation back into lines; null when the count does not line up (then skip translations). */
export function splitTranslatedLines(text: string, expected: number): string[] | null {
  const lines = text.split('\n').map((l) => l.trim())
  while (lines.length > expected && lines[lines.length - 1] === '') lines.pop()
  return lines.length === expected ? lines : null
}

function dedupeBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((it) => {
    const k = key(it)
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** English-only draft (vi fields empty) + the ordered list of strings that need translating. */
function draftEntry(
  term: string,
  google: GoogleResult,
  free: FreeDictResult | null,
): { entry: EnViEntry; lines: string[] } {
  let definitions = google.definitions
  if (definitions.length < 3 && free) definitions = [...definitions, ...free.definitions]
  definitions = dedupeBy(definitions, (d) => norm(d.en)).slice(0, MAX_DEFINITIONS)

  const exampleSources = [
    ...google.examples,
    ...definitions.map((d) => d.example ?? ''),
    ...(free?.definitions.map((d) => d.example ?? '') ?? []),
  ]
  const examples = dedupeBy(
    exampleSources.filter(Boolean).map((s) => boldTerm(s, term)),
    norm,
  ).slice(0, MAX_EXAMPLES)

  const meanings = google.meanings.map((m) => ({ ...m, terms: [...m.terms] }))
  const translation = google.translation
  const alreadyListed = meanings.some((m) => m.terms.some((t) => norm(t) === norm(translation)))
  if (translation && norm(translation) !== norm(term) && !alreadyListed) {
    if (meanings.length > 0) meanings[0]!.terms.unshift(translation)
  }

  const synonyms = google.synonyms.length ? google.synonyms : (free?.synonyms ?? [])

  const entry: EnViEntry = {
    word: term,
    ipaUK: free?.ipaUK ?? '',
    ipaUS: free?.ipaUS || google.ipa,
    translation,
    meanings,
    definitions: definitions.map((d): EnDefinition => {
      const out: EnDefinition = { pos: d.pos, en: d.en, vi: '' }
      if (d.example) out.example = { en: boldTerm(d.example, term), vi: '' }
      return out
    }),
    examples: examples.map((en): BilingualExample => ({ en, vi: '' })),
    synonyms,
    source: 'web',
  }
  const lines = [
    ...entry.definitions.map((d) => d.en),
    ...entry.definitions.flatMap((d) => (d.example ? [stripTags(d.example.en)] : [])),
    ...entry.examples.map((e) => stripTags(e.en)),
  ]
  return { entry, lines }
}

/** Write translated lines back into the draft, in the same order draftEntry listed them. */
function applyTranslations(entry: EnViEntry, vi: string[] | null): EnViEntry {
  if (!vi) return entry
  let i = 0
  for (const d of entry.definitions) d.vi = vi[i++] ?? ''
  for (const d of entry.definitions) if (d.example) d.example.vi = vi[i++] ?? ''
  for (const e of entry.examples) e.vi = vi[i++] ?? ''
  return entry
}

/** Synchronous composition (tests); production uses the same pieces with an async translator. */
export function buildEntry(
  term: string,
  google: GoogleResult,
  free: FreeDictResult | null,
  translate: (lines: string[]) => string[] | null,
): EnViEntry {
  const { entry, lines } = draftEntry(term, google, free)
  return applyTranslations(entry, lines.length ? translate(lines) : [])
}

// ─────────────────────────── network ───────────────────────────

/**
 * Chromium's network stack (net.fetch) — Google rate-limits Node's own fetch from Electron (HTTP 429, TLS
 * fingerprint), while Chromium looks like a normal browser. Falls back to global fetch outside the app (tests).
 */
export const httpFetch = (input: string | URL, init?: RequestInit): Promise<Response> =>
  net?.fetch ? net.fetch(String(input), init) : fetch(input, init)

async function fetchGoogle(term: string): Promise<GoogleResult | null> {
  const url = new URL(GOOGLE_URL)
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'en')
  url.searchParams.set('tl', 'vi')
  for (const dt of ['t', 'bd', 'md', 'ex', 'rm', 'ss']) url.searchParams.append('dt', dt)
  url.searchParams.set('q', term)
  const res = await httpFetch(url, { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Google dictionary request failed with status ${res.status}`)
  return parseGoogle(await res.json())
}

async function fetchWiktionaryIpa(term: string): Promise<{ uk: string; us: string }> {
  if (term.split(' ').length > 3) return { uk: '', us: '' }
  try {
    const url = new URL(WIKTIONARY_URL)
    for (const [k, v] of Object.entries({ action: 'parse', page: term, prop: 'wikitext', format: 'json', formatversion: '2', redirects: '1' })) {
      url.searchParams.set(k, v)
    }
    const res = await httpFetch(url, { signal: AbortSignal.timeout(FREEDICT_TIMEOUT_MS) })
    if (!res.ok) return { uk: '', us: '' }
    const ipa = parseWiktionaryIpa(await res.json())
    // Capitalised selections ("Resilient" at a sentence start): retry the lowercase page.
    if (!ipa.uk && !ipa.us && term !== term.toLowerCase()) return fetchWiktionaryIpa(term.toLowerCase())
    return ipa
  } catch {
    return { uk: '', us: '' }
  }
}

async function fetchFreeDict(term: string): Promise<FreeDictResult | null> {
  // Wiktionary has no entries for long phrases; skip the round trip.
  if (term.split(' ').length > 3) return null
  try {
    const res = await httpFetch(FREEDICT_URL + encodeURIComponent(term.toLowerCase()), {
      signal: AbortSignal.timeout(FREEDICT_TIMEOUT_MS),
    })
    if (!res.ok) return null
    return parseFreeDict(await res.json())
  } catch {
    return null // best-effort extra source
  }
}

/** Translate English text to Vietnamese (multi-line safe: newlines are preserved). */
export async function translateToVietnamese(text: string): Promise<string> {
  const url = new URL(GOOGLE_URL)
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'en')
  url.searchParams.set('tl', 'vi')
  url.searchParams.set('dt', 't')
  const res = await httpFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ q: text }).toString(),
    signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Google translate failed with status ${res.status}`)
  const parsed = parseGoogle(await res.json())
  if (!parsed) throw new Error('Google translate returned an unexpected shape')
  return parsed.translation
}

async function translateLines(lines: string[]): Promise<string[] | null> {
  if (lines.length === 0) return []
  try {
    return splitTranslatedLines(await translateToVietnamese(lines.join('\n')), lines.length)
  } catch {
    return null // definitions/examples still show in English
  }
}

/** Normalise user-selected text into a lookup term (trim, collapse spaces, strip surrounding punctuation). */
export function normalizeTerm(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

/** Look a term up. Rejects on network failure; resolves not-found for unknown words. */
export async function lookupWord(raw: string): Promise<DictionaryLookupResult> {
  const term = normalizeTerm(raw)
  if (!term || term.length > 120) return { status: 'not-found' }
  const [google, free, wiki] = await Promise.all([fetchGoogle(term), fetchFreeDict(term), fetchWiktionaryIpa(term)])
  if (isNotFound(term, google)) return { status: 'not-found' }
  const { entry, lines } = draftEntry(term, google!, free)
  // Wiktionary has the most reliable IPA; Google's "rm" is a respelling, used only as a last resort.
  if (wiki.uk) entry.ipaUK = wiki.uk
  if (wiki.us) entry.ipaUS = wiki.us
  return { status: 'found', entry: applyTranslations(entry, await translateLines(lines)) }
}

/** Register once at app ready. */
export function registerDictionaryIpc(): void {
  ipcMain.handle('dictionary:lookup', (_e, term: string) => lookupWord(term))
}
