// Local DB executor (plain better-sqlite3, no electron): runs a ProxyStmt on a connection and returns
// the `{ rows }` shape sqlite-proxy expects. Shared by production (main/db.ts via IPC) and tests.
//
// This is the only place in the app that executes SQL directly (.prepare/.raw). Renderer code goes
// through drizzle sqlite-proxy and never touches better-sqlite3 (enforced by check:no-raw-sql).
import type { Database } from 'better-sqlite3'
import type { ProxyResult, ProxyStmt } from '../shared/db'

/** Run one statement. Writes use run; reads use .raw() for positional arrays (proxy maps by column). */
export function runStmt(sqlite: Database, { sql, params, method }: ProxyStmt): ProxyResult {
  const stmt = sqlite.prepare(sql)
  if (method === 'run') {
    stmt.run(...params)
    return { rows: [] }
  }
  const raw = stmt.raw()
  // get returns one positional row or undefined; all/values return an array of rows.
  return { rows: method === 'get' ? raw.get(...params) : raw.all(...params) }
}

/** Run statements in a single transaction: all succeed or all roll back. */
export function runBatch(sqlite: Database, stmts: readonly ProxyStmt[]): ProxyResult[] {
  const tx = sqlite.transaction((list: readonly ProxyStmt[]) => list.map((s) => runStmt(sqlite, s)))
  return tx(stmts)
}
