// Reminder scheduling rules: the daily reminder fires once per day at/after its time (also when the Mac wakes up
// later), never twice; word flashes are spaced by the interval, stay within waking hours and wait while you are away.
import { describe, expect, it } from 'vitest'
import {
  dayKey,
  flashDue,
  flashText,
  parseTime,
  pickFlashWords,
  FLASH_AWAY_SECONDS,
  reminderBody,
  shouldFireDaily,
  shouldNudge,
  episodeReminder,
} from './reminder'

const at = (h: number, m = 0, d = 15): number => new Date(2026, 9, d, h, m, 0, 0).getTime()

describe('parseTime', () => {
  it('parses HH:MM into minutes after midnight; invalid → null', () => {
    expect(parseTime('08:30')).toBe(510)
    expect(parseTime('23:59')).toBe(1439)
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('8:3')).toBeNull()
  })
})

describe('shouldFireDaily', () => {
  it('fires at or after the time when not yet fired today', () => {
    expect(shouldFireDaily(at(8, 29), '08:30', null)).toBe(false)
    expect(shouldFireDaily(at(8, 30), '08:30', null)).toBe(true)
    // Mac asleep at 08:30, woken at 11:00 → still remind that day.
    expect(shouldFireDaily(at(11, 0), '08:30', null)).toBe(true)
  })
  it('fires once per local day', () => {
    expect(shouldFireDaily(at(9, 0), '08:30', dayKey(at(8, 30)))).toBe(false)
    expect(shouldFireDaily(at(8, 31, 16), '08:30', dayKey(at(8, 30, 15)))).toBe(true)
  })
  it('an invalid time never fires', () => {
    expect(shouldFireDaily(at(12), 'nope', null)).toBe(false)
  })
})

describe('flashDue', () => {
  it('respects the interval (minutes) since the last flash', () => {
    expect(flashDue({ now: at(10), lastFlashAt: at(9, 30), everyMinutes: 60, idleSeconds: 0 })).toBe(false)
    expect(flashDue({ now: at(10, 31), lastFlashAt: at(9, 30), everyMinutes: 60, idleSeconds: 0 })).toBe(true)
    expect(flashDue({ now: at(10), lastFlashAt: null, everyMinutes: 120, idleSeconds: 0 })).toBe(true)
  })
  it('allows short intervals: every 10 minutes', () => {
    expect(flashDue({ now: at(10, 9), lastFlashAt: at(10), everyMinutes: 10, idleSeconds: 0 })).toBe(false)
    expect(flashDue({ now: at(10, 10), lastFlashAt: at(10), everyMinutes: 10, idleSeconds: 0 })).toBe(true)
  })
  it('only between 09:00 and 21:59, and never when off', () => {
    expect(flashDue({ now: at(8, 59), lastFlashAt: null, everyMinutes: 60, idleSeconds: 0 })).toBe(false)
    expect(flashDue({ now: at(22, 0), lastFlashAt: null, everyMinutes: 60, idleSeconds: 0 })).toBe(false)
    expect(flashDue({ now: at(21, 59), lastFlashAt: null, everyMinutes: 60, idleSeconds: 0 })).toBe(true)
    expect(flashDue({ now: at(12), lastFlashAt: null, everyMinutes: 0, idleSeconds: 0 })).toBe(false)
  })
  it('waits while you are away from the Mac, so a quiz never closes unseen', () => {
    const o = { now: at(12), lastFlashAt: at(10), everyMinutes: 30 }
    expect(flashDue({ ...o, idleSeconds: FLASH_AWAY_SECONDS })).toBe(false)
    expect(flashDue({ ...o, idleSeconds: FLASH_AWAY_SECONDS - 1 })).toBe(true)
  })
})

describe('pickFlashWords', () => {
  const words = [
    { dictId: 1, due: at(9) },
    { dictId: 2, due: at(20) },
    { dictId: 3, due: null },
    { dictId: 4, due: at(9, 30, 18) },
  ]
  const endOfDay = at(23, 59)
  it('prefers words not shown recently', () => {
    expect(pickFlashWords(words, [1, 2], 1, endOfDay, () => 0).map((w) => w.dictId)).toEqual([3])
  })
  it('serves words due today first: answering them is the review they need', () => {
    expect(pickFlashWords(words, [], 2, endOfDay, () => 0).map((w) => w.dictId)).toEqual([1, 2])
    expect(pickFlashWords(words, [], 3, endOfDay, () => 0).map((w) => w.dictId)).toEqual([1, 2, 3])
  })
  it('returns distinct words, at most the pool size', () => {
    const picked = pickFlashWords(words, [], 9, endOfDay, Math.random).map((w) => w.dictId)
    expect(new Set(picked).size).toBe(4)
    expect(picked).toHaveLength(4)
  })
  it('falls back to recently shown words when nothing else is left, and handles empty', () => {
    expect(pickFlashWords(words, [1, 2, 3, 4], 1, endOfDay, () => 0).map((w) => w.dictId)).toEqual([1])
    expect(pickFlashWords([], [], 3, endOfDay, () => 0)).toEqual([])
  })
})

