// Word suggestion contract shared by main, preload and renderer.
// Suggestions come from the Datamuse API, fetched by main.

/** One suggestion: entry = the word, explain = short gloss. */
export interface SuggestEntry {
  entry: string
  explain: string
}
