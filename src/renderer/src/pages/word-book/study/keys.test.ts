// Study keyboard: Space / Enter reveal a flip card; after reveal 1/2/3 rate in on-screen order and Enter / Space
// mean Good; Z or ⌘Z undoes the last rating. Blocked (dialog open, typing) and repeats do nothing.
import { describe, expect, it } from 'vitest'
import { RATING_ORDER, studyKeyAction, type StudyKeyState } from './keys'

const hidden: StudyKeyState = { flip: true, revealed: false, canUndo: false, blocked: false }
const shown: StudyKeyState = { ...hidden, revealed: true }
const key = (k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; repeat: boolean }> = {}) => ({ key: k, ...mods })

describe('studyKeyAction', () => {
  it('Space / Enter reveal a hidden flip card; number keys do nothing yet', () => {
    expect(studyKeyAction(key(' '), hidden)).toEqual({ type: 'reveal' })
    expect(studyKeyAction(key('Enter'), hidden)).toEqual({ type: 'reveal' })
    expect(studyKeyAction(key('1'), hidden)).toBeNull()
  })

  it('after reveal, 1/2/3 follow the on-screen order', () => {
    expect(RATING_ORDER).toEqual(['again', 'hard', 'good'])
    expect(studyKeyAction(key('1'), shown)).toEqual({ type: 'rate', rating: 'again' })
    expect(studyKeyAction(key('2'), shown)).toEqual({ type: 'rate', rating: 'hard' })
    expect(studyKeyAction(key('3'), shown)).toEqual({ type: 'rate', rating: 'good' })
    expect(studyKeyAction(key('4'), shown)).toBeNull()
    expect(studyKeyAction(key('0'), shown)).toBeNull()
  })

  it('after reveal, Enter / Space rate Good', () => {
    expect(studyKeyAction(key('Enter'), shown)).toEqual({ type: 'rate', rating: 'good' })
    expect(studyKeyAction(key(' '), shown)).toEqual({ type: 'rate', rating: 'good' })
  })

  it('Z and ⌘Z undo when there is something to undo; ⇧⌘Z and Ctrl/Alt do not', () => {
    const can = { ...shown, canUndo: true }
    expect(studyKeyAction(key('z'), can)).toEqual({ type: 'undo' })
    expect(studyKeyAction(key('Z'), can)).toEqual({ type: 'undo' })
    expect(studyKeyAction(key('z', { metaKey: true }), can)).toEqual({ type: 'undo' })
    expect(studyKeyAction(key('z', { metaKey: true, shiftKey: true }), can)).toBeNull()
    expect(studyKeyAction(key('z', { ctrlKey: true }), can)).toBeNull()
    expect(studyKeyAction(key('z'), shown)).toBeNull()
  })

  it('undo also works off flip cards (exercises, finished screen)', () => {
    expect(studyKeyAction(key('z'), { flip: false, revealed: false, canUndo: true, blocked: false })).toEqual({ type: 'undo' })
  })

  it('exercise cards: no reveal / rate keys (they have their own)', () => {
    const ex = { flip: false, revealed: true, canUndo: false, blocked: false }
    expect(studyKeyAction(key('1'), ex)).toBeNull()
    expect(studyKeyAction(key('Enter'), ex)).toBeNull()
  })

  it('modifier chords and held-down repeats are ignored', () => {
    expect(studyKeyAction(key('1', { metaKey: true }), shown)).toBeNull()
    expect(studyKeyAction(key('3', { repeat: true }), shown)).toBeNull()
    expect(studyKeyAction(key('z', { repeat: true }), { ...shown, canUndo: true })).toBeNull()
  })

  it('nothing while blocked (dialog open, typing in a field)', () => {
    const blocked = { ...shown, canUndo: true, blocked: true }
    expect(studyKeyAction(key('3'), blocked)).toBeNull()
    expect(studyKeyAction(key('z'), blocked)).toBeNull()
    expect(studyKeyAction(key(' '), { ...hidden, blocked: true })).toBeNull()
  })
})
