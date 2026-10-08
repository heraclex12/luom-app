# Lượm (macOS desktop)

Formerly EnVi Learn: the visible name is Lượm, but the bundle id `com.envilearn.app`, package name `envi-learn`
(= data folder) and internal identifiers (`EnViEntry`, `envi-*`) are deliberately unchanged.

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
npm run release:mac       # build the .app / .dmg into release.noindex/ (install from there into /Applications)
npm run rebuild           # repair: rebuild better-sqlite3 after an Electron upgrade / ABI error
npm run build:widget      # desktop widget (native/widget/, Swift WidgetKit + App Intents; needs Xcode 26) → native/widget/.build; release:mac runs it
python3 scripts/gen-theme.py  # regenerate styles/envi-theme.css (palette, light + dark) and print contrast checks
```

## Architecture

- **main** (`src/main/`) — platform primitives only, no learning logic:
  `dictionary.ts` (EN→VI entry from Google gtx + Free Dictionary API, via `net.fetch`; Node fetch gets HTTP 429),
  `speech.ts` (`speak://` pronunciation protocol: Edge neural TTS cached on disk, macOS `say` fallback),
  `capture.ts` (global hotkey → native helper `native/selection-helper.swift` reads the selection via the
  Accessibility API, else a clean ⌘C; clipboard only when nothing is selected → popup window `#/capture`),
  `menubar.ts` (tray title = due count, notifications, login item), `widget.ts` (desktop widget: writes
  `<userData>/widget.json` for the WidgetKit extension in `native/widget/`, which reads it through a read-only sandbox
  exception; handles its `luom://` links; contract in `shared/widget.ts`), `ai/` (providers: ChatGPT, OpenRouter, Claude;
  keys in safeStorage, plus a built-in free OpenRouter key from the git-ignored `.env.local` (`ENVI_OPENROUTER_KEY`),
  injected scrambled at build time, never committed; `generateJson` validates with zod, free models fall back in order), `chatgptWeb.ts` (ChatGPT on the user's account: hidden
  chatgpt.com window in the `persist:chatgpt` session; page selectors there, completion logic in `chatgptWebState.ts`), `enrich.ts` / `story.ts`
  (AI entry and story), `db.ts` (SQLite executor + migrations), `books.ts`, `translate.ts`, `suggest.ts`, `tts.ts`.
- **preload** (`src/preload/index.ts`) — the explicit bridge allow-list (`dbAPI`, `dictionaryAPI`, `appAPI`, …).
- **renderer** (`src/renderer/src/`) — all logic. Domain modules with an `index.ts` facade: `episodes` (Daily Episodes: serialized AI story, one
  episode a day with the learner's words, lost pages, quiz; rules in `shared/episodes.ts`, AI in `main/episodes.ts`), `wordbook` (my words,
  FSRS study, word lists, user collections in `wordCollections.ts`; study can be scoped to one collection), `dict` (local dictionary store + lookups), `settings`, `lookup` (history), `reading`.
  3D activities: `components/three/Stage.ts` (shared three.js stage) + `critters.ts` (cute characters) +
  `pages/word-book/activities/*` (Word Bridge, Bubble Tea Shop, Word Fishing + aquarium, Firefly Night, Frog Hop: scene +
  page per game, shared frame in `activities/shell.tsx`); rules in `wordbook/activities.ts`; answers rate via `quickRate`.
  The games list (`pages/word-book/play/index.tsx`) shows these and the quick games together.
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
- `src/renderer/src/vendor/foliate-js/` is read-only vendor code (MIT fork); see its `VENDOR.md` (patches are listed there).
- Library formats live in `src/shared/books.ts` (EPUB, PDF, Markdown; Markdown is converted to EPUB on open by
  `reading/engine/markdownBook.ts`).
- UI copy is English; Vietnamese appears only in dictionary content.
- Look: a Đông Hồ folk-print world (see PRODUCT.md and DESIGN.md). Colours come only from tokens; edit the palette in
  `scripts/gen-theme.py`, never `envi-theme.css` by hand. A word's stage is shown with `components/seal/Seal.tsx`.

## UI demo gallery

When asked to "build a UI demo", add it to the DEV-only gallery: a component under `src/renderer/src/pages/demos/`
(complex ones in `examples/`), registered in `pages/demos/registry.tsx` (`DEMOS`). Preview at `#/demos`.
