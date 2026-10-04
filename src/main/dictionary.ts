// English → Vietnamese dictionary: builds an EnViEntry from free web sources, in main (no CORS / Origin issues).
//
// Sources (both keyless):
//   • Google Translate "gtx" endpoint — Vietnamese meanings by part of speech (dt=bd), English definitions (dt=md),
//     example sentences (dt=ex), synonyms (dt=ss), a rough phonetic (dt=rm). This is the primary source.
//   • Free Dictionary API (dictionaryapi.dev, Wiktionary data) — proper UK/US IPA, extra definitions/examples.
//     It is flaky, so it is best-effort with a short timeout.
//   • Wiktionary — wikitext of the page (UK/US IPA, antonyms, word-family candidates), then its English headword
//     templates rendered to HTML (inflection links in the headword lines: went / gone / children / happier…).
// English definitions and examples are then machine-translated to Vietnamese in one batched request.
//
// Parsing is pure (unit-tested against recorded fixtures); `lookupWord` does the network orchestration.
import { ipcMain, net } from 'electron'
import type {
  BilingualExample,
  DictionaryLookupResult,
  EnDefinition,
  EnViEntry,
  FamilyWord,
  SynonymSet,
  ViMeaning,
  WordForm,
} from '../shared/dictionary'
import { WORD_FORM_LABELS } from '../shared/dictionary'

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single'
const FREEDICT_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const WIKTIONARY_URL = 'https://en.wiktionary.org/w/api.php'
const GOOGLE_TIMEOUT_MS = 10_000
// Extra sources are best-effort: never let them hold up a lookup for long.
const FREEDICT_TIMEOUT_MS = 2_500
const WIKTIONARY_TIMEOUT_MS = 4_000

const MAX_TERMS_PER_POS = 6
const MAX_DEFS_PER_POS = 3
const MAX_DEFINITIONS = 6
const MAX_EXAMPLES = 5
const MAX_SYNONYMS_PER_POS = 8
const MAX_ANTONYMS_PER_POS = 8
const MAX_FAMILY = 8

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
  antonyms: SynonymSet[]
}

/** Parse dictionaryapi.dev's array payload ({title: 'No Definitions Found'} → null). */
export function parseFreeDict(data: unknown): FreeDictResult | null {
  if (!Array.isArray(data) || data.length === 0) return null
  let ipaUK = ''
  let ipaUS = ''
  const unlabeled: string[] = []
  const definitions: FreeDictResult['definitions'] = []
  const synonymsByPos = new Map<string, string[]>()
  const antonymsByPos = new Map<string, string[]>()

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
      const antonyms = antonymsByPos.get(pos) ?? []
      antonyms.push(...asArray(m.antonyms).map(str).filter(Boolean))
      for (const d of asArray(m.definitions).slice(0, MAX_DEFS_PER_POS)) {
        if (!isObj(d)) continue
        const en = str(d.definition)
        if (!en) continue
        const example = str(d.example)
        definitions.push(example ? { pos, en, example } : { pos, en })
        words.push(...asArray(d.synonyms).map(str).filter(Boolean))
        antonyms.push(...asArray(d.antonyms).map(str).filter(Boolean))
      }
      if (words.length) synonymsByPos.set(pos, words)
      if (antonyms.length) antonymsByPos.set(pos, antonyms)
    }
  }
  // Unlabeled phonetics fill whichever accent is still missing (US first, as Wiktionary lists GenAm second).
  for (const text of unlabeled) {
    if (!ipaUS && text !== ipaUK) ipaUS = text
    else if (!ipaUK && text !== ipaUS) ipaUK = text
  }
  const toSets = (byPos: Map<string, string[]>, max: number): SynonymSet[] =>
    [...byPos].map(([pos, words]) => ({ pos, words: [...new Set(words)].slice(0, max) }))
  return {
    ipaUK,
    ipaUS,
    definitions,
    synonyms: toSets(synonymsByPos, MAX_SYNONYMS_PER_POS),
    antonyms: toSets(antonymsByPos, MAX_ANTONYMS_PER_POS),
  }
}

// ─────────────────────────── Wiktionary (IPA) ───────────────────────────

const UK_ACCENTS = /\b(RP|UK|SSB|British|England)\b/i
const US_ACCENTS = /\b(GA|US|GenAm|American)\b/i

/** Learner-friendly IPA: drop syllable dots and tie bars, ɹ → r (dictionary convention). */
function simplifyIpa(ipa: string): string {
  return ipa.replace(/[.\u0361\u035c]/g, '').replace(/ɹ/g, 'r').trim()
}

