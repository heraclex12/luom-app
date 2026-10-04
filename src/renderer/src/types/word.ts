/**
 * 单词领域模型 —— 查词 / 单词本 / 学习三处共用的唯一 Word 定义。
 * 5 态语义对齐 iOS CurrentBookSource / LearnState。学习相关字段（tags/state/due）
 * 仅词书场景有意义，故设为可选：查词不提供、学习卡按需携带。
 */

/** 学习状态，对齐 iOS LearnState。isLearned = state ≥ review。 */
export type LearnState = 'new' | 'learning' | 'review' | 'relearning' | 'mastered'
/** Meaning view: 'simple' = Vietnamese meanings, 'collins' = English definitions (with Vietnamese). */
export type MeaningSource = 'simple' | 'collins'
/** 详情 Tab：例句 / 派生 / 近义 / 词组。 */
export type DetailTab = 'example' | 'derived' | 'synonym' | 'phrase'

/** An English definition (the "English" meaning view): pos + definition + Vietnamese translation + examples. */
export interface CollinsEntry {
  pos: string
  tran: string
  /** Vietnamese translation of the definition (may be empty when translation failed). */
  tranVi?: string
  examples: { en: string; vi: string }[]
}
export interface Example {
  english: string
  /** Vietnamese translation of the example. */
  translation: string
  /** speak:// URL that reads the English sentence aloud. */
  audioUrl?: string
}
export interface Inflection {
  label: string
  value: string
}
export interface SynonymGroup {
  pos: string
  meaning: string
  words: string[]
}

export interface Word {
  word: string
  phoneticUK: string
  phoneticUS: string
  simpleSenses: string[]
  collinsEntries: CollinsEntry[]
  inflections: Inflection[]
  examples: Example[]
  derived: string[]
  phraseGroup: string[]
  synonymGroups: SynonymGroup[]
  /** 考试标签（CET4 / CET6 / GRE / 考研…）。仅词书场景有意义。 */
  tags?: string[]
  /** 学习状态。仅词书场景有意义。 */
  state?: LearnState
  /** 仅 review / relearning 有意义：到期在今日窗口内为 'today'，否则 'later'。 */
  due?: 'today' | 'later'
}
