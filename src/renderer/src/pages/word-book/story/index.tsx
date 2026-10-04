import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { KeyRound } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button, Card } from '@/components/ui'
import { openSettingsDialog, settingsDialogStore } from '@/app'
import * as dict from '@/dict'
import { getSettings } from '@/settings'
import { toast } from '@/lib/toast'
import { storyBridge } from '@/platform'
import { parseSavedStory, type Story, type StoryLevel } from '../../../../../shared/story'
import { StoryComposer } from './StoryComposer'
import { StoryReader } from './StoryReader'

/**
 * Story mode: pick a few of your words (today's / due first), Claude writes a short level-appropriate story with
 * them; read it with the words highlighted, reveal the Vietnamese per paragraph and listen paragraph by paragraph.
 * The last story is kept in localStorage so reopening the page shows it again.
 */

const STORAGE_KEY = 'envi.story.last'

function loadSaved(): Story | null {
  try {
    return parseSavedStory(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function save(story: Story): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(story))
  } catch {
    // storage unavailable: the story just isn't remembered
  }
}

export default function StoryPage(): React.JSX.Element {
  const [story, setStory] = useState<Story | null>(loadSaved)
  const [composing, setComposing] = useState(story === null)
  const [busy, setBusy] = useState(false)
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  // Re-check the key on mount and whenever the Settings dialog closes (the learner may just have added it).
  const settingsOpen = useSyncExternalStore(settingsDialogStore.subscribe, settingsDialogStore.getSnapshot)
  useEffect(() => {
    if (settingsOpen) return
    let alive = true
    void dict.hasAiKey().then((v) => alive && setHasKey(v))
    return () => {
      alive = false
    }
  }, [settingsOpen])

  const write = useCallback(async (words: string[], level: StoryLevel, theme: string | undefined) => {
    setBusy(true)
    try {
      const { aiModel } = await getSettings()
      const next = await storyBridge.generate({ words, level, theme, model: aiModel })
      save(next)
      setStory(next)
      setComposing(false)
    } catch (e) {
      // IPC errors arrive as "Error invoking remote method 'story:generate': Error: <message>".
      const msg = e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : ''
      toast.error(msg || 'Could not write a story. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TopBar segments={['My words', 'Story']} backTo="/wordbook" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-8 pb-16 pt-8 lg:px-10">
          {story && !composing ? (
            <StoryReader story={story} onNew={() => setComposing(true)} />
          ) : hasKey === false ? (
            <NoKeyCard />
          ) : (
            <StoryComposer
              busy={busy}
              disabled={hasKey !== true}
              onWrite={write}
              onCancel={story ? () => setComposing(false) : undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function NoKeyCard(): React.JSX.Element {
  return (
    <Card className="flex flex-col items-center gap-4 px-8 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-card bg-bg-neutral text-text-secondary">
        <KeyRound className="size-6" />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="text-xl font-medium text-text-primary">Story mode needs an Anthropic key</h2>
        <p className="text-sm text-text-secondary">
          Claude writes a short story with the words you are learning, plus a Vietnamese translation. Add your
          Anthropic API key in Settings → AI to start. It stays encrypted on this Mac.
        </p>
      </div>
      <Button onClick={openSettingsDialog}>Open Settings</Button>
    </Card>
  )
}
