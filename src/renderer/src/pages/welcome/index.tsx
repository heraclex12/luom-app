import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BellRing, Check, Keyboard, LogIn, Zap } from 'lucide-react'
import { Button, Input, Switch } from '@/components/ui'
import { ModeCard } from '@/components/settings/ModeCard'
import { cn } from '@/lib/cn'
import appIcon from '@/assets/app-icon.png'
import { toast } from '@/lib/toast'
import { appBridge } from '@/platform'
import { getSettings, updateSettings } from '@/settings'
import { prettyAccelerator } from '@/app/shortcut'
import * as wordbook from '@/wordbook'
import {
  INITIAL_STATE,
  STEPS,
  back,
  canAdvance,
  chosenMode,
  isLastStep,
  next,
  reasonLine,
  recommendedFor,
  stepOf,
  update,
  type Obstacle,
  type OnboardingState,
  type Reason,
} from './onboarding'

/**
 * First-run setup (full window, no sidebar): a few calm questions → a recommended learning mode →
 * reminders / login item / capture permission. Finishing applies the mode, saves the reminder time
 * and marks the app as onboarded. Step logic lives in ./onboarding (pure, tested).
 */

const REASONS: { value: Reason; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'study', label: 'Study / exams' },
  { value: 'travel', label: 'Travel' },
  { value: 'everyday', label: 'Everyday life' },
  { value: 'fun', label: 'Just for fun' },
]

const TIMES: { value: number; label: string; hint: string }[] = [
  { value: 2, label: '2 min', hint: 'A glance between things' },
  { value: 5, label: '5 min', hint: 'A coffee break' },
  { value: 10, label: '10 min', hint: 'A short session' },
  { value: 20, label: '20+ min', hint: 'Proper practice' },
]

const OBSTACLES: { value: Obstacle; label: string }[] = [
  { value: 'no-time', label: 'No time' },
  { value: 'laziness', label: 'Feeling lazy' },
  { value: 'boredom', label: 'Getting bored' },
  { value: 'forgetting', label: 'Forgetting words' },
]

/** A single-choice option row. */
function Option({
  selected,
  onSelect,
  label,
  hint,
}: {
  selected: boolean
  onSelect: () => void
  label: string
  hint?: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'can-focus flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-border-accent bg-bg-accent/40'
          : 'border-border bg-surface-1 hover:border-border-strong hover:bg-fill-ghost-hover',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        {hint && <span className="block text-xs text-text-muted">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected ? 'border-transparent bg-fill-accent text-on-accent' : 'border-border-strong',
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
    </button>
  )
}

function Heading({ title, sub }: { title: string; sub?: string }): React.JSX.Element {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
      {sub && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{sub}</p>}
    </div>
  )
}

