import { describe, expect, it } from 'vitest'
import { activeNavPath } from './nav'

describe('activeNavPath', () => {
  it('lights Play for games and activities, not My words', () => {
    expect(activeNavPath('/wordbook/play')).toBe('/wordbook/play')
    expect(activeNavPath('/wordbook/play/tea')).toBe('/wordbook/play')
  })

  it('lights Play for the stories and Garden rescue, which open from Play', () => {
    expect(activeNavPath('/wordbook/episodes')).toBe('/wordbook/play')
    expect(activeNavPath('/wordbook/story')).toBe('/wordbook/play')
    expect(activeNavPath('/wordbook/garden')).toBe('/wordbook/play')
  })

  it('lights My words for every other word book page', () => {
    expect(activeNavPath('/wordbook')).toBe('/wordbook')
    expect(activeNavPath('/wordbook/study')).toBe('/wordbook')
    expect(activeNavPath('/wordbook/words')).toBe('/wordbook')
  })

  it('matches the other sections and nothing for unknown routes', () => {
    expect(activeNavPath('/lookup')).toBe('/lookup')
    expect(activeNavPath('/reading')).toBe('/reading')
    expect(activeNavPath('/resources')).toBe('/resources')
    expect(activeNavPath('/demos')).toBeNull()
  })
})
