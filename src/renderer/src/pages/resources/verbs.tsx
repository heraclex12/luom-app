import { useState } from 'react'
import { IRREGULAR_VERBS } from './data/irregular'
import { PHRASAL_VERBS } from './data/phrasal'
import { matchesQuery } from './logic'
import { AddWord, NoMatches, SearchBox, Speak } from './parts'

/** Irregular verbs: base, past and past participle with the meaning; search in English or Vietnamese. */
export function IrregularVerbsContent(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const rows = IRREGULAR_VERBS.filter((v) => matchesQuery(query, [v.base, v.past, v.participle, v.vi]))
  return (
    <div className="flex flex-col gap-4">
      <SearchBox value={query} onChange={setQuery} placeholder="Search a verb or a meaning" />
      {rows.length === 0 ? (
        <NoMatches query={query} />
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface-1">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-text-muted">
                <th className="px-4 pb-2 pt-3 font-semibold">Base</th>
                <th className="px-4 pb-2 pt-3 font-semibold">Past</th>
                <th className="px-4 pb-2 pt-3 font-semibold">Past participle</th>
                <th className="px-4 pb-2 pt-3 font-semibold">Meaning</th>
                <th className="w-20 px-2 pb-2 pt-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.base} className="border-t border-border-200 transition-colors hover:bg-bg-200/60">
                  <td className="px-4 py-2 font-semibold text-text-primary">{v.base}</td>
                  <td className="px-4 py-2 text-text-primary">{v.past}</td>
                  <td className="px-4 py-2 text-text-primary">{v.participle}</td>
                  <td className="px-4 py-2 text-text-secondary">{v.vi}</td>
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-end">
                      <Speak text={`${v.base}, ${v.past.replace(' / ', ' or ')}, ${v.participle.replace(' / ', ' or ')}`} />
                      <AddWord term={v.base} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Phrasal verbs grouped by their verb: meaning, an example, play and add. */
export function PhrasalVerbsContent(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const groups = PHRASAL_VERBS.map((g) => ({ ...g, items: g.items.filter((p) => matchesQuery(query, [p.phrase, p.vi, p.example])) })).filter(
    (g) => g.items.length > 0,
  )
  return (
    <div className="flex flex-col gap-6">
      <SearchBox value={query} onChange={setQuery} placeholder="Search a phrasal verb or a meaning" />
      {groups.length === 0 && <NoMatches query={query} />}
      {groups.map((g) => (
        <section key={g.verb} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-text-muted">{g.verb === 'other everyday ones' ? 'More everyday ones' : `With “${g.verb}”`}</h2>
          <ul className="divide-y divide-border-200 overflow-hidden rounded-card bg-surface-1">
            {g.items.map((p) => (
              <li key={p.phrase} className="flex items-start gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-text-primary">{p.phrase}</span>
                    <span className="text-sm text-text-secondary">{p.vi}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-text-muted">
                    <span className="italic">{p.example}</span>
                    <Speak text={p.example} />
                  </p>
                </div>
                <Speak text={p.phrase} />
                <AddWord term={p.phrase} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
