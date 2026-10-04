// Word note editing (word list / today / study card): loads the note by dictId and writes each
// edit to the local DB. Empty string clears the note. No debounce — local upserts are cheap.
import { useCallback, useEffect, useState } from 'react'
import * as wordbook from '@/wordbook'

export function useWordNote(dictId: number | null): {
  note: string
  update: (v: string) => void
} {
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    if (dictId == null) {
      setNote('')
      return
    }
    void wordbook.getNote(dictId).then((n) => {
      if (alive) setNote(n ?? '')
    })
    return () => {
      alive = false
    }
  }, [dictId])

  const update = useCallback(
    (v: string): void => {
      setNote(v)
      if (dictId == null) return
      void (v.trim() ? wordbook.setNote(dictId, v) : wordbook.clearNote(dictId))
    },
    [dictId],
  )

  return { note, update }
}
