// User settings (user_setting, key-level KV; one row per setting_key → value, no tombstones).
// getSettings reads all known keys into Settings (missing → default, invalid → default + loud warning,
// unknown keys ignored). updateSettings upserts each key in the patch as JSON (dirty + editTime).
import type { Db } from '@/db/client'
import { userSetting } from '@/db/schema'
import { toast } from '@/lib/toast'
import { DEFAULT_SETTINGS, SETTINGS_REGISTRY, type SettingSpec } from './defaults'
import type { Settings } from './types'

// Defaults live in ./defaults; re-exported here for existing imports.
export { DEFAULT_SETTINGS }

/** Warn about an invalid value only once per key per session (reads are frequent). */
const warnedKeys = new Set<string>()

/** Read settings: load all rows and assemble via the registry. Missing → default; invalid → default + toast + console.error. */
export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db
    .select({ settingKey: userSetting.settingKey, value: userSetting.value })
    .from(userSetting)
    .all()
  const byKey = new Map(rows.map((r) => [r.settingKey, r.value]))
  const out: Record<string, unknown> = {}
  for (const [prop, s] of Object.entries(SETTINGS_REGISTRY)) {
    out[prop] = byKey.has(s.key) || !s.legacy ? readOne(s, byKey.get(s.key)) : readLegacy(s, s.legacy, byKey.get(s.legacy.key))
  }
  return out as unknown as Settings
}

/** Read one key: no row → default (not persisted); parse/validation failure → default + loud warning. */
function readOne(s: SettingSpec, raw: string | undefined): unknown {
  if (raw === undefined) return s.default
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fallback(s, `could not parse JSON: ${raw}`)
  }
  return s.validate(parsed) ? parsed : fallback(s, `invalid value: ${raw}`)
}

/** A renamed setting not written yet under its new key: map the old key's value (anything unusable → default). */
function readLegacy(s: SettingSpec, legacy: NonNullable<SettingSpec['legacy']>, raw: string | undefined): unknown {
  if (raw === undefined) return s.default
  try {
    const v = legacy.map(JSON.parse(raw))
    return s.validate(v) ? v : s.default
  } catch {
    return s.default
  }
}

/** Invalid-value fallback: fail loudly, one toast per key per session. */
function fallback(s: SettingSpec, reason: string): unknown {
  console.error(`Setting ${s.key}: ${reason}; reset to default`)
  if (!warnedKeys.has(s.key)) {
    warnedKeys.add(s.key)
    toast.error(`Setting “${s.key}” had invalid data and was reset to its default. Please report this.`)
  }
  return s.default
}

/** Update settings: upsert each key in the patch as JSON (dirty=1 + editTime); keys are independent. */
export async function updateSettings(
  db: Db,
  patch: Partial<Settings>,
  editTime: number,
): Promise<void> {
  for (const prop of Object.keys(patch) as (keyof Settings)[]) {
    const value = patch[prop]
    if (value === undefined) continue
    const settingKey = SETTINGS_REGISTRY[prop].key
    const encoded = JSON.stringify(value)
    await db
      .insert(userSetting)
      .values({ settingKey, value: encoded, editTime, dirty: 1 })
      .onConflictDoUpdate({
        target: userSetting.settingKey,
        set: { value: encoded, editTime, dirty: 1 },
      })
      .run()
  }
}
