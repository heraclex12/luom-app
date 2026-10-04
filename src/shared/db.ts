// Local DB bridge contract shared by main (executor), preload and renderer (sqlite-proxy).
// main alone owns better-sqlite3; the renderer sends drizzle-compiled parameterised statements over it.
// Matches drizzle-orm/sqlite-proxy: results are `{ rows }` with values in column order (via .raw()).

/** drizzle-proxy method: run = write, all/values = many rows, get = one row. */
export type SqlMethod = 'run' | 'all' | 'values' | 'get'

/** A parameterised statement compiled by drizzle. sql has only `?` placeholders; params are positional. */
export interface ProxyStmt {
  sql: string
  params: unknown[]
  method: SqlMethod
}

/**
 * Result in the shape sqlite-proxy expects:
 * - run → `{ rows: [] }`
 * - all/values → `{ rows: array of positional rows }`
 * - get → `{ rows: one positional row | undefined }` (proxy's mapGetResult treats rows as the row)
 */
export interface ProxyResult {
  rows: unknown
}
