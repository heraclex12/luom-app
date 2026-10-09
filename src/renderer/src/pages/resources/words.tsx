import { useState } from 'react'
import { cn } from '@/lib/cn'
import { CONFUSING_WORDS } from './data/confusing'
import { PHRASES } from './data/phrases'
import { matchesQuery } from './logic'
import { AddWord, NoMatches, SearchBox, Speak } from './parts'

/** Confusing words: each set side by side (meaning, example), with how to tell them apart. */
export function ConfusingWordsContent(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const sets = CONFUSING_WORDS.filter((s) => matchesQuery(query, [...s.words.flatMap((w) => [w.word, w.vi, w.example]), s.note]))
  return (
    <div className="flex flex-col gap-4">
      <SearchBox value={query} onChange={setQuery} placeholder="Search a word" />
      {sets.length === 0 && <NoMatches query={query} />}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,24rem),1fr))]">
        {sets.map((s) => (
          <article key={s.words.map((w) => w.word).join('/')} className="flex flex-col gap-3 rounded-card bg-surface-1 p-4">
            <div className={cn('grid gap-3', s.words.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
              {s.words.map((w) => (
                <div key={w.word} className="min-w-0">
                  <div className="flex items-center gap-0.5">
                    <span className="font-serif text-lg font-bold text-text-primary">{w.word}</span>
                    <Speak text={w.word} />
                    <AddWord term={w.word} />
                  </div>
                  <p className="text-sm text-text-secondary">{w.vi}</p>
                  <p className="mt-1 text-xs italic leading-relaxed text-text-muted">{w.example}</p>
                </div>
              ))}
            </div>
            <p className="font-hand text-base leading-snug text-text-accent">{s.note}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

/** Everyday phrases by situation, each playable, with the Vietnamese. */
export function PhrasesContent(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [situation, setSituation] = useState<string | null>(null)
  const groups = PHRASES.filter((g) => !situation || g.id === situation)
    .map((g) => ({ ...g, phrases: g.phrases.filter((p) => matchesQuery(query, [p.en, p.vi])) }))
    .filter((g) => g.phrases.length > 0)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search in English or Vietnamese" />
        <div className="flex flex-wrap gap-1.5">
          {[null, ...PHRASES.map((g) => g.id)].map((id) => (
            <button
              key={id ?? 'all'}
              type="button"
              onClick={() => setSituation(id)}
              className={cn(
                'can-focus rounded-full px-3 py-1 text-xs font-medium transition-colors',
                situation === id ? 'bg-fill-brand text-on-brand' : 'bg-fill-control text-text-secondary hover:bg-fill-control-hover',
              )}
            >
              {id ? PHRASES.find((g) => g.id === id)!.title : 'All'}
            </button>
          ))}
        </div>
      </div>
      {groups.length === 0 && <NoMatches query={query} />}
      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-text-muted">{g.title}</h2>
          <ul className="divide-y divide-border-200 overflow-hidden rounded-card bg-surface-1">
            {g.phrases.map((p) => (
              <li key={p.en} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{p.en}</p>
                  <p className="text-sm text-text-secondary">{p.vi}</p>
                </div>
                <Speak text={p.en} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
