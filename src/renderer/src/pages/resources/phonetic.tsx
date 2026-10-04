import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui'

/**
 * Phonetics trainer: Vowels / Consonants and British / American toggles, phonemes in a grid by group.
 * Each tile plays either the phoneme or its example word; only one sound plays at a time.
 * Data and audio live in public/phonetic/<accent>/ (British: 44 phonemes, American: 39), each
 * with its own notation. The audio source is credited at the bottom (external links open in the system browser).
 */

type Accent = 'uk' | 'us'

/** Audio directory under public/, matching the `accent` field in index.json. */
const ACCENT_DIR: Record<Accent, string> = { uk: 'british', us: 'american' }

interface Phoneme {
  index: number
  group: string
  ipa: string
  word: string
  soundAudio: string
  wordAudio: string
}

interface PhoneticIndex {
  total: number
  /** Audio source site, used for attribution. */
  source: string
  groups: { id: string; label: string }[]
  items: Phoneme[]
}

/** Groups that count as vowels; decides which groups each Vowels / Consonants tab shows. */
const VOWEL_GROUPS = new Set(['monophthong', 'diphthong'])

/** English group headings (index.json labels are not localized). */
const GROUP_LABEL: Record<string, string> = {
  monophthong: 'Monophthongs',
  diphthong: 'Diphthongs',
  consonant: 'Consonants',
}

export function PhoneticsContent(): React.JSX.Element {
  const [group, setGroup] = useState<'vowel' | 'consonant'>('vowel')
  const [accent, setAccent] = useState<Accent>('uk')
  const [data, setData] = useState<PhoneticIndex | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Must be relative: in prod the renderer loads from file://, where a leading `/` resolves to the
  // drive root and fetch fails. HashRouter never changes the path, so relative works in dev and prod.
  const base = `./phonetic/${ACCENT_DIR[accent]}`

  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    fetch(`${base}/index.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: PhoneticIndex) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [base])

  const groups = data?.groups.filter((g) => VOWEL_GROUPS.has(g.id) === (group === 'vowel')) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup value={group} onValueChange={(v) => v && setGroup(v as typeof group)}>
          <ToggleGroupItem value="vowel">Vowels</ToggleGroupItem>
          <ToggleGroupItem value="consonant">Consonants</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup value={accent} onValueChange={(v) => v && setAccent(v as Accent)}>
          <ToggleGroupItem value="uk">British</ToggleGroupItem>
          <ToggleGroupItem value="us">American</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {error ? (
        <p className="py-8 text-center text-sm text-text-muted">Couldn't load phonetics data ({error})</p>
      ) : !data ? (
        <PhonemeGridSkeleton />
      ) : (
        groups.map((g) => (
          <section key={g.id} className="flex flex-col gap-2.5">
            <h3 className="text-xs font-semibold text-text-muted">{GROUP_LABEL[g.id] ?? g.label}</h3>
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,112px),112px))]">
              {data.items
                .filter((p) => p.group === g.id)
                .map((p) => (
                  <PhonemeTile key={p.index} phoneme={p} base={base} />
                ))}
            </div>
          </section>
        ))
      )}

      {data && (
        <p className="text-xs text-text-muted">
          Audio source: 
          <a
            href={data.source}
            target="_blank"
            rel="noreferrer"
            className="rounded-md text-text-accent transition hover:underline can-focus"
          >
            {data.source}
          </a>
        </p>
      )}
    </div>
  )
}

/** Loading state: pulsing placeholders the size of real tiles. */
function PhonemeGridSkeleton(): React.JSX.Element {
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,112px),112px))]">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-card bg-bg-300" />
      ))}
    </div>
  )
}

/**
 * Phoneme tile: symbol and example word, each independently playable.
 * Highlights while playing; playback errors reset silently (missing audio shouldn't interrupt browsing).
 */
function PhonemeTile({ phoneme, base }: { phoneme: Phoneme; base: string }): React.JSX.Element {
  const [playing, setPlaying] = useState<'sound' | 'word' | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => () => audioRef.current?.pause(), [])

  const play = useCallback(
    (kind: 'sound' | 'word', file: string) => {
      audioRef.current?.pause()
      const audio = new Audio(`${base}/${file}`)
      audioRef.current = audio
      setPlaying(kind)
      const reset = (): void => setPlaying((p) => (p === kind ? null : p))
      audio.onended = reset
      audio.onerror = reset
      void audio.play().catch(reset)
    },
    [base]
  )

  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-card bg-surface-1 shadow-card-ring">
      <button
        type="button"
        aria-label={`Play sound ${phoneme.ipa}`}
        onClick={() => play('sound', phoneme.soundAudio)}
        className={cn(
          'cursor-pointer rounded-lg px-3 text-4xl font-semibold leading-none transition hover:scale-110 can-focus',
          playing === 'sound' ? 'text-text-accent' : 'text-text-primary hover:text-text-accent'
        )}
      >
        {phoneme.ipa}
      </button>
      <button
        type="button"
        aria-label={`Play word ${phoneme.word}`}
        onClick={() => play('word', phoneme.wordAudio)}
        className={cn(
          'cursor-pointer rounded-md px-2 py-0.5 text-base transition can-focus',
          playing === 'word' ? 'text-text-accent' : 'text-text-primary hover:text-text-accent'
        )}
      >
        {phoneme.word}
      </button>
    </div>
  )
}
