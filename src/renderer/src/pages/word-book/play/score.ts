// Matching game XP (pure): 10 per pair + combo bonus + speed bonus + perfect bonus.

export const XP_PER_PAIR = 10
export const XP_PER_COMBO_STEP = 5
/** Time budget per pair for the speed bonus. */
export const SPEED_BUDGET_MS_PER_PAIR = 5_000
export const XP_PER_SECOND_SAVED = 2
export const SPEED_BONUS_CAP = 20
export const PERFECT_BONUS = 10

export interface GameResult {
  pairs: number
  mistakes: number
  maxCombo: number
  elapsedMs: number
}

export interface GameScore {
  base: number
  comboBonus: number
  speedBonus: number
  perfectBonus: number
  total: number
  /** Whole percent of attempts that were right. */
  accuracy: number
}

export function scoreGame(r: GameResult): GameScore {
  const base = r.pairs * XP_PER_PAIR
  const comboBonus = Math.max(0, r.maxCombo - 1) * XP_PER_COMBO_STEP
  const secondsSaved = Math.floor((r.pairs * SPEED_BUDGET_MS_PER_PAIR - r.elapsedMs) / 1000)
  const speedBonus = r.pairs > 0 ? Math.min(SPEED_BONUS_CAP, Math.max(0, secondsSaved * XP_PER_SECOND_SAVED)) : 0
  const perfectBonus = r.pairs > 0 && r.mistakes === 0 ? PERFECT_BONUS : 0
  const attempts = r.pairs + r.mistakes
  return {
    base,
    comboBonus,
    speedBonus,
    perfectBonus,
    total: base + comboBonus + speedBonus + perfectBonus,
    accuracy: attempts > 0 ? Math.round((r.pairs / attempts) * 100) : 0,
  }
}