/** A setup row: icon + title/description, control on the right. */
function SetupRow({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof BellRing
  title: string
  desc: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text-primary">{title}</div>
        <div className="mt-0.5 text-[13px] leading-snug text-text-muted">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function Welcome(): React.JSX.Element {
  const navigate = useNavigate()
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE)
  const [reminderTime, setReminderTime] = useState('08:30')
  const [flashes, setFlashes] = useState(true)
  const [loginItem, setLoginItem] = useState<boolean | null>(null)
  const [trusted, setTrusted] = useState<boolean | null>(null)
  const [shortcut, setShortcut] = useState('Alt+Command+E')
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    void appBridge.getLoginItem().then(setLoginItem)
    void getSettings().then((s) => {
      if (s.captureShortcut) setShortcut(s.captureShortcut)
      // Re-running setup: start from the current mode.
      if (s.onboarded === 1) setState((st) => ({ ...st, mode: s.learningMode }))
    })
    const check = (): void => void appBridge.hasAccessibility(false).then(setTrusted)
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [])

  const step = stepOf(state)
  const set = (patch: Parameters<typeof update>[1]): void => setState((s) => update(s, patch))
  const recommended = recommendedFor(state, wordbook.recommendMode)
  const chosen = chosenMode(state, wordbook.recommendMode)

  const finish = async (): Promise<void> => {
    setFinishing(true)
    try {
      await wordbook.applyLearningMode(chosen)
      await updateSettings({
        reminderTime,
        reminderEnabled: 1,
        ...(flashes ? {} : { flashEveryMinutes: 0 }),
        onboarded: 1,
      })
      navigate('/wordbook', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
      setFinishing(false)
    }
  }

  const onNext = (): void => {
    if (isLastStep(state)) void finish()
    else setState(next)
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-page-bg">
      {/* Progress dots */}
      <div className="flex shrink-0 justify-center gap-1.5 pt-10" aria-label={`Step ${state.step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === state.step ? 'w-6 bg-fill-accent' : i < state.step ? 'w-1.5 bg-text-secondary' : 'w-1.5 bg-alpha-3',
            )}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        <div
          key={step}
          className={cn(
            'mx-auto w-full px-8 pb-8', step === 'setup' ? 'pt-8' : 'pt-12',
            step === 'mode' ? 'max-w-2xl' : 'max-w-lg',
          )}
        >
          {step === 'welcome' && (
            <div className="pt-10 text-center">
              <img src={appIcon} alt="" className="mx-auto mb-6 size-24" />
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Lượm</h1>
              <p className="mt-2 text-lg text-text-secondary">English words that stick</p>
              <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-text-muted">
                Save English words from anywhere on your Mac, see their Vietnamese meanings, and review them at just the
                right moment so you don’t forget.
              </p>
              <p className="mt-8 text-xs text-text-muted">Three quick questions, then you’re set.</p>
            </div>
          )}

          {step === 'why' && (
            <>
              <Heading title="Why are you learning English?" sub="This helps us talk to you in the right way." />
              <div role="radiogroup" className="flex flex-col gap-2">
                {REASONS.map((r) => (
                  <Option
                    key={r.value}
                    label={r.label}
                    selected={state.reason === r.value}
                    onSelect={() => set({ reason: r.value })}
                  />
                ))}
              </div>
            </>
          )}

          {step === 'time' && (
            <>
              <Heading title="How much time per day?" sub={reasonLine(state.reason)} />
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {TIMES.map((t) => (
                  <Option
                    key={t.value}
                    label={t.label}
                    hint={t.hint}
                    selected={state.minutes === t.value}
                    onSelect={() => set({ minutes: t.value })}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs text-text-muted">Be honest. A small habit beats a big plan you skip.</p>
            </>
          )}

          {step === 'obstacle' && (
            <>
              <Heading title="What usually gets in the way?" sub="Everyone has something. We’ll plan around it." />
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {OBSTACLES.map((o) => (
                  <Option
                    key={o.value}
                    label={o.label}
                    selected={state.obstacle === o.value}
                    onSelect={() => set({ obstacle: o.value })}
                  />
                ))}
              </div>
            </>
          )}

          {step === 'mode' && (
            <>
              <Heading title="Your learning style" sub="Based on your answers, we suggest:" />
              <div role="radiogroup" aria-label="Learning style">
                <ModeCard
                  size="lg"
                  mode={wordbook.modeInfo(recommended)}
                  badge="Recommended"
                  selected={chosen === recommended}
                  onSelect={() => set({ mode: recommended })}
                />
                <div className="mb-2 mt-6 text-xs font-medium text-text-muted">Or pick another</div>
                <div className="grid grid-cols-2 gap-2">
                  {wordbook.LEARNING_MODES.filter((m) => m.id !== recommended).map((m) => (
                    <ModeCard key={m.id} mode={m} selected={chosen === m.id} onSelect={() => set({ mode: m.id })} />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-xs text-text-muted">
                You can change this anytime in Settings. Your progress stays the same.
              </p>
            </>
          )}

          {step === 'setup' && (
            <>
              <Heading title="Almost done" sub="A few small things so Lượm can help you between sessions." />
              <div className="divide-y divide-alpha-1 rounded-xl bg-surface-1 px-4">
                <SetupRow icon={BellRing} title="Daily reminder" desc="We’ll nudge you when words are waiting.">
                  <Input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => e.target.value && setReminderTime(e.target.value)}
                    className="w-28"
                    aria-label="Reminder time"
                  />
                </SetupRow>
                <SetupRow
                  icon={Zap}
                  title="Word flash notifications"
                  desc="One of your words now and then, with Got it / Again buttons."
                >
                  <Switch checked={flashes} onCheckedChange={setFlashes} aria-label="Word flash notifications" />
                </SetupRow>
                <SetupRow icon={LogIn} title="Open at login" desc="Stay in the menu bar so reminders always arrive.">
                  <Switch
                    checked={loginItem ?? false}
                    disabled={loginItem === null}
                    onCheckedChange={(c) => void appBridge.setLoginItem(c).then(setLoginItem)}
                    aria-label="Open at login"
                  />
                </SetupRow>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 px-1">
                <span className="text-xs text-text-muted">macOS may ask for permission the first time.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void appBridge.notify({
                      title: 'Hello from Lượm',
                      body: 'Notifications work. See you at your reminder time!',
                    })
                  }
                >
                  Send a test notification
                </Button>
              </div>

              <div className="mt-4 rounded-xl bg-surface-1 p-4">
                <div className="flex items-start gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">
                    <Keyboard className="size-[18px]" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary">
                      Select any English word and press{' '}
                      <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                        {prettyAccelerator(shortcut)}
                      </kbd>
                    </div>
                    <div className="mt-1 text-[13px] leading-snug text-text-muted">
                      In Chrome, Mail, PDFs, anywhere. Lượm looks it up and saves it to your words.
                      {!trusted && ' To read your selection directly, macOS needs your permission.'}
                    </div>
                    <div className="mt-3">
                      {trusted ? (
                        <span className="inline-flex items-center gap-1 text-sm text-text-success">
                          <Check className="size-4" strokeWidth={2.5} /> Selection reading is on
                        </span>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => void appBridge.hasAccessibility(true)}>
                          Allow selection reading
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer: Back / Next */}
      <div className="shrink-0 border-t border-border">
        <div className={cn('mx-auto flex w-full items-center justify-between px-8 py-4', step === 'mode' ? 'max-w-2xl' : 'max-w-lg')}>
          {state.step > 0 ? (
            <Button variant="ghost" onClick={() => setState(back)} disabled={finishing}>
              <ArrowLeft className="size-4" strokeWidth={2} />
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={onNext} disabled={!canAdvance(state)} loading={finishing}>
            {state.step === 0 ? 'Get started' : isLastStep(state) ? 'Start learning' : 'Next'}
            {!isLastStep(state) && <ArrowRight className="size-4" strokeWidth={2} />}
          </Button>
        </div>
      </div>
    </div>
  )
}
