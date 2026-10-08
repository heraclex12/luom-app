// App integration (composition root for the desktop shell), main window only:
// • navigation requests from main (menu bar items, notification clicks) → router / settings dialog;
// • menu bar status (due count) and the desktop widget's words kept fresh;
// • daily study reminder + word flash notifications (rules in ./reminder);
// • the capture hotkey registered from settings;
// • "words changed" events from the capture popup → pages refresh.
import type { createHashRouter } from 'react-router-dom'
import { appBridge } from '@/platform'
import { db } from '@/db/client'
import { getMeta, setMeta } from '@/db/meta'
import { getSettings, onSettingsChange, type Settings } from '@/settings'
import * as wordbook from '@/wordbook'
import * as episodes from '@/episodes'
import * as dict from '@/dict'
import { SETTINGS_ROUTE } from '../../../shared/app'
import {
  dayKey,
  episodeReminder,
  flashDue,
  flashText,
  parseTime,
  pickFlashWords,
  reminderBody,
  shouldFireDaily,
  shouldNudge,
} from './reminder'
import { openSettingsDialog } from './settingsStore'
import { buildWidgetData } from './widget'

export { settingsDialogStore, openSettingsDialog } from './settingsStore'

type AppRouter = ReturnType<typeof createHashRouter>

const TICK_MS = 60_000
const META_REMINDER_DAY = 'app.reminder_last_day'
const META_FLASH_AT = 'app.flash_last_at'
const META_FLASH_RECENT = 'app.flash_recent'
const META_NUDGE_AT = 'app.nudge_last_at'
const META_EPISODE_MORNING = 'app.episode_morning_day'
const META_EPISODE_EVENING = 'app.episode_evening_day'
/** Words kept out of the next flashes (enough for a few multi-word quizzes). */
const RECENT_FLASH_LIMIT = 20

// ────────────────── cross-window "words changed" event ──────────────────

const WORDS_CHANGED = 'envi:words-changed'

/** Subscribe to word-list changes made elsewhere (capture popup, other pages). Returns an unsubscribe. */
export function onWordsChanged(fn: () => void): () => void {
  window.addEventListener(WORDS_CHANGED, fn)
  return () => window.removeEventListener(WORDS_CHANGED, fn)
}

/** Announce that my words changed (this window + the others). */
export function notifyWordsChanged(): void {
  window.dispatchEvent(new Event(WORDS_CHANGED))
  void appBridge.wordsChanged()
  void refreshStatus()
}

// ────────────────── menu bar status ──────────────────

export async function refreshStatus(): Promise<void> {
  try {
    await appBridge.setStatus(await wordbook.studyStatus())
  } catch (e) {
    console.warn('[app] status refresh failed', e)
  }
}

// ────────────────── desktop widget ──────────────────

const WIDGET_REFRESH_MS = 10 * 60_000
let widgetAt = 0

/** Hand the desktop widget its words (main skips the write when nothing changed). */
async function refreshWidget(): Promise<void> {
  try {
    widgetAt = Date.now()
    await appBridge.setWidgetData(buildWidgetData(await wordbook.flashCandidates(), Date.now()))
  } catch (e) {
    console.warn('[app] widget refresh failed', e)
  }
}

/** Answers given on the widget (Got it / Again) are real reviews; also collects those made while Lượm was closed. */
async function applyWidgetRatings(): Promise<void> {
  try {
    const ratings = await appBridge.takeWidgetRatings()
    for (const r of ratings) await wordbook.quickRate(r.dictId, r.action)
    if (ratings.length > 0) notifyWordsChanged()
  } catch (e) {
    console.warn('[app] widget answers failed', e)
  }
}

// ────────────────── reminders ──────────────────

async function maybeDailyReminder(now: number, settings: Settings): Promise<void> {
  if (!settings.reminderEnabled) return
  const last = await getMeta(db, META_REMINDER_DAY)
  if (!shouldFireDaily(now, settings.reminderTime, last)) return
  await setMeta(db, META_REMINDER_DAY, dayKey(now))
  const body = reminderBody(await wordbook.studyStatus())
  if (!body) return // nothing to study today
  await appBridge.notify({ title: 'Time to study your English words', body, route: '/wordbook/study' })
}

