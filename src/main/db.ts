// Per-user local DB executor: open (pragmas + migrate), close, exec (one statement), batch (transaction).
// main is the only process holding the DB; it picks the file path by userId.
// The drizzle schema is the source of truth; drizzle-kit migrations run on open (no hand-written DDL).
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import type { ProxyStmt, SqlMethod } from '../shared/db'
import { runBatch, runStmt } from './dbExecutor'

/** At most one open DB at a time (single window, single user). */
let current: { userId: number; sqlite: Database.Database } | null = null

/**
 * Database file path. userData = ~/Library/Application Support/<package.json name> ("envi-learn").
 * Changing the package name later would point the app at an empty folder — keep it stable.
 */
function userDbPath(userId: number): string {
  return join(app.getPath('userData'), `envi-user-${userId}.db`)
}

/**
 * Migrations folder: in dev, ./drizzle under app.getAppPath() (project root);
 * when packaged, resources/drizzle (shipped via electron-builder extraResources).
 */
function migrationsFolder(): string {
  return app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(app.getAppPath(), 'drizzle')
}

/** Open a user's DB and migrate it (idempotent if that user's DB is already open). */
export function openDb(userId: number): void {
  if (current?.userId === userId) return
  if (current) closeDb()
  const sqlite = new Database(userDbPath(userId))
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  // Each user DB tracks its own __drizzle_migrations; new DBs are built from scratch.
  migrate(drizzle(sqlite), { migrationsFolder: migrationsFolder() })
  current = { userId, sqlite }
}

/** Close the DB. Idempotent. */
export function closeDb(): void {
  if (!current) return
  try {
    current.sqlite.close()
  } catch {
    /* already closed */
  }
  current = null
}

function requireDb(): Database.Database {
  if (!current) throw new Error('db not open')
  return current.sqlite
}

/** Register once on app whenReady. */
export function registerDbIpc(): void {
  ipcMain.handle('db:open', (_e, userId: number) => openDb(userId))
  ipcMain.handle('db:close', () => closeDb())
  ipcMain.handle('db:exec', (_e, sql: string, params: unknown[], method: SqlMethod) =>
    runStmt(requireDb(), { sql, params, method }),
  )
  ipcMain.handle('db:batch', (_e, stmts: ProxyStmt[]) => runBatch(requireDb(), stmts))
}
