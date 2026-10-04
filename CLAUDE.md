# EnVi Learn (macOS desktop)

Personal English → Vietnamese vocabulary app: Electron (main / preload / renderer) + React 19 + TypeScript +
Tailwind v4 + Radix, local SQLite via better-sqlite3 + Drizzle. macOS only, single user, no server.

## Commands

Use Node 22 first: `export PATH=~/.nvm/versions/node/v22.21.0/bin:$PATH` (or `nvm use`).

```bash
npm run dev               # development (electron-vite)
npm run typecheck         # node + web tsconfigs
npm run test              # vitest inside Electron's Node (same ABI as the app; never run npx vitest directly)
npm run db:generate       # after changing src/renderer/src/db/schema.ts
npm run check:no-raw-sql  # renderer must not use raw SQL (.prepare)
npm run release:mac       # build the .app / .dmg into release/
npm run rebuild           # repair: rebuild better-sqlite3 after an Electron upgrade / ABI error
```

## Architecture

- **main** (`src/main/`) — platform primitives only, no learning logic:
  `dictionary.ts` (EN→VI entry from Google gtx + Free Dictionary API, via `net.fetch`; Node fetch gets HTTP 429),
  `speech.ts` (`speak://` pronunciation protocol: Edge neural TTS cached on disk, macOS `say` fallback),
  `capture.ts` (global hotkey → synthetic ⌘C via System Events → popup window `#/capture`),
  `menubar.ts` (tray title = due count, notifications, login item), `enrich.ts` (optional Claude entry, key in
  safeStorage), `db.ts` (SQLite executor + migrations), `books.ts`, `translate.ts`, `suggest.ts`, `tts.ts`.
- **preload** (`src/preload/index.ts`) — the explicit bridge allow-list (`dbAPI`, `dictionaryAPI`, `appAPI`, …).
- **renderer** (`src/renderer/src/`) — all logic. Domain modules with an `index.ts` facade: `wordbook` (my words,
  FSRS study, word lists), `dict` (local dictionary store + lookups), `settings`, `lookup` (history), `reading`.
  `app/` is the shell composition root (reminders, word flashes, menu bar status, hotkey registration).
  `session/` just opens the local DB (fixed local user id 1).
- **shared** (`src/shared/`) — cross-process contracts (`EnViEntry`, speech URLs, app bridge types).

## Rules

- Routing uses **HashRouter** (Electron loads `file://`).
- Local DB only through Drizzle; no raw SQL in the renderer. Schema change = edit `db/schema.ts` + `npm run db:generate`.
- Pages import domain modules only through their `index` facade (`@/wordbook`, `@/dict`, `@/settings`, `@/lookup`).
- Only `src/renderer/src/platform/` touches `window.*API` bridges.
- `dict.dict_id` is allocated locally and referenced by every learning table — never renumber or delete dict rows
  that words reference. Terms match case-insensitively.
- Test-first for logic (state, derived data, calculations, event handling). Pure visual work (styling / layout) is
  exempt; check it in the running app.
- `src/renderer/src/vendor/foliate-js/` is read-only vendor code (MIT fork); see its `VENDOR.md`.
- UI copy is English; Vietnamese appears only in dictionary content.

## UI demo gallery

When asked to "build a UI demo", add it to the DEV-only gallery: a component under `src/renderer/src/pages/demos/`
(complex ones in `examples/`), registered in `pages/demos/registry.tsx` (`DEMOS`). Preview at `#/demos`.
