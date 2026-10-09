import { useState, useSyncExternalStore } from 'react'
import { Check, Loader2, Plus, Search, Volume2 } from 'lucide-react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { audioStore, playAudioUrl } from '@/lib/audio'
import { toast } from '@/lib/toast'
import { ensureTerms } from '@/dict'
import * as wordbook from '@/wordbook'
import { speechUrl } from '../../../../shared/speech'

/** Shared pieces of the resource pages: say a text aloud, add a word to My words, search a list. */

/** Plays `text` aloud (neural voice, cached); lights up while it plays. `label` shows next to the icon. */
export function Speak({ text, label, className }: { text: string; label?: React.ReactNode; className?: string }): React.JSX.Element {
  const url = speechUrl(text, 'us')
  const clip = useSyncExternalStore(audioStore.subscribe, audioStore.getSnapshot)
  const active = clip?.url === url
  return (
    <button
      type="button"
      onClick={() => void playAudioUrl(url)}
      aria-label={`Play “${text}”`}
      title="Play"
      className={cn(
        'can-focus inline-flex items-center gap-1.5 rounded-full transition-colors',
        label ? 'px-2 py-0.5 -mx-2 hover:bg-fill-ghost-hover' : 'size-7 shrink-0 justify-center hover:bg-fill-ghost-hover',
        active ? 'text-text-accent' : 'text-text-secondary hover:text-text-primary',
        className,
      )}
    >
      {label}
      <Volume2 className={cn('size-3.5 shrink-0', active && clip?.phase === 'loading' && 'animate-pulse')} />
    </button>
  )
}

/** Adds `term` to My words (its entry is fetched like any looked-up word). */
export function AddWord({ term }: { term: string }): React.JSX.Element {
  const [state, setState] = useState<'idle' | 'busy' | 'added'>('idle')
  const add = async (): Promise<void> => {
    setState('busy')
    try {
      const ids = await ensureTerms([term])
      const id = ids.get(term)
      if (id == null) throw new Error(`Couldn’t add “${term}”.`)
      await wordbook.addWords([id])
      setState('added')
      toast.success(`Added “${term}” to My words`)
    } catch (e) {
      setState('idle')
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <button
      type="button"
      onClick={() => void add()}
      disabled={state !== 'idle'}
      aria-label={state === 'added' ? `“${term}” is in My words` : `Add “${term}” to My words`}
      title={state === 'added' ? 'In My words' : 'Add to My words'}
      className={cn(
        'can-focus grid size-7 shrink-0 place-items-center rounded-full transition-colors',
        state === 'added' ? 'text-fill-brand' : 'text-text-muted hover:bg-fill-ghost-hover hover:text-text-primary',
      )}
    >
      {state === 'busy' ? <Loader2 className="size-3.5 animate-spin" /> : state === 'added' ? <Check className="size-4" strokeWidth={2.5} /> : <Plus className="size-4" />}
    </button>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }): React.JSX.Element {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  )
}

/** "No matches" line for a filtered list. */
export function NoMatches({ query }: { query: string }): React.JSX.Element {
  return <p className="py-10 text-center text-sm text-text-muted">Nothing matches “{query.trim()}”.</p>
}
