import { useEffect, useState } from 'react'
import { Eye, EyeOff, Languages, PenLine } from 'lucide-react'
import { Badge, Button, Card, Popover, PopoverAnchor, PopoverContent } from '@/components/ui'
import { Highlighted } from '@/components/word/Highlighted'
import { SpeakerIcon } from '@/components/common/SpeakerIcon'
import * as dict from '@/dict'
import * as wordbook from '@/wordbook'
import { playAudioUrl } from '@/lib/audio'
import { cn } from '@/lib/cn'
import { speechUrl } from '../../../../../shared/speech'
import { plainText, requestedWordFor, type Story } from '../../../../../shared/story'

/** A clicked highlighted word: the term to look up and where to anchor the popover (relative to the article). */
interface Picked {
  term: string
  form: string
  x: number
  y: number
}

export function StoryReader({
  story,
  onNew,
  eyebrow,
}: {
  story: Story
  /** "New story" button; omitted for Daily Episodes. */
  onNew?: () => void
  /** Small line above the title (e.g. "Episode 5 · The Night Market Letters"). */
  eyebrow?: string
}): React.JSX.Element {
  // Vietnamese hidden by default so the learner tries first; reveal all or per paragraph.
  const [showAll, setShowAll] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [picked, setPicked] = useState<Picked | null>(null)

  // A new story starts hidden again.
  useEffect(() => {
    setShowAll(false)
    setRevealed(new Set())
    setPicked(null)
  }, [story])

  const toggleOne = (i: number): void =>
    setRevealed((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const onArticleClick = (e: React.MouseEvent<HTMLElement>): void => {
    const el = (e.target as HTMLElement).closest('strong')
    if (!el) return
    const form = el.textContent ?? ''
    if (!form.trim()) return
    const box = e.currentTarget.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setPicked({ term: requestedWordFor(form, story.usedWords), form, x: r.left - box.left + r.width / 2, y: r.bottom - box.top })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-accent">{eyebrow}</p>}
            <h1 className="text-2xl font-medium leading-tight text-text-primary">{story.title}</h1>
          </div>
          {onNew && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={onNew}>
              <PenLine className="size-3.5" />
              New story
            </Button>
          )}
        </div>
        {story.usedWords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-text-muted">Your words</span>
            {story.usedWords.map((w) => (
              <Badge key={w} variant="accent">
                {w}
              </Badge>
            ))}
          </div>
        )}
      </header>

      <Card className="relative p-0">
        <div className="flex items-center justify-between gap-3 px-6 pb-1 pt-4">
          <p className="text-xs text-text-muted">Tap a highlighted word for its meaning.</p>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setShowAll((v) => !v)
              setRevealed(new Set())
            }}
          >
            {showAll ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showAll ? 'Hide Vietnamese' : 'Show Vietnamese'}
          </Button>
        </div>

        <article
          className="relative px-3 pb-4"
          onClick={onArticleClick}
        >
          {story.paragraphs.map((p, i) => {
            const shown = showAll || revealed.has(i)
            return (
              <Paragraph key={i} en={p.en} vi={p.vi} shown={shown} onToggle={() => toggleOne(i)} showToggle={!showAll} />
            )
          })}

          <Popover open={picked !== null} onOpenChange={(o) => !o && setPicked(null)}>
            <PopoverAnchor asChild>
              <span
                aria-hidden
                className="pointer-events-none absolute size-0"
                style={picked ? { left: picked.x, top: picked.y } : undefined}
              />
            </PopoverAnchor>
            <PopoverContent side="bottom" className="w-72">
              {picked && <WordMeaning term={picked.term} form={picked.form} />}
            </PopoverContent>
          </Popover>
        </article>
      </Card>
    </div>
  )
}

function Paragraph({
  en,
  vi,
  shown,
  showToggle,
  onToggle,
}: {
  en: string
  vi: string
  shown: boolean
  showToggle: boolean
  onToggle: () => void
}): React.JSX.Element {
  const url = speechUrl(plainText(en), 'us')
  return (
    <div className="group flex gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-bg-200">
      <Button
        variant="ghost"
        size="iconSm"
        className="mt-0.5 shrink-0 text-text-muted"
        aria-label="Read paragraph aloud"
        onClick={(e) => {
          e.stopPropagation()
          void playAudioUrl(url)
        }}
      >
        <SpeakerIcon url={url} className="size-4" />
      </Button>
      <div className="min-w-0 flex-1 space-y-2">
        <p
          className={cn(
            'text-[17px] leading-[1.75] text-text-primary',
            '[&_strong]:cursor-pointer [&_strong]:rounded-[4px] [&_strong]:bg-bg-accent-chip [&_strong]:px-1 [&_strong]:py-px',
            '[&_strong]:text-text-accent [&_strong]:transition-colors [&_strong:hover]:bg-fill-accent [&_strong:hover]:text-white',
          )}
        >
          <Highlighted text={en} />
        </p>
        {shown ? (
          <p className="anim-pop border-l-2 border-border-300 pl-3 text-[15px] leading-relaxed text-text-secondary">
            {vi}
          </p>
        ) : null}
        {showToggle && vi && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
          >
            <Languages className="size-3.5" />
            {shown ? 'Hide Vietnamese' : 'Show Vietnamese'}
          </button>
        )}
      </div>
    </div>
  )
}

type MeaningState =
  | { kind: 'loading' }
  | { kind: 'hit'; senses: string[]; audioUrl: string | null }
  | { kind: 'miss' }

/** Small dictionary card for a clicked story word. */
function WordMeaning({ term, form }: { term: string; form: string }): React.JSX.Element {
  const [state, setState] = useState<MeaningState>({ kind: 'loading' })

  useEffect(() => {
    let alive = true
    setState({ kind: 'loading' })
    void dict
      .lookup(term)
      .then((res) => {
        if (!alive) return
        if (res.status !== 'hit') return setState({ kind: 'miss' })
        const word = wordbook.wordFromDictRow(res.row, null)
        setState({ kind: 'hit', senses: word.simpleSenses, audioUrl: res.row.usAudioUrl ?? res.row.audioUrl ?? null })
      })
      .catch(() => alive && setState({ kind: 'miss' }))
    return () => {
      alive = false
    }
  }, [term])

  const showForm = form.trim().toLowerCase() !== term.toLowerCase()
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-text-primary">{term}</span>
        {showForm && <span className="text-xs text-text-muted">({form.trim()})</span>}
        {state.kind === 'hit' && state.audioUrl && (
          <Button
            variant="ghost"
            size="iconXs"
            className="ml-auto text-text-muted"
            aria-label={`Pronounce ${term}`}
            onClick={() => void playAudioUrl(state.audioUrl!)}
          >
            <SpeakerIcon url={state.audioUrl} className="size-3.5" />
          </Button>
        )}
      </div>
      {state.kind === 'loading' && <p className="text-sm text-text-muted">Looking up…</p>}
      {state.kind === 'miss' && <p className="text-sm text-text-muted">No dictionary entry found.</p>}
      {state.kind === 'hit' &&
        (state.senses.length > 0 ? (
          <ul className="space-y-1">
            {state.senses.slice(0, 4).map((s, i) => (
              <li key={i} className="text-sm leading-snug text-text-secondary">
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">No meaning saved for this word.</p>
        ))}
    </div>
  )
}
