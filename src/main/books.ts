// Book file platform primitives: file dialog + read/write/delete in content-addressed storage.
// No business logic here (no user_book table, dedup or EPUB parsing) — that lives in the renderer.
//
// Layout (see shared/books.ts): `<userData>/books/<hash>/book.<format>` and `<hash>/cover.png`.
// hash and format are the only external inputs used to build paths, so both are shape-validated first:
// the renderer displays untrusted EPUB content and deleting a book dir is destructive (path traversal).
import { BrowserWindow, app, dialog, ipcMain, protocol } from 'electron'
import { access, copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import {
  BOOK_EXTENSIONS,
  BOOK_SCHEME,
  type BookFormat,
  type BookPaths,
  type PickedBookFile,
} from '../shared/books'
import { partialMd5OfFile } from './partialMd5'

/** Book identity: partial MD5 as 32 lowercase hex chars. */
const HASH_RE = /^[0-9a-f]{32}$/
/** Extension: lowercase alphanumerics only, so no `..` or separators. */
const FORMAT_RE = /^[a-z0-9]{1,8}$/

/** A book's directory (hash is validated before building the path). */
function bookDir(hash: string): string {
  if (!HASH_RE.test(hash)) throw new Error(`invalid book hash: ${hash}`)
  return join(app.getPath('userData'), 'books', hash)
}

function bookFilePath(hash: string, format: string): string {
  if (!FORMAT_RE.test(format)) throw new Error(`invalid book format: ${format}`)
  return join(bookDir(hash), `book.${format}`)
}

function coverFilePath(hash: string): string {
  return join(bookDir(hash), 'cover.png')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Pick a book via the file dialog (all supported extensions). Returns null if cancelled. */
async function pickBookFile(parent: BrowserWindow | null): Promise<PickedBookFile | null> {
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [{ name: 'Books and documents', extensions: [...BOOK_EXTENSIONS] }],
  }
  const { canceled, filePaths } = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)
  const path = filePaths[0]
  if (canceled || !path) return null
  return { path, fileName: basename(path) }
}

/**
 * Copy the picked book into content-addressed storage. Idempotent: returns early if the target
 * exists (same hash = same content). Caller must hash the file first.
 *
 * Writes to `.tmp` then renames atomically, re-hashing the copied file before the rename:
 *  - copying straight to dest could leave a truncated file after a crash, which the early return
 *    would then treat as complete forever;
 *  - the renderer computes the hash beforehand, so the source could change in between.
 * Re-hashing (12KB of samples) is cheap. Leftover `.tmp` files are overwritten on the next import.
 */
async function importBookFile(srcPath: string, hash: string, format: BookFormat): Promise<void> {
  const dest = bookFilePath(hash, format)
  if (await exists(dest)) return
  await mkdir(bookDir(hash), { recursive: true })
  const tmp = `${dest}.tmp`
  await copyFile(srcPath, tmp)
  if ((await partialMd5OfFile(tmp)) !== hash) {
    await rm(tmp, { force: true })
    throw new Error('book file hash mismatch')
  }
  await rename(tmp, dest)
}

/** Privileges for the cover scheme (registered together with the other schemes before app ready). */
export const BOOK_SCHEME_PRIVILEGES = { scheme: BOOK_SCHEME, privileges: { standard: true, secure: true } } as const

/**
 * Cover protocol handler: `envi-book://<hash>/cover.png` → `<userData>/books/<hash>/cover.png`.
 *
 * Host and path come from the renderer, so only this exact shape is allowed (valid hash, path exactly
 * `/cover.png`); anything else is 404, otherwise this would be an arbitrary file read.
 * A missing cover is normal and also 404s; `<img onError>` falls back to a text cover.
 * Content-Type is always `image/png` even if the bytes are JPEG; browsers sniff image content anyway.
 */
async function handleCoverRequest(request: Request): Promise<Response> {
  const { hostname, pathname } = new URL(request.url)
  if (pathname !== '/cover.png' || !HASH_RE.test(hostname)) return new Response(null, { status: 404 })
  try {
    return new Response(await readFile(coverFilePath(hostname)), {
      headers: { 'content-type': 'image/png' },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}

/** Register once on app whenReady. */
export function registerBooksIpc(): void {
  protocol.handle(BOOK_SCHEME, handleCoverRequest)
  ipcMain.handle('books:pick', (e) => pickBookFile(BrowserWindow.fromWebContents(e.sender)))
  ipcMain.handle('books:hash', (_e, path: string) => partialMd5OfFile(path))
  ipcMain.handle('books:import', (_e, srcPath: string, hash: string, format: BookFormat) =>
    importBookFile(srcPath, hash, format),
  )
  ipcMain.handle('books:stat', (_e, hash: string, format: BookFormat) =>
    exists(bookFilePath(hash, format)),
  )
  // Whether a cover exists (shelf uses the URL or a text cover). Always asks the filesystem.
  ipcMain.handle('books:stat-cover', (_e, hash: string) => exists(coverFilePath(hash)))
  // Open a book: send the whole file over IPC (fine for ~40MB; stream only if needed).
  ipcMain.handle('books:read', async (_e, hash: string, format: BookFormat) => {
    const buf = await readFile(bookFilePath(hash, format))
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  })
  ipcMain.handle('books:write-cover', async (_e, hash: string, pngBytes: Uint8Array) => {
    await mkdir(bookDir(hash), { recursive: true })
    await writeFile(coverFilePath(hash), pngBytes)
  })
  ipcMain.handle(
    'books:paths',
    (_e, hash: string, format: BookFormat): BookPaths => ({
      book: bookFilePath(hash, format),
      cover: coverFilePath(hash),
    }),
  )
  // Delete a book: remove the whole dir (file + cover). A missing dir counts as deleted.
  ipcMain.handle('books:delete-dir', (_e, hash: string) =>
    rm(bookDir(hash), { recursive: true, force: true }),
  )
}
