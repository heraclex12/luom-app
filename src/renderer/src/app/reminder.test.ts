// Reminder scheduling rules: the daily reminder fires once per day at/after its time (also when the Mac wakes up
// later), never twice; word flashes are spaced by the interval and stay within waking hours.
import { describe, expect, it } from 'vitest'
import {
  dayKey,
  flashDue,
  flashText,
  parseTime,
  pickFlashWord,
  reminderBody,
  shouldFireDaily,
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
  it('respects the interval since the last flash', () => {
    expect(flashDue(at(10), at(9, 30), 1)).toBe(false)
    expect(flashDue(at(10, 31), at(9, 30), 1)).toBe(true)
    expect(flashDue(at(10), null, 2)).toBe(true)
  })
  it('only between 09:00 and 21:59, and never when off', () => {
    expect(flashDue(at(8, 59), null, 1)).toBe(false)
    expect(flashDue(at(22, 0), null, 1)).toBe(false)
    expect(flashDue(at(21, 59), null, 1)).toBe(true)
    expect(flashDue(at(12), null, 0)).toBe(false)
  })
})

describe('pickFlashWord', () => {
  const words = [
    { dictId: 1, state: 2, due: at(9) },
    { dictId: 2, state: 1, due: at(20) },
    { dictId: 3, state: 0, due: null },
  ]
  it('prefers words not shown recently', () => {
    const picked = pickFlashWord(words, [1, 2], () => 0)
    expect(picked?.dictId).toBe(3)
  })
  it('falls back to the whole pool when everything was shown recently, and handles empty', () => {
    expect(pickFlashWord(words, [1, 2, 3], () => 0)?.dictId).toBe(1)
    expect(pickFlashWord([], [], () => 0)).toBeNull()
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
