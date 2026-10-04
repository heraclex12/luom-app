// Daily Episodes: a season of 14 episodes, one per calendar day from the season's start. An episode not read on its
// day becomes a lost page for good (that is the point: missing a day should sting), the story streak counts
// consecutive episodes read, and the prompts carry the season bible + recent summaries so the story stays coherent.
import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayDiff,
  episodePrompt,
  episodeSlots,
  normalizeBible,
  normalizeEpisode,
  SEASON_LENGTH,
  seasonPrompt,
  storyStreak,
  type SeasonBible,
} from './episodes'

describe('days', () => {
  it('adds and diffs calendar days across months and DST changes', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
    expect(dayDiff('2026-10-04', '2026-10-17')).toBe(13)
    expect(dayDiff('2026-10-04', '2026-10-04')).toBe(0)
  })
})

describe('episodeSlots', () => {
  const start = '2026-10-01'
  it('marks read, lost, today and upcoming episodes', () => {
    const slots = episodeSlots(start, '2026-10-04', [
      { number: 1, read: true },
      { number: 2, read: false }, // generated but not read on its day
      { number: 4, read: false },
    ])
    expect(slots).toHaveLength(SEASON_LENGTH)
    expect(slots.slice(0, 6).map((s) => s.state)).toEqual(['read', 'lost', 'lost', 'today', 'upcoming', 'upcoming'])
    expect(slots[3]).toMatchObject({ number: 4, day: '2026-10-04', generated: true })
    expect(slots[2]).toMatchObject({ number: 3, day: '2026-10-03', generated: false })
  })
  it('shows today as read once it is read, and everything past the end as finished', () => {
    expect(episodeSlots(start, '2026-10-01', [{ number: 1, read: true }])[0].state).toBe('read')
    const after = episodeSlots(start, '2026-10-20', [])
    expect(after.every((s) => s.state === 'lost')).toBe(true)
  })
})

describe('storyStreak', () => {
  const start = '2026-10-01'
  it('counts consecutive read episodes up to today, not breaking on an unread today', () => {
    const read = (ns: number[]) => ns.map((n) => ({ number: n, read: true }))
    expect(storyStreak(episodeSlots(start, '2026-10-05', read([1, 2, 3, 4, 5])))).toBe(5)
    expect(storyStreak(episodeSlots(start, '2026-10-05', read([1, 2, 3, 4])))).toBe(4)
    expect(storyStreak(episodeSlots(start, '2026-10-05', read([1, 2, 4])))).toBe(1)
    expect(storyStreak(episodeSlots(start, '2026-10-05', read([1, 2, 3])))).toBe(0)
  })
})

describe('prompts', () => {
  const bible: SeasonBible = {
    title: 'The Night Market Letters',
    premise: 'Lan finds anonymous letters at her noodle stall.',
    setting: 'Hanoi old quarter',
    characters: [{ name: 'Lan', role: 'stall owner' }],
    outline: Array.from({ length: SEASON_LENGTH }, (_, i) => `Beat ${i + 1}`),
  }
  it('asks for a season with a 14-episode outline in the chosen genre and level', () => {
    const p = seasonPrompt('mystery', 'B1')
    expect(p).toContain('mystery')
    expect(p).toContain('B1')
    expect(p).toContain(String(SEASON_LENGTH))
  })
  it('gives the episode its outline beat, recent summaries, missed days and the words', () => {
    const p = episodePrompt({
      bible,
      number: 5,
      level: 'B1',
      words: ['meticulous', 'reluctant'],
      previous: [
        { number: 3, summary: 'Lan meets the courier.' },
        { number: 4, summary: 'A second letter arrives.' },
      ],
      daysSinceLast: 3,
    })
    expect(p).toContain('Episode 5 of 14')
    expect(p).toContain('Beat 5')
    expect(p).toContain('Lan meets the courier.')
    expect(p).toContain('meticulous, reluctant')
    expect(p).toMatch(/2 days? passed/)
    expect(p).toContain('cliffhanger')
    expect(episodePrompt({ bible, number: 14, level: 'B1', words: [], previous: [], daysSinceLast: 1 })).toContain(
      'finale',
    )
  })
})

describe('normalizeBible', () => {
  it('trims text and makes the outline exactly one line per episode', () => {
    const b = normalizeBible({
      title: ' <b>The Letters</b> ',
      premise: 'p',
      setting: 's',
      characters: [{ name: 'Lan', role: 'owner' }, { name: '', role: 'x' }],
      outline: ['a', 'b'],
    })
    expect(b.title).toBe('The Letters')
    expect(b.characters).toEqual([{ name: 'Lan', role: 'owner' }])
    expect(b.outline).toHaveLength(SEASON_LENGTH)
    expect(b.outline[0]).toBe('a')
    expect(b.outline[13]).toMatch(/finale/i)
  })
})

describe('normalizeEpisode', () => {
  const raw = {
    title: 'The Second Letter',
    paragraphs: [{ en: 'Lan was <b>meticulous</b> <i>today</i>.', vi: 'Lan rất tỉ mỉ.' }],
    summary: ' Lan finds a second letter. ',
    teaser: 'Who is watching her?',
    question: { text: 'What did Lan find?', options: ['A letter', 'A key', 'A map'], answer: 0 },
  }
  it('cleans the story, keeps summary / teaser / question', () => {
    const e = normalizeEpisode(raw, ['meticulous', 'reluctant'], 3)
    expect(e.paragraphs[0].en).toBe('Lan was <b>meticulous</b> today.')
    expect(e.usedWords).toEqual(['meticulous'])
    expect(e.summary).toBe('Lan finds a second letter.')
    expect(e.teaser).toBe('Who is watching her?')
    expect(e.question).toEqual(raw.question)
  })
  it('drops a broken question and the finale teaser', () => {
    const e = normalizeEpisode({ ...raw, question: { text: 'Q', options: ['only one'], answer: 3 } }, [], SEASON_LENGTH)
    expect(e.question).toBeNull()
    expect(e.teaser).toBe('')
    // An empty option would shift the answer index onto the wrong option: drop the question instead.
    expect(normalizeEpisode({ ...raw, question: { text: 'Q', options: ['', 'B', 'C'], answer: 1 } }, [], 2).question).toBeNull()
  })
})
