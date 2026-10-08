import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Database,
  Keyboard,
  Library,
  Loader2,
  Compass,
  Monitor,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui'
import { useTheme } from '@/hooks/useTheme'
import type { ThemePreference } from '@/lib/theme'
import { toast } from '@/lib/toast'
import { useSettings } from '@/hooks/useSettings'
import { aiConfigFrom, FLASH_EVERY_MINUTES, FLASH_WORD_COUNTS, updateSettings } from '@/settings'
import type { Settings } from '@/settings'
import { aiBridge, appBridge, updateBridge } from '@/platform'
import type { UpdateState } from '../../../../shared/update'
import { acceleratorFromKey, prettyAccelerator } from '@/app/shortcut'
import * as wordbook from '@/wordbook'
import { settingsDialogStore } from '@/app/settingsStore'
import { ModeCard } from './ModeCard'
import { LUOM_MODELS, normalizeBaseUrl, type AiConfig, type AiModelOption, type AiStatus } from '../../../../shared/ai'

/**
 * Settings dialog sections. Each section reads settings once (useSettings) and writes through on change
 * (updateSettings), so changes apply immediately everywhere.
 */

/** One row: title + description on the left, control on the right. */
function SettingRow({
  title,
  desc,
  children,
}: {
  title: string
  desc?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-7 py-3">
      <div className="min-w-0">
        <div className="text-sm text-text-100">{title}</div>
        {desc && <div className="mt-0.5 text-[13px] leading-snug text-text-muted">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-3 text-[15px] font-semibold leading-5 text-text-100">{title}</h3>
      <div className="divide-y divide-alpha-1">{children}</div>
    </section>
  )
}

function SectionLoading({ title }: { title: string }): React.JSX.Element {
  return (
    <SectionShell title={title}>
      <p className="py-3 text-sm text-text-muted">Loading…</p>
    </SectionShell>
  )
}

/** Local draft of the settings: optimistic UI + write-through. null = not loaded yet. */
function useSettingsDraft(): [Settings | null, (p: Partial<Settings>) => void, (p: Partial<Settings>) => void] {
  const loaded = useSettings()
  const [draft, setDraft] = useState<Settings | null>(null)
  useEffect(() => {
    if (loaded) setDraft(loaded)
  }, [loaded])

  const patchLocal = (p: Partial<Settings>): void => setDraft((d) => (d ? { ...d, ...p } : d))
  const patch = (p: Partial<Settings>): void => {
    patchLocal(p)
    void updateSettings(p)
  }
  /** patch writes through; patchLocal only mirrors a change already saved elsewhere. */
  return [draft, patch, patchLocal]
}

// ────────────────── General ──────────────────

function GeneralSection(): React.JSX.Element {
  const [theme, setTheme] = useTheme()
  const [loginItem, setLoginItem] = useState<boolean | null>(null)
  useEffect(() => {
    void appBridge.getLoginItem().then(setLoginItem)
  }, [])

  return (
    <SectionShell title="General">
      <SettingRow title="Appearance">
        <ToggleGroup value={theme} onValueChange={(v) => v && setTheme(v as ThemePreference)}>
          <ToggleGroupItem value="system" className="aspect-square px-0" aria-label="Match system">
            <Monitor className="size-4" strokeWidth={2} />
          </ToggleGroupItem>
          <ToggleGroupItem value="light" className="aspect-square px-0" aria-label="Light">
            <Sun className="size-4" strokeWidth={2} />
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" className="aspect-square px-0" aria-label="Dark">
            <Moon className="size-4" strokeWidth={2} />
          </ToggleGroupItem>
        </ToggleGroup>
      </SettingRow>
      <SettingRow
        title="Open at login"
        desc="Start hidden in the menu bar when you log in, so reminders and the capture hotkey always work."
      >
        <Switch
          checked={loginItem ?? false}
          disabled={loginItem === null}
          onCheckedChange={(c) => void appBridge.setLoginItem(c).then(setLoginItem)}
        />
      </SettingRow>
    </SectionShell>
  )
}

// ────────────────── Learning style ──────────────────

const DAILY_GOALS = [10, 15, 20, 30, 50, 80] as const

function LearningStyleSection(): React.JSX.Element {
  const [draft, patch, patchLocal] = useSettingsDraft()
  const navigate = useNavigate()
  if (!draft) return <SectionLoading title="Learning style" />

  const choose = async (mode: wordbook.LearningMode): Promise<void> => {
    if (mode === draft.learningMode) return
    const info = wordbook.modeInfo(mode)
    try {
      await wordbook.applyLearningMode(mode)
      // Mirror the preset locally (applyLearningMode already wrote it).
      const p = info.preset
      patchLocal({
        learningMode: mode,
        flashEveryMinutes: p.flashEveryMinutes,
        reminderIntensity: p.reminderIntensity,
        newPerDay: p.newPerDay,
        dailyGoal: p.dailyGoal,
      })
      toast.success(`Switched to ${info.name}. Reminders and goal updated.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const runSetupAgain = async (): Promise<void> => {
    await updateSettings({ onboarded: 0 })
    settingsDialogStore.setOpen(false)
    navigate('/welcome')
  }

  // Keep the stored goal selectable even if it isn't one of the presets.
  const goals = DAILY_GOALS.includes(draft.dailyGoal as (typeof DAILY_GOALS)[number])
    ? DAILY_GOALS
    : [...DAILY_GOALS, draft.dailyGoal].sort((a, b) => a - b)

  return (
    <SectionShell title="Learning style">
      <div className="pb-3">
        <p className="mb-3 text-[13px] leading-snug text-text-muted">
          A starting point for how you practise, how often your words come back and your daily goal. Switching never resets your progress.
        </p>
        <div role="radiogroup" aria-label="Learning style" className="flex flex-col gap-2">
          {wordbook.LEARNING_MODES.map((m) => (
            <ModeCard key={m.id} mode={m} selected={draft.learningMode === m.id} onSelect={() => void choose(m.id)} />
          ))}
        </div>
      </div>
      <SettingRow title="Daily goal" desc="Cards to practise each day to keep your streak.">
        <Select value={String(draft.dailyGoal)} onValueChange={(v) => patch({ dailyGoal: Number(v) })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {goals.map((v) => (
              <SelectItem key={v} value={String(v)}>
                {v} cards
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="Follow-up reminders" desc="What happens after the daily reminder if you haven’t studied yet.">
        <Select
          value={draft.reminderIntensity}
          onValueChange={(v) => patch({ reminderIntensity: v as Settings['reminderIntensity'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="gentle">Gentle: daily only</SelectItem>
            <SelectItem value="regular">Regular: + one evening nudge</SelectItem>
            <SelectItem value="persistent">Persistent: every 2 hours until the goal is met</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="Setup" desc="Answer the first-run questions again to get a fresh recommendation.">
        <Button variant="secondary" size="sm" onClick={() => void runSetupAgain()}>
          <RotateCcw className="size-3.5" strokeWidth={2} />
          Run setup again
        </Button>
      </SettingRow>
    </SectionShell>
  )
}

// ────────────────── Reminders ──────────────────

function flashEveryLabel(minutes: Settings['flashEveryMinutes']): string {
  if (minutes === 0) return 'Off'
  if (minutes < 60) return `Every ${minutes} minutes`
  return minutes === 60 ? 'Every hour' : `Every ${minutes / 60} hours`
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const hourLabel = (h: number): string => `${String(h).padStart(2, '0')}:00`

function HourSelect({
  value,
  disabled,
  onChange,
}: {
  value: number
  disabled?: boolean
  onChange: (hour: number) => void
}): React.JSX.Element {
  return (
    <Select value={String(value)} disabled={disabled} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="max-h-72">
        {HOURS.map((h) => (
          <SelectItem key={h} value={String(h)}>
            {hourLabel(h)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RemindersSection(): React.JSX.Element {
  const [draft, patch] = useSettingsDraft()
  if (!draft) return <SectionLoading title="Reminders" />

  return (
    <SectionShell title="Reminders">
      <SettingRow title="Daily study reminder" desc="A notification with how many words are waiting for you.">
        <Switch checked={draft.reminderEnabled === 1} onCheckedChange={(c) => patch({ reminderEnabled: c ? 1 : 0 })} />
      </SettingRow>
      <SettingRow title="Reminder time" desc="If your Mac is asleep then, you are reminded when it wakes up.">
        <Input
          type="time"
          value={draft.reminderTime}
          disabled={draft.reminderEnabled !== 1}
          onChange={(e) => e.target.value && patch({ reminderTime: e.target.value })}
          className="w-28"
        />
      </SettingRow>
      <SettingRow
        title="Word flashes"
        desc={
          <>
            Bring back the words you are learning during your active hours, words due for review first. Your answer, or{' '}
            <b className="font-medium text-text-secondary">Got it</b> /{' '}
            <b className="font-medium text-text-secondary">Again</b> on a notification, counts as a review. They wait
            while you are away from your Mac.
          </>
        }
      >
        <Select
          value={String(draft.flashEveryMinutes)}
          onValueChange={(v) => patch({ flashEveryMinutes: Number(v) as Settings['flashEveryMinutes'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {FLASH_EVERY_MINUTES.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {flashEveryLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        title="Active hours"
        desc={
          draft.activeFrom === draft.activeUntil
            ? 'Word flashes can come at any hour.'
            : `Word flashes come only from ${hourLabel(draft.activeFrom)} until ${hourLabel(draft.activeUntil)}${
                draft.activeUntil < draft.activeFrom ? ' (past midnight)' : ''
              }.`
        }
      >
        <div className="flex items-center gap-2">
          <HourSelect value={draft.activeFrom} disabled={draft.flashEveryMinutes === 0} onChange={(h) => patch({ activeFrom: h })} />
          <span className="text-sm text-text-muted">to</span>
          <HourSelect value={draft.activeUntil} disabled={draft.flashEveryMinutes === 0} onChange={(h) => patch({ activeUntil: h })} />
        </div>
      </SettingRow>
      <SettingRow
        title="Word flash style"
        desc="A pop quiz card asks what the word means (remembering it yourself sticks better); a notification just shows it."
      >
        <Select
          value={draft.flashStyle}
          disabled={draft.flashEveryMinutes === 0}
          onValueChange={(v) => patch({ flashStyle: v as Settings['flashStyle'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="quiz">Pop quiz</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        title="Words per pop quiz"
        desc={
          draft.flashStyle === 'quiz'
            ? 'Asked one after another on the same card.'
            : 'Pop quiz only: a notification always shows one word.'
        }
      >
        <Select
          value={String(draft.flashWordCount)}
          disabled={draft.flashEveryMinutes === 0 || draft.flashStyle !== 'quiz'}
          onValueChange={(v) => patch({ flashWordCount: Number(v) as Settings['flashWordCount'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {FLASH_WORD_COUNTS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n === 1 ? '1 word' : `${n} words`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        title="After a pop quiz"
        desc="Use the round’s words in a sentence of your own and get feedback on how natural it sounds."
      >
        <Select
          value={draft.afterPopQuiz}
          disabled={draft.flashEveryMinutes === 0 || draft.flashStyle !== 'quiz'}
          onValueChange={(v) => patch({ afterPopQuiz: v as Settings['afterPopQuiz'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="ask">Ask me</SelectItem>
            <SelectItem value="always">Always practise</SelectItem>
            <SelectItem value="never">Never</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        title="Test"
        desc="Send a sample notification. If no banner appears, turn on banners or alerts for Lượm in System Settings."
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void appBridge.openNotificationSettings()}>
            Notification settings
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              void appBridge.notify({
                title: 'Lượm notifications are on',
                body: 'You will be reminded to review your words.',
                route: '/wordbook',
              })
            }
          >
            Send test
          </Button>
        </div>
      </SettingRow>
      <p className="py-3 text-[13px] leading-snug text-text-muted">
        Tip: set Lượm notifications to ‘Alerts’ in System Settings → Notifications to keep the buttons visible.
      </p>
    </SectionShell>
  )
}

// ────────────────── Quick capture ──────────────────

function ShortcutRecorder({ value, onChange }: { value: string; onChange: (acc: string) => void }): React.JSX.Element {
  const [recording, setRecording] = useState(false)
  useEffect(() => {
    if (!recording) return
    // Release the current hotkey while recording so pressing it is captured here instead of triggering it.
    void appBridge.setCaptureShortcut('')
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(false)
        void appBridge.setCaptureShortcut(value)
        return
      }
      const acc = acceleratorFromKey(e)
      if (!acc) return
      setRecording(false)
      void appBridge.setCaptureShortcut(acc).then((ok) => {
        if (ok) onChange(acc)
        else {
          toast.error(`${prettyAccelerator(acc)} is used by another app. Try a different combination.`)
          void appBridge.setCaptureShortcut(value)
        }
      })
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, value, onChange])

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" className="min-w-24 font-mono" onClick={() => setRecording((r) => !r)}>
        {recording ? 'Press keys…' : prettyAccelerator(value)}
      </Button>
      {value && !recording && (
        <Button variant="ghost" size="sm" onClick={() => onChange('')}>
          Clear
        </Button>
      )}
    </div>
  )
}

function CaptureSection(): React.JSX.Element {
  const [draft, patch] = useSettingsDraft()
  const [trusted, setTrusted] = useState<boolean | null>(null)
  useEffect(() => {
    const check = (): void => void appBridge.hasAccessibility(false).then(setTrusted)
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [])
  if (!draft) return <SectionLoading title="Quick capture" />

  return (
    <SectionShell title="Quick capture">
      <SettingRow
        title="Capture hotkey"
        desc="Select an English word in any app (Chrome, any profile or window) and press this to look it up and save it."
      >
        <ShortcutRecorder value={draft.captureShortcut} onChange={(acc) => patch({ captureShortcut: acc })} />
      </SettingRow>
      <SettingRow
        title="Read the selection automatically"
        desc={
          trusted
            ? 'Allowed. The hotkey copies your selection and then puts your clipboard back.'
            : 'Needs Accessibility permission. Without it, press ⌘C before the hotkey and the copied text is used.'
        }
      >
        {trusted ? (
          <span className="text-sm text-text-success">Enabled</span>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => void appBridge.hasAccessibility(true)}>
            Grant access…
          </Button>
        )}
      </SettingRow>
      <SettingRow title="Try it" desc="Open the capture window to type a word.">
        <Button variant="secondary" size="sm" onClick={() => void appBridge.openCapture('')}>
          Open capture
        </Button>
      </SettingRow>
    </SectionShell>
  )
}

// ────────────────── Study sessions ──────────────────

function LearningPreferences(): React.JSX.Element {
  const [draft, patch] = useSettingsDraft()
  if (!draft) return <SectionLoading title="Study sessions" />

  return (
    <SectionShell title="Study sessions">
      <p className="pb-3 text-[13px] leading-snug text-text-muted">
        Which words a study session brings and in what order. Your learning style sets a starting point; fine-tune it
        here.
      </p>
      <SettingRow title="New words per day" desc="How many new words enter your study queue each day.">
        <Select value={String(draft.newPerDay)} onValueChange={(v) => patch({ newPerDay: Number(v) })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {[5, 10, 20, 30, 50, 100].map((v) => (
              <SelectItem key={v} value={String(v)}>
                {v} / day
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="Reviews per day" desc="Maximum number of due words to review each day.">
        <Select value={String(draft.reviewsPerDay)} onValueChange={(v) => patch({ reviewsPerDay: Number(v) })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {[50, 100, 150, 200, 300, 400].map((v) => (
              <SelectItem key={v} value={String(v)}>
                {v} / day
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="Study order" desc="How new words and reviews are mixed in a session.">
        <Select
          value={draft.newReviewMix}
          onValueChange={(v) => patch({ newReviewMix: v as Settings['newReviewMix'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="mix">Mixed</SelectItem>
            <SelectItem value="newFirst">New words first</SelectItem>
            <SelectItem value="reviewFirst">Reviews first</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="New word order" desc="Which of your new words are picked each day.">
        <Select
          value={draft.newCardOrder}
          onValueChange={(v) => patch({ newCardOrder: v as Settings['newCardOrder'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="joinTime">Oldest added first</SelectItem>
            <SelectItem value="random">Random</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="Play pronunciation automatically" desc="Read each word aloud when it appears while studying.">
        <Switch checked={draft.autoPlayAudio === 1} onCheckedChange={(c) => patch({ autoPlayAudio: c ? 1 : 0 })} />
      </SettingRow>
    </SectionShell>
  )
}

// ────────────────── Word card ──────────────────

function WordCardPreferences(): React.JSX.Element {
  const [draft, patch] = useSettingsDraft()
  if (!draft) return <SectionLoading title="Word card" />

  return (
    <SectionShell title="Word card">
      <SettingRow title="Default meaning view" desc="What a word card shows first.">
        <Select
          value={draft.meaningSource}
          onValueChange={(v) => patch({ meaningSource: v as Settings['meaningSource'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="concise">Vietnamese meanings</SelectItem>
            <SelectItem value="collins">English definitions</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="Accent" desc="Phonetics and pronunciation accent.">
        <Select value={draft.accent} onValueChange={(v) => patch({ accent: v as Settings['accent'] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="us">American</SelectItem>
            <SelectItem value="uk">British</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SectionShell>
  )
}

// ────────────────── AI ──────────────────

/** Custom API key (encrypted in main): Save when empty, Remove when stored. */
function KeyRow({ onChange }: { onChange: () => void }): React.JSX.Element {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [keyInput, setKeyInput] = useState('')
  useEffect(() => {
    void aiBridge.hasKey().then(setHasKey)
  }, [])

  const save = async (key: string): Promise<void> => {
    try {
      await aiBridge.setKey(key)
      setHasKey(await aiBridge.hasKey())
      setKeyInput('')
      toast.success(key ? 'API key saved.' : 'API key removed.')
      onChange()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <SettingRow
      title="API key"
      desc={
        hasKey
          ? 'Saved encrypted on this Mac.'
          : 'Saved encrypted on this Mac. Leave it empty for a local server that needs no key.'
      }
    >
      {hasKey ? (
        <Button variant="secondary" size="sm" onClick={() => void save('')}>
          Remove key
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="password"
            placeholder="sk-…"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && keyInput.trim() && void save(keyInput)}
            className="w-44"
          />
          <Button size="sm" disabled={!keyInput.trim()} onClick={() => void save(keyInput)}>
            Save
          </Button>
        </div>
      )}
    </SettingRow>
  )
}

/** Text field that saves on Enter or when it loses focus (not on every keystroke). */
function CommitInput({
  value,
  onCommit,
  placeholder,
  className,
  autoFocus,
}: {
  value: string
  onCommit: (text: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}): React.JSX.Element {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const commit = (): void => {
    if (text.trim() !== value) onCommit(text.trim())
  }
  return (
    <Input
      value={text}
      placeholder={placeholder}
      spellCheck={false}
      autoFocus={autoFocus}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      className={className}
    />
  )
}

function BaseUrlRow({ value, onChange }: { value: string; onChange: (url: string) => void }): React.JSX.Element {
  const [error, setError] = useState<string | null>(null)
  return (
    <SettingRow
      title="API base URL"
      desc={error ?? 'Any OpenAI-compatible API, for example https://api.openai.com/v1 or a server on this Mac.'}
    >
      <CommitInput
        value={value}
        placeholder="https://api.openai.com/v1"
        className="w-64"
        onCommit={(text) => {
          const url = text ? normalizeBaseUrl(text) : ''
          setError(url === null ? 'That is not a web address (it starts with https:// or http://).' : null)
          if (url !== null) onChange(url)
        }}
      />
    </SettingRow>
  )
}

const TYPE_MODEL = '__type_a_model__'

/** Model of a Custom API: picked from its /models list, or typed when the list cannot be loaded. */
function CustomModelRow({
  cfg,
  value,
  onChange,
  reload,
}: {
  cfg: AiConfig
  value: string
  onChange: (id: string) => void
  /** Changes when the key changes, to load the list again. */
  reload: number
}): React.JSX.Element {
  const [models, setModels] = useState<AiModelOption[] | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    let alive = true
    setModels(null)
    setError(undefined)
    void aiBridge.models(cfg).then((r) => {
      if (!alive) return
      setModels(r.models)
      setError(r.error)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.baseUrl, reload])

  const listed = models?.some((m) => m.id === value) ?? false
  const typed = typing || (models !== null && models.length === 0)
  return (
    <SettingRow title="Model" desc={error ?? (models === null ? 'Loading the model list…' : undefined)}>
      {typed ? (
        <div className="flex items-center gap-2">
          {models && models.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setTyping(false)}>
              From list
            </Button>
          )}
          <CommitInput value={value} placeholder="Model name" className="w-52" autoFocus={typing} onCommit={onChange} />
        </div>
      ) : (
        <Select value={value} onValueChange={(v) => (v === TYPE_MODEL ? setTyping(true) : onChange(v))}>
          <SelectTrigger className="max-w-64">
            <SelectValue placeholder={models === null ? 'Loading…' : 'Choose a model'} />
          </SelectTrigger>
          <SelectContent align="end" className="max-h-80">
            {!listed && value && <SelectItem value={value}>{value}</SelectItem>}
            {(models ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
            <SelectItem value={TYPE_MODEL}>Type a name…</SelectItem>
          </SelectContent>
        </Select>
      )}
    </SettingRow>
  )
}

/**
 * ChatGPT account, one button. With Chrome installed it always signs in through Chrome (Google refuses its sign-in
 * inside app windows; Chrome works for Google, Apple and email alike): main/chatgptChrome.ts. Without Chrome, the
 * in-app window (email or Apple).
 */
function ChatGptAccountRow({ signedIn, onChange }: { signedIn: boolean; onChange: () => void }): React.JSX.Element {
  const [chrome, setChrome] = useState<boolean | null>(null)
  const [waiting, setWaiting] = useState(false)
  useEffect(() => {
    void aiBridge.chatGptChromeAvailable().then(setChrome)
  }, [])

  const signIn = async (): Promise<void> => {
    if (!chrome) {
      void aiBridge.chatGptSignIn()
      return
    }
    setWaiting(true)
    try {
      const res = await aiBridge.chatGptSignInChrome()
      if (res.ok) toast.success('Signed in to ChatGPT.')
      else if (res.reason === 'not-signed-in') toast.info(res.message)
      else if (res.reason !== 'cancelled') toast.error(res.message)
    } finally {
      setWaiting(false)
      onChange()
    }
  }

  if (signedIn)
    return (
      <SettingRow title="ChatGPT account" desc="Answers come from your account’s default model.">
        <Button variant="secondary" size="sm" onClick={() => void aiBridge.chatGptSignOut().then(onChange)}>
          Sign out
        </Button>
      </SettingRow>
    )
  if (waiting)
    return (
      <SettingRow
        title="Finish signing in in Chrome"
        desc={
          <span className="flex items-start gap-2">
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" />
            A Chrome window opened. Sign in to ChatGPT there, any way you like. When you see your chats, click Done.
          </span>
        }
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void aiBridge.chatGptChromeCancel()}>
            Cancel
          </Button>
          {/* Closed the window by mistake: open it again (the same sign-in goes on). */}
          <Button variant="secondary" size="sm" onClick={() => void aiBridge.chatGptSignInChrome()}>
            Show Chrome
          </Button>
          <Button size="sm" onClick={() => void aiBridge.chatGptChromeDone()}>
            Done
          </Button>
        </div>
      </SettingRow>
    )
  return (
    <SettingRow
      title="ChatGPT account"
      desc={
        chrome === false
          ? 'Sign in with your email or Apple. To use your Google account, install Google Chrome first.'
          : 'Opens Chrome so you can sign in with Google, Apple or email.'
      }
    >
      <Button size="sm" disabled={chrome === null} onClick={() => void signIn()}>
        Sign in to ChatGPT
      </Button>
    </SettingRow>
  )
}

function AiSection(): React.JSX.Element {
  const [draft, patch] = useSettingsDraft()
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [keyVersion, setKeyVersion] = useState(0)
  const cfg = draft ? aiConfigFrom(draft) : null
  const statusKey = cfg ? JSON.stringify(cfg) : ''
  const check = async (): Promise<void> => {
    if (!cfg) return
    setChecking(true)
    try {
      setStatus(await aiBridge.status(cfg))
    } finally {
      setChecking(false)
    }
  }
  useEffect(() => {
    void check()
    // Re-check after the user comes back from the ChatGPT sign-in window.
    const onFocus = (): void => void check()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey, keyVersion])
  if (!draft || !cfg) return <SectionLoading title="AI" />

  return (
    <SectionShell title="AI (optional)">
      <p className="pb-2 text-[13px] leading-relaxed text-text-muted">
        Writes “Improve with AI” entries, stories and Daily Episodes. Lượm (Free) works with nothing to set up.
      </p>
      <SettingRow title="Service" desc={status ? status.message : undefined}>
        <Select value={draft.aiProvider} onValueChange={(v) => patch({ aiProvider: v as Settings['aiProvider'] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="luom">Lượm (Free)</SelectItem>
            <SelectItem value="chatgpt-web">ChatGPT (your account)</SelectItem>
            <SelectItem value="custom">Custom API</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      {draft.aiProvider === 'luom' && (
        <SettingRow title="Model" desc={LUOM_MODELS.find((m) => m.id === draft.luomModel)?.hint}>
          <Select value={draft.luomModel} onValueChange={(v) => patch({ luomModel: v as Settings['luomModel'] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {LUOM_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.id === 'auto' ? `${m.name} (recommended)` : m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      )}

      {draft.aiProvider === 'chatgpt-web' && (
        <ChatGptAccountRow signedIn={!!status?.chatGptSignedIn} onChange={() => void check()} />
      )}

      {draft.aiProvider === 'custom' && (
        <>
          <BaseUrlRow value={draft.customBaseUrl} onChange={(url) => patch({ customBaseUrl: url })} />
          <KeyRow onChange={() => setKeyVersion((v) => v + 1)} />
          {draft.customBaseUrl && (
            <CustomModelRow
              cfg={cfg}
              value={draft.customModel}
              onChange={(id) => patch({ customModel: id })}
              reload={keyVersion}
            />
          )}
        </>
      )}

      <SettingRow
        title="Feedback language"
        desc="For Write back: the language your sentences are explained in. Corrections stay in English."
      >
        <Select value={draft.feedbackLanguage} onValueChange={(v) => patch({ feedbackLanguage: v as Settings['feedbackLanguage'] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="vi">Vietnamese</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SectionShell>
  )
}

// ────────────────── Reading ──────────────────

const FONT_SIZE_STEPS = [
  { value: 14, label: 'S' },
  { value: 16, label: 'M' },
  { value: 20, label: 'L' },
  { value: 24, label: 'XL' },
] as const

/** Snap a stored font size to the nearest step for display (never rewrites the stored value). */
function nearestFontSizeStep(v: number): number {
  return FONT_SIZE_STEPS.reduce((best, s) => (Math.abs(s.value - v) < Math.abs(best.value - v) ? s : best)).value
}

function ReadingSection(): React.JSX.Element {
  const [draft, patch] = useSettingsDraft()
  if (!draft) return <SectionLoading title="Reading" />

  return (
    <SectionShell title="Reading">
      <SettingRow title="Font" desc="Typeface for book text.">
        <ToggleGroup
          value={draft.readingFontFamily}
          onValueChange={(v) => v && patch({ readingFontFamily: v as Settings['readingFontFamily'] })}
        >
          <ToggleGroupItem value="serif" className="font-serif">
            Serif
          </ToggleGroupItem>
          <ToggleGroupItem value="sans" className="font-sans">
            Sans
          </ToggleGroupItem>
        </ToggleGroup>
      </SettingRow>
      <SettingRow title="Text size" desc="Size of book text.">
        <ToggleGroup
          value={String(nearestFontSizeStep(draft.readingFontSize))}
          onValueChange={(v) => v && patch({ readingFontSize: Number(v) })}
        >
          {FONT_SIZE_STEPS.map((s) => (
            <ToggleGroupItem key={s.value} value={String(s.value)}>
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SettingRow>
    </SectionShell>
  )
}

// ────────────────── Data & about ──────────────────

/** Trigger a file download in the renderer (Electron shows the save location in Downloads). */
function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function DataSection(): React.JSX.Element {
  const [exporting, setExporting] = useState(false)
  const exportCsv = async (): Promise<void> => {
    setExporting(true)
    try {
      download(
        `my-english-words-${new Date().toISOString().slice(0, 10)}.csv`,
        await wordbook.exportWordsCsv(),
        'text/csv',
      )
    } finally {
      setExporting(false)
    }
  }
  return (
    <SectionShell title="Data & about">
      <SettingRow title="Export my words" desc="A CSV file with every word, its Vietnamese meaning and learning state.">
        <Button variant="secondary" size="sm" disabled={exporting} onClick={() => void exportCsv()}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </SettingRow>
      <UpdateRow />
      <SettingRow title="Storage" desc="All your data stays on this Mac (no account, no cloud).">
        <span className="text-sm text-text-secondary">Local</span>
      </SettingRow>
      <div className="py-3 text-[13px] leading-relaxed text-text-muted">
        <p>Lượm {__APP_VERSION__}. Pick up English words wherever you find them and keep them, with Vietnamese.</p>
        <p className="mt-1">
          Dictionary data: Google Translate and the Free Dictionary API (Wiktionary, CC BY-SA). Pronunciation: Microsoft
          Edge neural voices. {wordbook.WORD_LIST_LICENSE}
        </p>
      </div>
    </SectionShell>
  )
}

/** Updates: current status from main + Check now / Restart to update. */
function UpdateRow(): React.JSX.Element {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })
  useEffect(() => {
    void updateBridge.get().then(setState)
    return updateBridge.onState(setState)
  }, [])
  const desc =
    state.kind === 'unsupported'
      ? 'Updates work in the installed app (not in development builds).'
      : state.kind === 'checking'
        ? 'Checking for updates…'
        : state.kind === 'downloading'
          ? `Downloading ${state.version}… ${state.percent}%`
          : state.kind === 'ready'
            ? `Version ${state.version} is ready. It installs when you restart.`
            : state.kind === 'none'
              ? `You have the latest version (${__APP_VERSION__}).`
              : state.kind === 'error'
                ? `Couldn’t check: ${state.message}`
                : 'Lượm updates itself from GitHub Releases.'
  return (
    <SettingRow title="Updates" desc={desc}>
      {state.kind === 'ready' ? (
        <Button size="sm" onClick={() => void updateBridge.install()}>
          Restart to update
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          disabled={state.kind === 'unsupported' || state.kind === 'checking' || state.kind === 'downloading'}
          onClick={() => void updateBridge.check().then(setState)}
        >
          Check now
        </Button>
      )}
    </SettingRow>
  )
}

export interface SettingsSection {
  id: string
  label: string
  icon: LucideIcon
  Panel: () => React.JSX.Element
}

/** Section registry — the left rail and the content share this order. */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    id: 'general',
    label: 'General',
    icon: SlidersHorizontal,
    Panel: GeneralSection,
  },
  {
    id: 'style',
    label: 'Learning style',
    icon: Compass,
    Panel: LearningStyleSection,
  },
  {
    id: 'learning',
    label: 'Study sessions',
    icon: Library,
    Panel: LearningPreferences,
  },
  { id: 'reminders', label: 'Reminders', icon: Bell, Panel: RemindersSection },
  {
    id: 'capture',
    label: 'Quick capture',
    icon: Keyboard,
    Panel: CaptureSection,
  },
  {
    id: 'wordcard',
    label: 'Word card',
    icon: WalletCards,
    Panel: WordCardPreferences,
  },
  { id: 'ai', label: 'AI', icon: Sparkles, Panel: AiSection },
  { id: 'reading', label: 'Reading', icon: BookOpen, Panel: ReadingSection },
  { id: 'data', label: 'Data & about', icon: Database, Panel: DataSection },
] as const
