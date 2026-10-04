import { useEffect, useRef, useState } from 'react'
import { BookOpenText, Plus, Shuffle, Sparkles, X } from 'lucide-react'
import { Button, Card, ToggleGroup, ToggleGroupItem } from '@/components/ui'
import * as wordbook from '@/wordbook'
import { cn } from '@/lib/cn'
import { pickStoryWords, type StoryLevel } from '../../../../../shared/story'

/** Words pre-selected / kept per story. */
const MAX_WORDS = 8

const LEVELS: { value: StoryLevel; hint: string }[] = [
  { value: 'A2', hint: 'Simple' },
  { value: 'B1', hint: 'Everyday' },
  { value: 'B2', hint: 'Richer' },
]

const THEMES = ['Daily life', 'Work', 'Travel', 'Food', 'Animals', 'Funny']

const WRITING_MESSAGES = [
  'Writing your story…',
  'Weaving your words into the plot…',
  'Polishing the Vietnamese translation…',
]

function shuffled<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Candidates {
  today: string[]
  due: string[]
  pool: string[]
}

async function loadCandidates(): Promise<Candidates> {
  const [today, due, pool] = await Promise.all([
    wordbook.todaySegments().catch(() => ({ learned: [], reviewed: [] })),
    wordbook.listSegment('due', { limit: 40 }).catch(() => []),
    wordbook.quizPool(60).catch(() => []),
  ])
  const terms = (rows: { term: string | null }[]): string[] => rows.map((r) => r.term ?? '').filter(Boolean)
  return {
    today: terms([...today.learned, ...today.reviewed]),
    due: terms(due),
    pool: pool.map((p) => p.term),
  }
}

export function StoryComposer({
  busy,
  disabled,
  onWrite,
  onCancel,
}: {
  busy: boolean
  /** Key state still unknown. */
  disabled: boolean
  onWrite: (words: string[], level: StoryLevel, theme: string | undefined) => void
  /** Back to the current story (only when there is one). */
  onCancel?: () => void
}): React.JSX.Element {
  const [candidates, setCandidates] = useState<Candidates | null>(null)
  const [words, setWords] = useState<string[]>([])
  const [level, setLevel] = useState<StoryLevel>('B1')
  const [theme, setTheme] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void loadCandidates().then((c) => {
      if (!alive) return
      setCandidates(c)
      setWords(pickStoryWords([c.today, c.due, shuffled(c.pool)], MAX_WORDS))
    })
    return () => {
      alive = false
    }
  }, [])

  const reshuffle = (): void => {
    if (!candidates) return
    // Keep the priority (today → due → others) but vary which words of each group come up.
    setWords(
      pickStoryWords(
        [shuffled(candidates.today).slice(0, 3), shuffled(candidates.due).slice(0, 3), shuffled(candidates.pool)],
        MAX_WORDS,
      ),
    )
  }

  const addDraft = (): void => {
    const next = pickStoryWords([words, [draft]], MAX_WORDS)
    setWords(next)
    setDraft('')
  }

  const remove = (w: string): void => setWords((ws) => ws.filter((x) => x !== w))
  const totalCandidates = candidates ? candidates.today.length + candidates.due.length + candidates.pool.length : 0

  // Rotate the loading message while the model writes.
  const [msgIndex, setMsgIndex] = useState(0)
  useEffect(() => {
    if (!busy) return
    setMsgIndex(0)
    const t = window.setInterval(() => setMsgIndex((i) => (i + 1) % WRITING_MESSAGES.length), 2600)
    return () => window.clearInterval(t)
  }, [busy])

  if (busy) {
    return (
      <Card className="flex flex-col items-center gap-4 px-8 py-20 text-center">
        <span className="grid size-14 animate-pulse place-items-center rounded-card bg-bg-accent-chip text-text-accent">
          <Sparkles className="size-6" />
        </span>
        <div className="space-y-1">
          <p className="text-lg font-medium text-text-primary">{WRITING_MESSAGES[msgIndex]}</p>
          <p className="text-sm text-text-secondary">A short {level} story with {words.length} of your words. Free models can take a minute or two.</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-card bg-bg-neutral text-text-primary">
          <BookOpenText className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-medium leading-tight text-text-primary">Story time</h1>
          <p className="mt-1 text-sm text-text-secondary">
            AI writes a short story with your words. Read it, guess the meanings, then check the Vietnamese.
          </p>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Back to story
          </Button>
        )}
      </header>

      <Card className="space-y-6 p-6">
        {/* Words */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-text-primary">
              Your words <span className="font-normal text-text-muted">· {words.length}/{MAX_WORDS}</span>
            </h2>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={reshuffle}
              disabled={!candidates || totalCandidates === 0}
            >
              <Shuffle className="size-3.5" />
              Shuffle
            </Button>
          </div>
          <div className="flex min-h-9 flex-wrap items-center gap-2">
            {candidates === null ? (
              <span className="text-sm text-text-muted">Loading your words…</span>
            ) : (
              <>
                {words.map((w) => (
                  <span
                    key={w}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-bg-neutral-chip pl-3 pr-1 text-sm font-medium text-text-primary"
                  >
                    {w}
                    <button
                      type="button"
                      onClick={() => remove(w)}
                      aria-label={`Remove ${w}`}
                      className="grid size-6 place-items-center rounded-full text-text-muted transition-colors hover:bg-bg-300 hover:text-text-primary"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                {words.length < MAX_WORDS && (
                  <form
                    className="inline-flex h-8 items-center rounded-full border-[0.5px] border-dashed border-border-300 pl-3 pr-1 focus-within:border-border-200"
                    onSubmit={(e) => {
                      e.preventDefault()
                      addDraft()
                    }}
                  >
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Add a word"
                      className="w-24 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                    />
                    <button
                      type="submit"
                      aria-label="Add word"
                      disabled={!draft.trim()}
                      className="grid size-6 place-items-center rounded-full text-text-muted transition-colors hover:bg-bg-300 hover:text-text-primary disabled:opacity-40"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
          {candidates !== null && totalCandidates === 0 && words.length === 0 && (
            <p className="text-sm text-text-muted">
              No saved words yet. Add a few above, or save words from lookups and books first.
            </p>
          )}
        </section>

        {/* Level */}
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-text-primary">Level</h2>
          <ToggleGroup value={level} onValueChange={(v) => setLevel(v as StoryLevel)} aria-label="Story level">
            {LEVELS.map((l) => (
              <ToggleGroupItem key={l.value} value={l.value} className="gap-1.5 px-4">
                <span className="font-semibold">{l.value}</span>
                <span className="text-text-muted">{l.hint}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        {/* Theme */}
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Theme <span className="font-normal text-text-muted">· optional</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => {
              const active = theme === t
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme(active ? null : t)}
                  className={cn(
                    'btn-squish h-8 rounded-full px-3.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-fill-primary text-on-primary'
                      : 'border-[0.5px] border-border-200 text-text-secondary hover:bg-bg-300 hover:text-text-primary',
                  )}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-1">
          {words.length === 0 && candidates !== null && (
            <span className="text-sm text-text-muted">Pick at least one word</span>
          )}
          <Button
            size="lg"
            className="gap-2"
            disabled={disabled || words.length === 0}
            onClick={() => onWrite(words, level, theme ?? undefined)}
          >
            <Sparkles className="size-4" />
            Write my story
          </Button>
        </div>
      </Card>
    </div>
  )
}
