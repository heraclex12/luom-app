// Story mode contract: Claude writes a short story using the learner's words (main/story.ts).

export interface StoryRequest {
  /** Words to weave into the story. */
  words: string[]
  /** CEFR-ish difficulty. */
  level: 'A2' | 'B1' | 'B2'
  /** Optional theme the learner picked ("travel", "office"…). */
  theme?: string
}

export interface StoryParagraph {
  /** English paragraph; the learner's words wrapped in <b></b>. */
  en: string
  /** Natural Vietnamese translation of the paragraph. */
  vi: string
}

export interface Story {
  title: string
  paragraphs: StoryParagraph[]
  /** Words actually used (subset of the request). */
  usedWords: string[]
}
