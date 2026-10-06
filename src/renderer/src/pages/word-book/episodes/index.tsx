import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui'
import { openSettingsDialog, settingsDialogStore } from '@/app'
import * as dict from '@/dict'
import * as episodes from '@/episodes'
import { toast } from '@/lib/toast'
import type { StoryLevel } from '../../../../../shared/story'
import { StoryReader } from '../story/StoryReader'
import { EpisodeQuiz } from './EpisodeQuiz'
import { SeasonHome } from './SeasonHome'
import { SeasonPicker } from './SeasonPicker'

/**
 * Daily Episodes: a serialized AI story, one episode per day written with your words. Opening the page writes
 * today's episode if needed; read it, take the short quiz and the page is yours. Miss the day and it is lost.
 */
type Mode =
  | { kind: 'home' }
  | { kind: 'read'; episode: episodes.StoredEpisode; quiz: episodes.QuizItem[] | null }
  | { kind: 'done'; episode: episodes.StoredEpisode; correct: number; total: number; counted: boolean }

const errorText = (e: unknown): string => (e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(e))

export default function EpisodesPage(): React.JSX.Element {
  const [view, setView] = useState<episodes.SeasonView | null | undefined>(undefined)
  const [mode, setMode] = useState<Mode>({ kind: 'home' })
  const [picking, setPicking] = useState(false)
  const [starting, setStarting] = useState(false)
  const [writing, setWriting] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [aiOk, setAiOk] = useState<boolean | null>(null)
  const autoWrote = useRef(false)

  const settingsOpen = useSyncExternalStore(settingsDialogStore.subscribe, settingsDialogStore.getSnapshot)
  useEffect(() => {
    if (!settingsOpen) void dict.aiReady().then(setAiOk)
  }, [settingsOpen])

  const reload = useCallback(async () => setView(await episodes.loadSeason()), [])
  useEffect(() => void reload(), [reload])

  const write = useCallback(async () => {
    setWriting(true)
    setWriteError(null)
    try {
      await episodes.ensureTodayEpisode()
    } catch (e) {
      setWriteError(errorText(e))
    } finally {
      setWriting(false)
      await reload()
    }
  }, [reload])

  // Opening the page writes today's episode once, if it isn't there yet.
  useEffect(() => {
    if (!view || autoWrote.current || !aiOk || view.todayNumber == null || view.episodes.has(view.todayNumber)) return
    autoWrote.current = true
    void write()
  }, [view, aiOk, write])

  const start = async (genre: episodes.Genre, level: StoryLevel): Promise<void> => {
    setStarting(true)
    try {
      await episodes.startSeason(genre, level)
      setPicking(false)
      autoWrote.current = false
      await reload()
    } catch (e) {
      toast.error(errorText(e))
    } finally {
      setStarting(false)
    }
  }

  const open = async (episode: episodes.StoredEpisode): Promise<void> => {
    const isToday = view?.todayNumber === episode.number && episode.readAt == null
    setMode({ kind: 'read', episode, quiz: isToday ? await episodes.quizFor(episode) : null })
    document.querySelector('main')?.scrollTo({ top: 0 })
  }

  const [finishing, setFinishing] = useState(false)
  const finish = async (episode: episodes.StoredEpisode, correct: number, total: number): Promise<void> => {
    if (finishing) return
    setFinishing(true)
    const counted = await episodes.finishEpisode(episode.number, { correct, total }).finally(() => setFinishing(false))
    setMode({ kind: 'done', episode, correct, total, counted })
    await reload()
  }

  const segments = ['Play', 'Daily episodes']

  if (aiOk === false && !view) {
    return (
      <>
        <TopBar segments={segments} />
        <div className="mx-auto max-w-xl px-8 pt-20 text-center">
          <KeyRound className="mx-auto size-6 text-text-muted" />
          <p className="mt-4 text-lg font-semibold text-text-primary">Episodes need an AI service</p>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in with your ChatGPT account in Settings → AI, or use the free models.
          </p>
          <Button className="mt-6" onClick={openSettingsDialog}>
            Open Settings
          </Button>
        </div>
      </>
    )
  }

  if (view === undefined) return <TopBar segments={segments} />

  if (view === null || picking) {
    return (
      <>
        <TopBar segments={segments} />
        <SeasonPicker busy={starting} again={!!view} onStart={(g, l) => void start(g, l)} />
      </>
    )
  }

  if (mode.kind === 'read') {
    const { episode, quiz } = mode
    return (
      <>
        <TopBar segments={[...segments, `Episode ${episode.number}`]} />
        <style>{STAMP_FX}</style>
        <div className="mx-auto w-full max-w-3xl space-y-6 px-8 pb-16 pt-8">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setMode({ kind: 'home' })}>
            <ArrowLeft className="size-4" />
            Season
          </Button>
          <StoryReader story={episode.episode} eyebrow={`Episode ${episode.number} · ${view.season.bible.title}`} />
          {quiz && quiz.length > 0 ? (
            <EpisodeQuiz items={quiz} onDone={(c, t) => void finish(episode, c, t)} />
          ) : quiz ? (
            <Button variant="brand" size="lg" disabled={finishing} onClick={() => void finish(episode, 0, 0)}>
              I read it
            </Button>
          ) : null}
        </div>
      </>
    )
  }

  if (mode.kind === 'done') {
    const { episode, correct, total, counted } = mode
    return (
      <>
        <TopBar segments={segments} />
        <style>{STAMP_FX}</style>
        <div className="mx-auto flex max-w-xl flex-col items-center px-8 pt-16 text-center">
          <div className="envi-stamp grid size-28 place-items-center rounded-[8px] border-4 border-fill-brand text-fill-brand">
            <span className="text-3xl font-bold tabular-nums">{episode.number}</span>
          </div>
          <p className="mt-6 text-2xl font-semibold tracking-tight text-text-primary">
            {counted ? `Episode ${episode.number} is yours` : 'Read again'}
          </p>
          {total > 0 && (
            <p className="mt-2 text-sm text-text-secondary">
              {correct} of {total} right{counted ? ` · +${episodes.EPISODE_XP + correct * 5} XP` : ''}
            </p>
          )}
          {episode.episode.teaser && (
            <p className="mt-8 text-lg text-text-primary">
              Next time: <span className="marker">{episode.episode.teaser}</span>
            </p>
          )}
          <Button className="mt-10" onClick={() => setMode({ kind: 'home' })}>
            Back to the season
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar segments={segments} />
      <SeasonHome
        view={view}
        writing={writing}
        writeError={writeError}
        onWrite={() => void write()}
        onOpen={(e) => void open(e)}
        onNewSeason={() => setPicking(true)}
      />
    </>
  )
}

const STAMP_FX = `
@keyframes envi-stamp { 0% { opacity: 0; transform: scale(2.2) rotate(-18deg) } 60% { opacity: 1; transform: scale(.92) rotate(-6deg) } 100% { transform: scale(1) rotate(-8deg) } }
.envi-stamp { animation: envi-stamp 520ms cubic-bezier(.16,1,.3,1) both; transform: rotate(-8deg) }
@keyframes envi-shake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-6px) } 50% { transform: translateX(5px) } 75% { transform: translateX(-3px) } }
.envi-shake { animation: envi-shake 360ms ease-in-out }
@media (prefers-reduced-motion: reduce) { .envi-stamp, .envi-shake { animation: none } }
`
