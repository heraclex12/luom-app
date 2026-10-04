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
import { dayKey, flashDue, flashText, pickFlashWord, reminderBody, shouldFireDaily } from './reminder'
import { openSettingsDialog } from './settingsStore'

export { settingsDialogStore, openSettingsDialog } from './settingsStore'

type AppRouter = ReturnType<typeof createHashRouter>

const TICK_MS = 60_000
const META_REMINDER_DAY = 'app.reminder_last_day'
const META_FLASH_AT = 'app.flash_last_at'
const META_FLASH_RECENT = 'app.flash_recent'
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

async function maybeFlash(now: number, intervalHours: number): Promise<void> {
  const lastAt = Number((await getMeta(db, META_FLASH_AT)) ?? '0') || null
  if (!flashDue(now, lastAt, intervalHours)) return
  await setMeta(db, META_FLASH_AT, String(now))
  const recent = JSON.parse((await getMeta(db, META_FLASH_RECENT)) ?? '[]') as number[]
  const word = pickFlashWord(await wordbook.flashCandidates(), recent)
  if (!word) return
  await setMeta(db, META_FLASH_RECENT, JSON.stringify([word.dictId, ...recent].slice(0, RECENT_FLASH_LIMIT)))
  const phonetic = word.usPhonetic ? `/${word.usPhonetic}/` : word.ukPhonetic ? `/${word.ukPhonetic}/` : ''
  const { title, body } = flashText(word.term, phonetic, wordbook.firstMeaning(word.entry))
  await appBridge.notify({ title, body, route: `/wordbook/words?seg=all&dictId=${word.dictId}` })
}

async function tick(): Promise<void> {
  try {
    const now = Date.now()
    const settings = await getSettings()
    await maybeDailyReminder(now, settings)
    await maybeFlash(now, settings.flashIntervalHours)
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
