import { useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, PenLine } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button, Card } from '@/components/ui'
import { openSettingsDialog, settingsDialogStore } from '@/app'
import { WriteBack } from '@/components/practice/WriteBack'
import * as dict from '@/dict'
import * as practice from '@/practice'
import { appBridge } from '@/platform'

/** Write back on its own page (Play): a situation for two of your words (due first), one after another. */
export default function WriteBackPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [ready, setReady] = useState<boolean | null>(null)
  const [words, setWords] = useState<practice.PracticeWord[] | null>(null)
  const [round, setRound] = useState(0)
  const [done, setDone] = useState<number | null>(null)

  const settingsOpen = useSyncExternalStore(settingsDialogStore.subscribe, settingsDialogStore.getSnapshot)
  useEffect(() => {
    if (settingsOpen) return
    let alive = true
    void dict.aiReady().then((v) => alive && setReady(v))
    return () => {
      alive = false
    }
  }, [settingsOpen])

  useEffect(() => {
    let alive = true
    setWords(null)
    setDone(null)
    void practice.practiceRound(2).then((w) => alive && setWords(w))
    return () => {
      alive = false
    }
  }, [round])

  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['Play', 'Write back']} backTo="/wordbook/play" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-8 pb-16 pt-8 lg:px-10">
          <header className="mb-6 space-y-1.5">
            <h1 className="font-serif text-3xl font-bold text-text-primary">Write back</h1>
            <p className="text-sm text-text-secondary">
              Use your words in a real situation and see how natural it sounds. Each word counts as a review.
            </p>
          </header>

          {ready === false ? (
            <Card className="flex flex-col items-center gap-4 px-8 py-12 text-center">
              <KeyRound className="size-6 text-text-muted" />
              <p className="max-w-sm text-sm text-text-secondary">Write back needs an AI service. Lượm (Free) needs nothing to set up.</p>
              <Button onClick={openSettingsDialog}>Open Settings</Button>
            </Card>
          ) : words !== null && words.length === 0 ? (
            <Card className="px-8 py-12 text-center text-sm text-text-secondary">
              Add a few words with a Vietnamese meaning to My words first.
            </Card>
          ) : done !== null ? (
            <Card className="flex flex-col items-center gap-4 px-8 py-12 text-center">
              <PenLine className="size-6 text-text-accent" />
              <p className="font-serif text-xl font-bold text-text-primary">Nicely written.</p>
              <p className="text-sm text-text-secondary">
                {done === 0 ? 'Your sentences are kept on the word cards.' : `${done} ${done === 1 ? 'word' : 'words'} reviewed. Your sentences are kept on the word cards.`}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate('/wordbook/play')}>
                  Back to Play
                </Button>
                <Button onClick={() => setRound((r) => r + 1)}>Another situation</Button>
              </div>
            </Card>
          ) : words && ready ? (
            <Card className="py-4">
              <WriteBack
                key={round}
                words={words}
                onDone={({ practised }) => {
                  void appBridge.wordsChanged()
                  setDone(practised)
                }}
              />
            </Card>
          ) : (
            <p className="text-sm text-text-muted">Loading…</p>
          )}
        </div>
      </div>
    </div>
  )
}