describe('notification text', () => {
  it('summarises due and new words, null when there is nothing to do', () => {
    expect(reminderBody({ due: 12, newAvailable: 5 })).toBe('12 words to review · 5 new words to learn')
    expect(reminderBody({ due: 1, newAvailable: 0 })).toBe('1 word to review')
    expect(reminderBody({ due: 0, newAvailable: 3 })).toBe('3 new words to learn')
    expect(reminderBody({ due: 0, newAvailable: 0 })).toBeNull()
  })
  it('formats a flash card with phonetic and meaning', () => {
    expect(flashText('abundance', '/əˈbʌndəns/', 'n. sự phong phú')).toEqual({
      title: 'abundance  /əˈbʌndəns/',
      body: 'n. sự phong phú',
    })
    expect(flashText('run', '', '')).toEqual({ title: 'run', body: 'Do you remember what it means?' })
  })
})

describe('shouldNudge (follow-up reminders by intensity)', () => {
  const base = { reminderTime: '08:30', lastNudgeAt: null, goalMet: false }
  it('gentle never nudges again; nobody is nudged once the goal is met', () => {
    expect(shouldNudge({ ...base, now: at(20), intensity: 'gentle' })).toBe(false)
    expect(shouldNudge({ ...base, now: at(20), intensity: 'persistent', goalMet: true })).toBe(false)
  })
  it('regular: one evening nudge from 19:30', () => {
    expect(shouldNudge({ ...base, now: at(19, 0), intensity: 'regular' })).toBe(false)
    expect(shouldNudge({ ...base, now: at(19, 45), intensity: 'regular' })).toBe(true)
    expect(shouldNudge({ ...base, now: at(20, 30), intensity: 'regular', lastNudgeAt: at(19, 45) })).toBe(false)
  })
  it('persistent: every 2 hours after the reminder time, until 22:00', () => {
    expect(shouldNudge({ ...base, now: at(10, 0), intensity: 'persistent' })).toBe(false) // < reminder + 2h
    expect(shouldNudge({ ...base, now: at(10, 30), intensity: 'persistent' })).toBe(true)
    expect(shouldNudge({ ...base, now: at(11, 30), intensity: 'persistent', lastNudgeAt: at(10, 30) })).toBe(false)
    expect(shouldNudge({ ...base, now: at(12, 31), intensity: 'persistent', lastNudgeAt: at(10, 30) })).toBe(true)
    expect(shouldNudge({ ...base, now: at(22, 5), intensity: 'persistent', lastNudgeAt: at(18) })).toBe(false)
  })
})

describe('episodeReminder', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 5, h, m).getTime()
  const base = { series: 'The Hanoi Office Riddle', number: 2, teaser: 'A sharp-eyed intern spots odd markings.', reminderTime: '10:30' }
  it('teases the waiting episode once the reminder time has come, once a day', () => {
    expect(episodeReminder({ ...base, now: at(9), lastMorning: null, lastEvening: null })).toBeNull()
    const r = episodeReminder({ ...base, now: at(10, 31), lastMorning: null, lastEvening: null })
    expect(r).toMatchObject({ kind: 'morning', title: 'Episode 2 of The Hanoi Office Riddle is waiting' })
    expect(r?.body).toContain('A sharp-eyed intern spots odd markings.')
    expect(episodeReminder({ ...base, now: at(11), lastMorning: '2026-10-05', lastEvening: null })).toBeNull()
  })
  it('sends a last-chance note in the evening', () => {
    const r = episodeReminder({ ...base, now: at(20, 40), lastMorning: '2026-10-05', lastEvening: null })
    expect(r).toMatchObject({ kind: 'evening', title: 'Episode 2 is lost at midnight' })
    expect(episodeReminder({ ...base, now: at(21), lastMorning: '2026-10-05', lastEvening: '2026-10-05' })).toBeNull()
  })
  it('works without a teaser (first episode)', () => {
    const r = episodeReminder({ ...base, number: 1, teaser: '', now: at(11), lastMorning: null, lastEvening: null })
    expect(r?.body).toMatch(/new story/i)
  })
})
