// English → Vietnamese dictionary entry contract (main builds it, renderer stores it in dict.entry as JSON).
// Single source of truth shared by main/dictionary, the preload bridge and the renderer word model.

/** A Vietnamese gloss group for one part of speech (e.g. noun → ["sự phong phú", "vô số"]). */
export interface ViMeaning {
  pos: string
  terms: string[]
}

/** An English definition with its Vietnamese translation and an optional bilingual example. */
export interface EnDefinition {
  pos: string
  en: string
  vi: string
  example?: BilingualExample
}

/** One example sentence. `en` may contain <b>…</b> around the headword (rendered bold). */
export interface BilingualExample {
  en: string
  vi: string
}

export interface SynonymSet {
  pos: string
  words: string[]
}

export interface EnViEntry {
  /** Canonical spelling. */
  word: string
  /** IPA without slashes (empty when unknown). */
  ipaUK: string
  ipaUS: string
  /** Best short Vietnamese translation of the whole term. */
  translation: string
  meanings: ViMeaning[]
  definitions: EnDefinition[]
  examples: BilingualExample[]
  synonyms: SynonymSet[]
  /** Where the content came from: free web sources or AI enrichment. */
  source: 'web' | 'ai'
}

/** dictionary:lookup result — not-found is a normal answer; network errors reject the promise instead. */
export type DictionaryLookupResult = { status: 'found'; entry: EnViEntry } | { status: 'not-found' }