const wikitextOf = (data: unknown): string => (isObj(data) && isObj(data.parse) ? str(data.parse.wikitext) : '')

/** The English (level-2) section of a page's wikitext, without its heading; '' when absent. */
function englishWikitext(text: string): string {
  const start = text.indexOf('==English==')
  if (start < 0) return ''
  const rest = text.slice(start + 11)
  const next = rest.search(/\n==[^=]/)
  return next >= 0 ? rest.slice(0, next) : rest
}

/** UK / US IPA from a Wiktionary page's wikitext (English section only). Empty strings when unknown. */
export function parseWiktionaryIpa(data: unknown): { uk: string; us: string } {
  const section = englishWikitext(wikitextOf(data))
  if (!section) return { uk: '', us: '' }
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

// ─────────────────────────── Wiktionary (forms, antonyms, word family) ───────────────────────────

/** Headings that name a part of speech (MediaWiki ids / wikitext headings, lowercased). */
const POS_HEADINGS = new Set([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'determiner',
  'article',
  'numeral',
  'particle',
  'participle',
  'proper noun',
  'phrase',
  'prepositional phrase',
  'idiom',
  'proverb',
  'contraction',
  'prefix',
  'suffix',
])

/** Inflections of one part of speech, in WORD_FORM_LABELS order. */
export interface FormGroup {
  pos: string
  forms: WordForm[]
}

/** What the Wiktionary page adds to an entry (all parts of speech; draftEntry filters by Google's). */
export interface WiktionaryExtras {
  forms: FormGroup[]
  antonyms: SynonymSet[]
  family: { pos: string; word: string }[]
}

const HEADING_LINE = /^(=+)\s*([^=].*?)\s*\1\s*$/

/**
 * A tiny wikitext page with just the English part-of-speech / etymology headings and the headword template under
 * each part of speech ({{en-verb}}, {{en-noun|-}}, {{head|en|…}}). Rendering this with action=parse&title=X takes
 * ~0.3 s, while rendering the whole English section of a big page takes several seconds; the headword lines (with
 * the inflection links) come out identical. '' when there is nothing to render.
 */
export function headwordWikitext(wikitext: string): string {
  const out: string[] = []
  let awaitingHeadword = false
  let templates = 0
  for (const line of englishWikitext(wikitext).split('\n')) {
    const h = HEADING_LINE.exec(line)
    if (h) {
      const name = h[2]!.toLowerCase()
      awaitingHeadword = POS_HEADINGS.has(name)
      if (awaitingHeadword || name.startsWith('etymology')) out.push(line.trim())
      continue
    }
    if (!awaitingHeadword) continue
    if (/^\{\{(en-|head\|en\|)/.test(line)) {
      out.push(line.trim())
      templates++
      awaitingHeadword = false
    } else if (line.startsWith('#')) awaitingHeadword = false // definitions started: no headword template
  }
  return templates ? out.join('\n') : ''
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

type FormLabel = (typeof WORD_FORM_LABELS)[number]

/** Wiktionary "CODE-form-of" class code → our labels (ed-form = regular verb: same past and past participle). */
function labelsForCode(code: string): FormLabel[] {
  if (/archaic|obsolete|dialect|nonstandard/.test(code)) return []
  switch (code) {
    case 's-verb-form':
      return ['3rd person']
    case 'ing-form':
      return ['-ing form']
    case 'spast':
      return ['Past (V2)']
    case 'past|part':
    case 'past|ptcp':
      return ['Past participle (V3)']
    case 'ed-form':
      return ['Past (V2)', 'Past participle (V3)']
    case 'p':
      return ['Plural']
    case 'comparative':
      return ['Comparative']
    case 'superlative':
      return ['Superlative']
    default:
      return []
  }
}

/**
 * Inflections from rendered Wiktionary HTML (the English section, or just its headword templates — see
 * headwordWikitext): the headword lines link each form as <b class="… form-of lang-en CODE-form-of">. Grouped by the part-of-speech
 * heading above the headword line; the first form of each kind per part of speech wins (later ones are variants).
 */
export function parseWiktionaryForms(data: unknown): FormGroup[] {
  const html = isObj(data) && isObj(data.parse) ? str(data.parse.text) : ''
  const groups = new Map<string, Map<FormLabel, string>>()
  let pos = ''
  const token = /<h([2-6])\b[^>]*\bid="([^"]*)"[^>]*>|<span class="headword-line">/g
  for (let m = token.exec(html); m; m = token.exec(html)) {
    if (m[1]) {
      const name = decodeEntities(m[2]!).replace(/_\d+$/, '').replace(/_/g, ' ').toLowerCase()
      if (m[1] === '2' && name !== 'english') break // only the English section
      if (POS_HEADINGS.has(name)) pos = name
      else if (name.startsWith('etymology')) pos = ''
      continue
    }
    if (!pos) continue
    const end = html.indexOf('</p>', m.index)
    const line = html.slice(m.index, end >= 0 ? end : undefined)
    const group = groups.get(pos) ?? new Map<FormLabel, string>()
    for (const b of line.matchAll(/<b class="([^"]*)"[^>]*>([\s\S]*?)<\/b>/g)) {
      const code = /\blang-en (\S+)-form-of\b/.exec(decodeEntities(b[1]!))?.[1]
      if (!code) continue
      const value = decodeEntities(stripTags(b[2]!)).replace(/\s+/g, ' ').trim()
      if (!value || /^(more|most)(\s|$)/i.test(value)) continue // periphrastic comparison
      for (const label of labelsForCode(code)) if (!group.has(label)) group.set(label, value.normalize('NFC'))
    }
    if (group.size) groups.set(pos, group)
  }
  return [...groups].map(([p, forms]) => ({
    pos: p,
    forms: WORD_FORM_LABELS.filter((l) => forms.has(l)).map((label) => ({ label, value: forms.get(label)! })),
  }))
}

/**
 * Forms to show: only for the parts of speech Google lists for the word ("happy" is an adjective → happier /
 * happiest, not the rare verb "happied"); without Google part-of-speech info, the first section's.
 */
export function selectForms(groups: FormGroup[], googlePos: string[]): WordForm[] {
  const wanted = [...new Set(googlePos.map((p) => p.toLowerCase()).filter(Boolean))]
  const picked = wanted.length
    ? wanted.flatMap((p) => groups.find((g) => g.pos === p)?.forms ?? [])
    : (groups[0]?.forms ?? [])
  return dedupeBy(picked, (f) => `${f.label}\u0000${f.value}`)
}

interface Template {
  name: string
  params: string[]
}

/** Top-level {{templates}} in wikitext (possibly multi-line), params split on top-level pipes and trimmed. */
function findTemplates(text: string): Template[] {
  const out: Template[] = []
  let i = text.indexOf('{{')
  while (i >= 0) {
    let depth = 0
    let links = 0
    let j = i
    const parts: string[] = []
    let cur = ''
    for (; j < text.length; j++) {
      const two = text.slice(j, j + 2)
      if (two === '{{') {
        depth++
        if (depth > 1) cur += two
        j++
      } else if (two === '}}') {
        depth--
        if (depth === 0) break
        cur += two
        j++
      } else if (two === '[[') {
        links++
        cur += two
        j++
      } else if (two === ']]') {
        links--
        cur += two
        j++
      } else if (text[j] === '|' && depth === 1 && links <= 0) {
        parts.push(cur)
        cur = ''
      } else cur += text[j]
    }
    if (depth !== 0) break // unbalanced: stop scanning
    parts.push(cur)
    const [name = '', ...params] = parts.map((p) => p.trim())
    out.push({ name: name.toLowerCase(), params })
    i = text.indexOf('{{', j + 2)
  }
  return out
}

/** Plain terms from template params: drop named params, links to Thesaurus:/other namespaces, inline modifiers. */
function termsFromParams(params: string[]): string[] {
  return params
    .filter((p) => p && !p.includes('=') && !p.includes('{{'))
    .flatMap((p) =>
      p
        .replace(/<[^>]*>/g, '')
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
        .split(','),
    )
    .map((t) => t.trim().normalize('NFC'))
    .filter((t) => t && t !== '-' && !t.includes(':'))
}

/** {{l|en|X}} links on bullet lines. */
function bulletLinks(text: string): string[] {
  return text
    .split('\n')
    .filter((l) => l.startsWith('*'))
    .flatMap((l) => findTemplates(l))
    .filter((t) => t.name === 'l' && t.params[0] === 'en')
    .flatMap((t) => termsFromParams(t.params.slice(1, 2)))
}

/** {{col|en|…}}, {{col3|en|…}}, {{der3|en|…}}, {{rel3|en|…}} lists. */
function listTemplateTerms(text: string): string[] {
  return findTemplates(text)
    .filter((t) => /^(col|der|rel)\d*(-u)?$/.test(t.name) && t.params[0] === 'en')
    .flatMap((t) => termsFromParams(t.params.slice(1)))
}

const NOUN_SUFFIX = /(tion|sion|ness|ment|ity|ance|ence|er|or|ism|ship|hood|ure|age)$/
const ADJ_SUFFIX = /(ful|ous|ive|able|ible|al|ic|less|ish|ent|ant|ary|ory)$/
const VERB_SUFFIX = /(ize|ise|ify|en|ate)$/

// Derivational morphemes stripped (repeatedly) off the end of what follows the shared stem: decid|ability,
// happ|iness, child|hood pass; compounds such as child|minder or run|holder leave a long remainder and are dropped.
const MORPHEMES = /(ation|tion|sion|ion|ness|ment|ity|ty|ance|ence|er|or|ism|ist|ship|hood|ure|age|ly|ful|ous|ive|able|ible|abil|ibil|al|ic|less|ish|ent|ant|ary|ory|ize|ise|ify|en|ate)$/

/** True when `word` is the stem + derivational suffixes (≤ 2 linking letters left over). */
function isDerivation(word: string, head: string): boolean {
  let n = 0
  while (n < word.length && n < head.length && word[n] === head[n]) n++
  let rest = word.slice(n)
  for (let m = MORPHEMES.exec(rest); m && rest; m = MORPHEMES.exec(rest)) rest = rest.slice(0, -m[1]!.length)
  return rest.length <= 2
}

/** Part of speech guessed from the suffix (word-family heuristics); null when no rule matches. */
function posBySuffix(word: string): string | null {
  if (NOUN_SUFFIX.test(word)) return 'noun'
  if (word.endsWith('ly')) return 'adverb'
  if (ADJ_SUFFIX.test(word)) return 'adjective'
  if (VERB_SUFFIX.test(word)) return 'verb'
  return null
}

/**
 * Antonyms and word-family candidates from the English section of a page's wikitext:
 *   • antonyms — {{ant|en|…}} / {{antonyms|en|…}} under the senses, plus ====Antonyms==== sections, grouped by
 *     the part-of-speech heading they sit under (max 8 each);
 *   • family — single words from Related terms (first) / Derived terms sharing the headword's first 4 letters and
 *     built from it with suffixes (not compounds), part of speech guessed from the suffix (decide → decision n.,
 *     decisive adj.; max 8).
 */
export function parseWiktionaryRelations(data: unknown, headword: string): Pick<WiktionaryExtras, 'antonyms' | 'family'> {
  const section = englishWikitext(wikitextOf(data))
  const head = headword.toLowerCase()
  const antonymsByPos = new Map<string, string[]>()
  const related: string[] = []
  const derived: string[] = []
  // Split the section into blocks at heading lines, remembering the part of speech and sub-heading.
  let pos = ''
  let sub = ''
  let block: string[] = []
  const flush = (): void => {
    const text = block.join('\n')
    block = []
    const ants: string[] = []
    for (const t of findTemplates(text)) {
      if ((t.name === 'ant' || t.name === 'antonyms') && t.params[0] === 'en') ants.push(...termsFromParams(t.params.slice(1)))
    }
    if (sub === 'antonyms') ants.push(...listTemplateTerms(text), ...bulletLinks(text))
    if (sub === 'related terms') related.push(...listTemplateTerms(text), ...bulletLinks(text))
    if (sub === 'derived terms') derived.push(...listTemplateTerms(text), ...bulletLinks(text))
    if (pos && ants.length) antonymsByPos.set(pos, [...(antonymsByPos.get(pos) ?? []), ...ants])
  }
  for (const line of section.split('\n')) {
    const h = HEADING_LINE.exec(line)
    if (!h) {
      block.push(line)
      continue
    }
    flush()
    const name = h[2]!.toLowerCase()
    if (POS_HEADINGS.has(name)) {
      pos = name
      sub = ''
    } else if (name.startsWith('etymology')) {
      pos = ''
      sub = ''
    } else sub = name
  }
  flush()

  const antonyms = [...antonymsByPos]
    .map(([p, words]) => ({
      pos: p,
      words: dedupeBy(words, (w) => w.toLowerCase())
        .filter((w) => w.toLowerCase() !== head)
        .slice(0, MAX_ANTONYMS_PER_POS),
    }))
    .filter((a) => a.words.length > 0)

  const stem = head.slice(0, 4)
  const family = dedupeBy([...related, ...derived], (w) => w)
    .filter((w) => /^[a-z]+$/.test(w) && w !== head && w.startsWith(stem) && isDerivation(w, head))
    .flatMap((word) => {
      const p = posBySuffix(word)
      return p ? [{ pos: p, word }] : []
    })
    .slice(0, MAX_FAMILY)
  return { antonyms, family }
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
  wiki: WiktionaryExtras | null = null,
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

  // Forms / antonyms only for the parts of speech Google knows the word as (all of them when it has none).
  const googlePos = [...new Set([...google.meanings, ...google.definitions].map((m) => m.pos.toLowerCase()).filter(Boolean))]
  const forms = selectForms(wiki?.forms ?? [], googlePos)
  const antonymsByPos = new Map<string, string[]>()
  for (const a of [...(wiki?.antonyms ?? []), ...(free?.antonyms ?? [])]) {
    const pos = a.pos.toLowerCase()
    if (googlePos.length && !googlePos.includes(pos)) continue
    antonymsByPos.set(pos, [...(antonymsByPos.get(pos) ?? []), ...a.words])
  }
  const antonyms = [...antonymsByPos]
    .map(([pos, words]) => ({
      pos,
      words: dedupeBy(words, (w) => w.toLowerCase())
        .filter((w) => norm(w) !== norm(term))
        .slice(0, MAX_ANTONYMS_PER_POS),
    }))
    .filter((a) => a.words.length > 0)
  // An inflection ("happier") is not a family member, even if Wiktionary lists it as a derived term.
  const inflected = new Set((wiki?.forms ?? []).flatMap((g) => g.forms.map((f) => f.value.toLowerCase())))
  const family = (wiki?.family ?? [])
    .filter((f) => !inflected.has(f.word.toLowerCase()))
    .map((f): FamilyWord => ({ pos: f.pos, word: f.word, vi: '' }))

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
    forms,
    family,
    antonyms,
    source: 'web',
  }
  const lines = [
    ...entry.definitions.map((d) => d.en),
    ...entry.definitions.flatMap((d) => (d.example ? [stripTags(d.example.en)] : [])),
    ...entry.examples.map((e) => stripTags(e.en)),
    ...family.map((f) => f.word),
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
  for (const f of entry.family ?? []) f.vi = vi[i++] ?? ''
  return entry
}

/** Synchronous composition (tests); production uses the same pieces with an async translator. */
export function buildEntry(
  term: string,
  google: GoogleResult,
  free: FreeDictResult | null,
  translate: (lines: string[]) => string[] | null,
  wiki: WiktionaryExtras | null = null,
): EnViEntry {
  const { entry, lines } = draftEntry(term, google, free, wiki)
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

interface WiktionaryResult {
  ipa: { uk: string; us: string }
  extras: WiktionaryExtras | null
}

const NO_WIKTIONARY: WiktionaryResult = { ipa: { uk: '', us: '' }, extras: null }

async function fetchWiktionaryWikitext(page: string): Promise<unknown> {
  const url = new URL(WIKTIONARY_URL)
  const params = { action: 'parse', page, prop: 'wikitext', format: 'json', formatversion: '2', redirects: '1' }
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await httpFetch(url, { signal: AbortSignal.timeout(WIKTIONARY_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Wiktionary request failed with status ${res.status}`)
  return res.json()
}

/** Inflections: a second request renders just the headword templates (see headwordWikitext) as the page title. */
async function fetchWiktionaryForms(title: string, wikitext: string): Promise<FormGroup[]> {
  const text = headwordWikitext(wikitext)
  if (!text) return []
  try {
    const body = new URLSearchParams({
      action: 'parse',
      format: 'json',
      formatversion: '2',
      title,
      text,
      contentmodel: 'wikitext',
      prop: 'text',
      disablelimitreport: '1',
    })
    const res = await httpFetch(WIKTIONARY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString(),
      signal: AbortSignal.timeout(WIKTIONARY_TIMEOUT_MS),
    })
    return res.ok ? parseWiktionaryForms(await res.json()) : []
  } catch {
    return []
  }
}

/** Best-effort: IPA, antonyms, word family and inflections from Wiktionary (empty on any failure). */
async function fetchWiktionary(term: string): Promise<WiktionaryResult> {
  if (term.split(' ').length > 3) return NO_WIKTIONARY
  try {
    const data = await fetchWiktionaryWikitext(term)
    const ipa = parseWiktionaryIpa(data)
    // Capitalised selections ("Resilient" at a sentence start): retry the lowercase page.
    if (!ipa.uk && !ipa.us && term !== term.toLowerCase()) return fetchWiktionary(term.toLowerCase())
    const title = (isObj(data) && isObj(data.parse) && str(data.parse.title)) || term
    const forms = await fetchWiktionaryForms(title, wikitextOf(data))
    return { ipa, extras: { forms, ...parseWiktionaryRelations(data, title) } }
  } catch {
    return NO_WIKTIONARY
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

// ─────────────────────────── Microsoft fallback ───────────────────────────
// Google's free endpoint rate-limits (HTTP 429 / redirect to a CAPTCHA) after heavy use. Microsoft Edge's keyless
// translator takes an array of strings and answers one translation per string, so it is the fallback.

const MICROSOFT_URL = 'https://edge.microsoft.com/translate/translatetext?from=en&to=vi'

/** [{translations:[{text}]}…] → aligned strings; null when the shape or count is off. */
export function parseMicrosoftTranslations(data: unknown, expected: number): string[] | null {
  if (!Array.isArray(data) || data.length !== expected) return null
  const out = data.map((d) => {
    const first = isObj(d) ? asArray(d.translations)[0] : undefined
    return isObj(first) ? str(first.text) : ''
  })
  return out.some((t) => !t) ? null : out
}

async function translateWithMicrosoft(lines: string[]): Promise<string[] | null> {
  const res = await httpFetch(MICROSOFT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lines),
    signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Microsoft translate failed with status ${res.status}`)
  return parseMicrosoftTranslations(await res.json(), lines.length)
}

/** Google-shaped result built from a Microsoft translation of the term + Free Dictionary data (Google unavailable). */
export function fallbackResult(
  term: string,
  translation: string,
  free: FreeDictResult | null,
  /** The word's main part of speech (first section of its Wiktionary page), when known. */
  primaryPos?: string,
): GoogleResult {
  const all = free?.definitions ?? []
  const main = primaryPos?.toLowerCase()
  const ofMain = main ? all.filter((d) => d.pos.toLowerCase() === main) : []
  // Keep one part of speech so forms / antonyms are not mixed up (happy: adjective, not the rare noun/verb).
  const definitions = ofMain.length > 0 ? ofMain : all
  const pos = ofMain.length > 0 ? main! : (all[0]?.pos ?? '')
  const hasTranslation = !!translation && norm(translation) !== norm(term)
  return {
    translation,
    ipa: '',
    meanings: pos && hasTranslation ? [{ pos, terms: [translation] }] : [],
    definitions,
    examples: [],
    synonyms: [],
  }
}

async function translateLines(lines: string[]): Promise<string[] | null> {
  if (lines.length === 0) return []
  try {
    const viaGoogle = splitTranslatedLines(await translateToVietnamese(lines.join('\n')), lines.length)
    if (viaGoogle) return viaGoogle
  } catch {
    /* fall through to Microsoft */
  }
  try {
    return await translateWithMicrosoft(lines)
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
  const [googleTry, free, wiki] = await Promise.all([
    fetchGoogle(term).catch((e: unknown) => e as Error),
    fetchFreeDict(term),
    fetchWiktionary(term),
  ])
  let google = googleTry instanceof Error ? null : googleTry
  if (!google) {
    // Google failed (rate limit / offline): Microsoft translation + Free Dictionary. Throw only if both fail.
    const translated = await translateWithMicrosoft([term]).catch(() => null)
    if (!translated) throw googleTry instanceof Error ? googleTry : new Error('Dictionary lookup failed')
    google = fallbackResult(term, translated[0] ?? '', free, wiki.extras?.forms[0]?.pos)
  }
  if (isNotFound(term, google)) return { status: 'not-found' }
  const { entry, lines } = draftEntry(term, google!, free, wiki.extras)
  // Wiktionary has the most reliable IPA; Google's "rm" is a respelling, used only as a last resort.
  if (googleTry instanceof Error || googleTry === null) entry.partial = true
  if (wiki.ipa.uk) entry.ipaUK = wiki.ipa.uk
  if (wiki.ipa.us) entry.ipaUS = wiki.ipa.us
  return { status: 'found', entry: applyTranslations(entry, await translateLines(lines)) }
}

/** Register once at app ready. */
export function registerDictionaryIpc(): void {
  ipcMain.handle('dictionary:lookup', (_e, term: string) => lookupWord(term))
}