/** Follow-up nudges (Regular: one evening nudge, Persistent: every 2 h) until today's goal is reached. */
async function maybeNudge(now: number, settings: Settings): Promise<void> {
  const progress = await wordbook.progressSnapshot()
  const left = settings.dailyGoal - progress.today.reviews
  const lastAt = Number((await getMeta(db, META_NUDGE_AT)) ?? '0') || null
  const status = await wordbook.studyStatus()
  const nothingToDo = status.due === 0 && status.newAvailable === 0
  if (
    nothingToDo ||
    !settings.reminderEnabled ||
    !shouldNudge({ now, intensity: settings.reminderIntensity, reminderTime: settings.reminderTime, lastNudgeAt: lastAt, goalMet: left <= 0 })
  ) {
    return
  }
  await setMeta(db, META_NUDGE_AT, String(now))
  const streak = progress.streak > 1 ? ` Keep your ${progress.streak}-day streak going.` : ''
  await appBridge.notify({
    title: `${left} ${left === 1 ? 'card' : 'cards'} to today's goal`,
    body: `A few minutes now and you're done for today.${streak}`,
    route: '/wordbook/study',
  })
}

async function maybeFlash(now: number, settings: Settings): Promise<void> {
  const lastAt = Number((await getMeta(db, META_FLASH_AT)) ?? '0') || null
  const idleSeconds = await appBridge.idleSeconds().catch(() => 0)
  if (
    !flashDue({
      now,
      lastFlashAt: lastAt,
      everyMinutes: settings.flashEveryMinutes,
      idleSeconds,
      activeFrom: settings.activeFrom,
      activeUntil: settings.activeUntil,
    })
  )
    return
  const recent = JSON.parse((await getMeta(db, META_FLASH_RECENT)) ?? '[]') as number[]
  const endOfToday = new Date(now).setHours(23, 59, 59, 999)
  const quiz = settings.flashStyle === 'quiz'
  // Words due today first, so answering (or Got it) is the review they need anyway.
  const picked = pickFlashWords(await wordbook.flashCandidates(), recent, quiz ? settings.flashWordCount : 1, endOfToday)
  if (picked.length === 0) return
  // Pop quiz card (active recall) for the words that have a meaning to ask; a notification otherwise.
  const quizWords = quiz ? picked.filter((w) => wordbook.firstMeaning(w.entry)) : []
  if (quizWords.length > 0) {
    // A card still up means the learner is mid-round: try again next minute instead of replacing it.
    if (!(await appBridge.openPopQuiz(quizWords.map((w) => w.dictId)))) return
    await markFlashed(now, quizWords, recent)
    return
  }
  const word = picked[0]!
  await markFlashed(now, [word], recent)
  const phonetic = word.usPhonetic ? `/${word.usPhonetic}/` : word.ukPhonetic ? `/${word.ukPhonetic}/` : ''
  const { title, body } = flashText(word.term, phonetic, wordbook.firstMeaning(word.entry))
  await appBridge.notify({
    title,
    body,
    route: `/wordbook/words?seg=all&dictId=${word.dictId}`,
    actions: [
      { id: 'good', label: 'Got it' },
      { id: 'again', label: 'Again' },
    ],
    payload: String(word.dictId),
  })
}

async function markFlashed(now: number, shown: readonly { dictId: number }[], recent: readonly number[]): Promise<void> {
  await setMeta(db, META_FLASH_AT, String(now))
  const ids = shown.map((w) => w.dictId)
  await setMeta(db, META_FLASH_RECENT, JSON.stringify([...ids, ...recent.filter((id) => !ids.includes(id))].slice(0, RECENT_FLASH_LIMIT)))
}

let lastPrewriteAt = 0

/**
 * Daily Episodes: write today's episode in the background from shortly before the reminder time (so it opens
 * instantly; at most one attempt an hour), then tease it in the morning and send a last-chance note in the evening.
 */
