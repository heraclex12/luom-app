// App integration (composition root for the desktop shell), main window only:
// • navigation requests from main (menu bar items, notification clicks) → router / settings dialog;
// • menu bar status (due count) kept fresh;
// • daily study reminder + word flash notifications (rules in ./reminder);
// • the capture hotkey registered from settings;
// • "words changed" events from the capture popup → pages refresh.
import type { createHashRouter } from 'react-router-dom'
import { appBridge } from '@/platform'
import { db } from '@/db/client'
import { getMeta, setMeta } from '@/db/meta'
import { getSettings, onSettingsChange, type Settings } from '@/settings'
import * as wordbook from '@/wordbook'
import { SETTINGS_ROUTE } from '../../../shared/app'
import { dayKey, flashDue, flashText, pickFlashWord, reminderBody, shouldFireDaily, shouldNudge } from './reminder'
import { openSettingsDialog } from './settingsStore'

export { settingsDialogStore, openSettingsDialog } from './settingsStore'

type AppRouter = ReturnType<typeof createHashRouter>

const TICK_MS = 60_000
const META_REMINDER_DAY = 'app.reminder_last_day'
const META_FLASH_AT = 'app.flash_last_at'
const META_FLASH_RECENT = 'app.flash_recent'
const META_NUDGE_AT = 'app.nudge_last_at'
const RECENT_FLASH_LIMIT = 8

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
  const streak = progress.streak > 1 ? ` Keep your ${progress.streak}-day streak 🔥` : ''
  await appBridge.notify({
    title: `${left} ${left === 1 ? 'card' : 'cards'} to today's goal`,
    body: `A few minutes now and you're done for today.${streak}`,
    route: '/wordbook/study',
  })
}

async function maybeFlash(now: number, intervalHours: number, mode: Settings['learningMode']): Promise<void> {
  const lastAt = Number((await getMeta(db, META_FLASH_AT)) ?? '0') || null
  if (!flashDue(now, lastAt, intervalHours)) return
  await setMeta(db, META_FLASH_AT, String(now))
  const recent = JSON.parse((await getMeta(db, META_FLASH_RECENT)) ?? '[]') as number[]
  const candidates = await wordbook.flashCandidates()
  // Glance mode reviews through notifications: show due words first so "Got it" counts as a real review.
  const endOfToday = new Date(now).setHours(23, 59, 59, 999)
  const dueNow = candidates.filter((c) => c.due != null && c.due <= endOfToday)
  const word = pickFlashWord(mode === 'glance' && dueNow.length > 0 ? dueNow : candidates, recent)
  if (!word) return
  await setMeta(db, META_FLASH_RECENT, JSON.stringify([word.dictId, ...recent].slice(0, RECENT_FLASH_LIMIT)))
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

async function tick(): Promise<void> {
  try {
    const now = Date.now()
    const settings = await getSettings()
    await maybeDailyReminder(now, settings)
    await maybeNudge(now, settings)
    await maybeFlash(now, settings.flashIntervalHours, settings.learningMode)
    await refreshStatus()
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
    else void router.navigate(route)
  })
  onWordsChanged(() => void refreshStatus())
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
