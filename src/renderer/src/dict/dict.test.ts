// Local EN→VI dictionary store: why these behaviours matter —
// • terms are matched case-insensitively and never duplicated (one learning record per word);
// • dict ids are allocated locally and stay stable (every learning table keys on them);
// • word-list picks create placeholder rows that a later online pass fills in;
// • lookups fall back gracefully: not-found vs offline are different answers.
import Database from 'better-sqlite3'
import { drizzle as betterDrizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as proxyDrizzle } from 'drizzle-orm/sqlite-proxy'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runBatch as execBatch, runStmt as execStmt } from '../../../main/dbExecutor'
import type { EnViEntry } from '../../../shared/dictionary'

vi.mock('@/platform', () => ({ dictionaryBridge: { lookup: vi.fn() } }))

import type { Db } from '@/db/client'
import { dictionaryBridge } from '@/platform'
import * as dict from './dict'
import * as service from './service'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../drizzle', import.meta.url))
const lookupMock = vi.mocked(dictionaryBridge.lookup)

function makeDb(): Db {
  const sqlite = new Database(':memory:')
  migrate(betterDrizzle(sqlite), { migrationsFolder: MIGRATIONS_DIR })
  return proxyDrizzle(
    async (sql, params, method) => execStmt(sqlite, { sql, params, method }) as { rows: any[] },
    async (queries) => execBatch(sqlite, queries) as { rows: any[] }[],
  )
}

function entry(word: string, extra: Partial<EnViEntry> = {}): EnViEntry {
  return {
    word,
    ipaUK: 'ʊk',
    ipaUS: 'ʌs',
    translation: 'bản dịch',
    meanings: [{ pos: 'noun', terms: ['nghĩa'] }],
    definitions: [],
    examples: [],
    synonyms: [],
    source: 'web',
    ...extra,
  }
}

let db: Db
beforeEach(() => {
  vi.resetAllMocks()
  db = makeDb()
})

describe('dict store', () => {
  it('saveEntry allocates increasing ids and re-saving the same term (any case) keeps its id', async () => {
    const a = await dict.saveEntry(db, entry('apple'))
    const b = await dict.saveEntry(db, entry('banana'))
    expect(b.dictId).toBe(a.dictId + 1)
    const again = await dict.saveEntry(db, entry('Apple', { translation: 'quả táo' }))
    expect(again.dictId).toBe(a.dictId)
    expect(JSON.parse(again.entry!).translation).toBe('quả táo')
  })

  it('stores phonetics and speech URLs for both accents', async () => {
    const row = await dict.saveEntry(db, entry('apple'))
    expect(row.ukPhonetic).toBe('ʊk')
    expect(row.usPhonetic).toBe('ʌs')
    expect(row.ukAudioUrl).toMatch(/^speak:/)
    expect(row.usAudioUrl).toMatch(/^speak:/)
    expect(row.ukAudioUrl).not.toBe(row.usAudioUrl)
  })

  it('getByTerm is case-insensitive', async () => {
    await dict.saveEntry(db, entry('apple'))
    expect((await dict.getByTerm(db, 'APPLE'))?.term).toBe('apple')
    expect(await dict.getByTerm(db, 'pear')).toBeNull()
  })

  it('ensureTerms creates placeholder rows once and maps every term to an id', async () => {
    const saved = await dict.saveEntry(db, entry('apple'))
    const map = await dict.ensureTerms(db, ['Apple', 'pear', 'pear', 'plum'])
    expect(map.get('Apple')).toBe(saved.dictId)
    expect(map.get('pear')).toBeDefined()
    expect(map.get('plum')).toBe(map.get('pear')! + 1)
    expect((await dict.getByTerm(db, 'pear'))?.entry).toBeNull()
    expect(await dict.cachedDictCount(db)).toBe(3)
  })
})

describe('lookup service', () => {
  it('returns a local hit without touching the network', async () => {
    await dict.saveEntry(db, entry('apple'))
    const res = await service.lookupByTerm(db, 'Apple')
    expect(res.status).toBe('hit')
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('fetches, stores under the canonical spelling and returns a hit', async () => {
    lookupMock.mockResolvedValue({ status: 'found', entry: entry('run') })
    const res = await service.lookupByTerm(db, 'run')
    expect(res.status).toBe('hit')
    expect((await dict.getByTerm(db, 'run'))?.entry).not.toBeNull()
  })

  it('fills a placeholder row in place (keeps its id)', async () => {
    const id = (await dict.ensureTerms(db, ['pear'])).get('pear')!
    lookupMock.mockResolvedValue({ status: 'found', entry: entry('pear') })
    const res = await service.lookupByTerm(db, 'pear')
    expect(res.status === 'hit' && res.row.dictId).toBe(id)
  })

  it('distinguishes not-found from unavailable (offline)', async () => {
    lookupMock.mockResolvedValueOnce({ status: 'not-found' })
    expect((await service.lookupByTerm(db, 'qwzxv')).status).toBe('not-found')
    lookupMock.mockRejectedValueOnce(new Error('offline'))
    expect((await service.lookupByTerm(db, 'apple')).status).toBe('unavailable')
  })

  it('readThroughByDictId fetches a placeholder and returns the filled row', async () => {
    const id = (await dict.ensureTerms(db, ['pear'])).get('pear')!
    lookupMock.mockResolvedValue({ status: 'found', entry: entry('pear') })
    const row = await service.readThroughByDictId(db, id)
    expect(row?.entry).not.toBeNull()
    expect(await service.readThroughByDictId(db, 999)).toBeNull()
  })

  it('readThroughByDictId offline still returns the placeholder row', async () => {
    const id = (await dict.ensureTerms(db, ['pear'])).get('pear')!
    lookupMock.mockRejectedValue(new Error('offline'))
    const row = await service.readThroughByDictId(db, id)
    expect(row?.term).toBe('pear')
    expect(row?.entry).toBeNull()
  })

  it('empty or over-long terms short-circuit to not-found', async () => {
    expect((await service.lookupByTerm(db, '   ')).status).toBe('not-found')
    expect((await service.lookupByTerm(db, 'x'.repeat(121))).status).toBe('not-found')
    expect(lookupMock).not.toHaveBeenCalled()
  })
})