async function maybeEpisode(now: number, settings: Settings): Promise<void> {
  const view = await episodes.loadSeason()
  const n = view?.todayNumber
  if (!view || n == null || view.slots[n - 1]?.state !== 'today') return
  const d = new Date(now)
  const minutes = d.getHours() * 60 + d.getMinutes()
  const writeFrom = (parseTime(settings.reminderTime) ?? 9 * 60) - 15
  if (!view.episodes.has(n) && minutes >= writeFrom && now - lastPrewriteAt > 3_600_000 && (await dict.aiReady())) {
    lastPrewriteAt = now
    void episodes.ensureTodayEpisode().catch((e) => console.warn('[app] episode pre-write failed', e))
  }
  if (!settings.reminderEnabled) return
  const r = episodeReminder({
    now,
    reminderTime: settings.reminderTime,
    series: view.season.bible.title,
    number: n,
    teaser: view.episodes.get(n - 1)?.episode.teaser ?? '',
    lastMorning: await getMeta(db, META_EPISODE_MORNING),
    lastEvening: await getMeta(db, META_EPISODE_EVENING),
  })
  if (!r) return
  // An evening note also covers the morning one (never both at once).
  await setMeta(db, META_EPISODE_MORNING, dayKey(now))
  if (r.kind === 'evening') await setMeta(db, META_EPISODE_EVENING, dayKey(now))
  await appBridge.notify({ title: r.title, body: r.body, route: '/wordbook/episodes' })
}

async function tick(): Promise<void> {
  try {
    const now = Date.now()
    const settings = await getSettings()
    await maybeDailyReminder(now, settings)
    await maybeEpisode(now, settings)
    await maybeNudge(now, settings)
    await maybeFlash(now, settings)
    await refreshStatus()
    // Words turn due as time passes, not only when they change.
    if (now - widgetAt >= WIDGET_REFRESH_MS) await refreshWidget()
  } catch (e) {
    console.warn('[app] reminder tick failed', e)
  }
}

// ────────────────── hotkey ──────────────────

let appliedShortcut: string | null = null

async function applyCaptureShortcut(): Promise<void> {
  const { captureShortcut } = await getSettings()
  if (captureShortcut === appliedShortcut) return
  appliedShortcut = captureShortcut
  const ok = await appBridge.setCaptureShortcut(captureShortcut)
  if (!ok) console.warn(`[app] could not register the capture shortcut ${captureShortcut}`)
  void appBridge.refreshMenu()
}

// ────────────────── wiring ──────────────────

const LOOKUP_ROUTE = '/lookup'

/**
 * App menu "Look Up…" (⌘L): the dictionary's search field autofocuses only on mount, so when the page is already
 * open (or mounted while the window was hidden) focus and select it once the route has rendered.
 */
function focusLookupSearch(): void {
  requestAnimationFrame(() => {
    const input = document.querySelector<HTMLInputElement>('[data-lookup-search]')
    input?.focus()
    input?.select()
  })
}

let started = false

export function initAppIntegration(router: AppRouter): void {
  if (started) return
  started = true
  // Main → renderer events reach every window; the capture popup handles its own and runs no schedulers.
  appBridge.onWordsChanged(() => window.dispatchEvent(new Event(WORDS_CHANGED)))
  if (window.location.hash.startsWith('#/capture')) return

  // Word flash buttons: Got it / Again rate the word without opening the app.
  appBridge.onNotificationAction(({ actionId, payload }) => {
    const dictId = Number(payload)
    if (!dictId || (actionId !== 'good' && actionId !== 'again')) return
    void wordbook.quickRate(dictId, actionId).then(() => notifyWordsChanged())
  })
  appBridge.onNavigate((route) => {
    if (route === SETTINGS_ROUTE) openSettingsDialog()
    else void router.navigate(route).then(() => {
      if (route === LOOKUP_ROUTE) focusLookupSearch()
    })
  })
  onWordsChanged(() => {
    void refreshStatus()
    void refreshWidget()
  })
  appBridge.onWidgetInbox(() => void applyWidgetRatings())
  void applyWidgetRatings()
  onSettingsChange(() => {
    void applyCaptureShortcut()
    void tick()
  })
  void applyCaptureShortcut()
  void tick()
  setInterval(() => void tick(), TICK_MS)
  // Waking from sleep / reopening the window: re-check right away.
  window.addEventListener('focus', () => void tick())
}
