import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Highlighted } from '@/components/word/Highlighted'
import * as practice from '@/practice'
import { markWords } from '../../../../shared/story'

const VERDICT: Record<practice.StoredSentence['verdict'], { label: string; className: string }> = {
  natural: { label: 'Natural', className: 'text-text-success' },
  understandable: { label: 'Almost', className: 'text-text-warning' },
  off: { label: 'Not quite', className: 'text-text-danger' },
}

/** Word card: the sentences you wrote with this word in Write back, with the more natural version when there was one. */
export function MySentences({ dictId, term }: { dictId: number; term: string }): React.JSX.Element | null {
  const [items, setItems] = useState<practice.StoredSentence[]>([])
  useEffect(() => {
    let alive = true
    void practice.sentencesOf(dictId).then((s) => alive && setItems(s))
    return () => {
      alive = false
    }
  }, [dictId])
  if (items.length === 0) return null

  const remove = (id: number): void => {
    setItems((s) => s.filter((x) => x.id !== id))
    void practice.deleteSentence(id)
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-sm font-semibold text-text-primary">My sentences</h3>
      <ul className="flex flex-col gap-3">
        {items.map((s) => (
          <li key={s.id} className="group flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <Highlighted text={markWords(s.text, [term])} className="block text-base leading-relaxed text-text-primary" />
              {s.better && (
                <p className="text-sm leading-relaxed text-text-secondary">
                  <span className="text-text-muted">More natural: </span>
                  {s.better}
                </p>
              )}
              <p className={cn('text-[11px] font-semibold', VERDICT[s.verdict].className)}>
                {VERDICT[s.verdict].label}
                <span className="font-normal text-text-muted"> · {new Date(s.createdAt).toLocaleDateString()}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label="Delete sentence"
              onClick={() => remove(s.id)}
              className="rounded-md p-1 text-text-muted opacity-0 transition-opacity hover:text-text-danger focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
