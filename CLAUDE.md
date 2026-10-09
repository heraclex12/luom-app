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
  `voice.ts` (Say it: microphone permission + native helper `native/speech-helper.swift`, Apple on-device speech
  recognition of a 16 kHz WAV recorded by the renderer; matching rules in `shared/voice.ts`),
  `practice.ts` (Write back: AI situation + feedback on the learner's reply; rules in `shared/practice.ts`),
  `capture.ts` (global hotkey → native helper `native/selection-helper.swift` reads the selection via the
  Accessibility API, else a clean ⌘C; clipboard only when nothing is selected → popup window `#/capture`),
  `menubar.ts` (tray title = due count, notifications, login item), `widget.ts` (desktop widget: writes
  `<userData>/widget.json` for the WidgetKit extension in `native/widget/`, which reads it through a read-only sandbox
  exception; handles its `luom://` links; contract in `shared/widget.ts`), `telemetry.ts` (anonymous usage stats, opt-out in
  Settings: a random install id + versions + event counters sent about once a day, packaged builds only; rules in
  `telemetryState.ts`; server in `stats-server/`), `ai/` (services: Lượm (Free) = free models through OpenRouter on a built-in key from the git-ignored `.env.local`
  (`ENVI_OPENROUTER_KEY`), injected scrambled at build time, never committed; shown only as Auto (the free models router) /
  Lightning / Nano / Super / Ultra, never by model name, mapped in `ai/fallback.ts`; ChatGPT on the user's account; Custom API =
  any OpenAI-compatible base URL + key (safeStorage) + model from its `/models`; `generateJson` validates with zod), `chatgptWeb.ts` (ChatGPT on the user's account: hidden
  chatgpt.com window in the `persist:chatgpt` session; page selectors there, completion logic in `chatgptWebState.ts`), `enrich.ts` / `story.ts`
  (AI entry and story), `db.ts` (SQLite executor + migrations), `books.ts`, `translate.ts`, `suggest.ts`, `tts.ts`.
- **preload** (`src/preload/index.ts`) — the explicit bridge allow-list (`dbAPI`, `dictionaryAPI`, `appAPI`, …).
- **renderer** (`src/renderer/src/`) — all logic. Domain modules with an `index.ts` facade: `practice` (Write back
  sessions, sentences in `user_sentence`, Say it attempts in `speech_attempt`; UI in `components/practice`,
  `components/speech`, pages `word-book/{practice,say,pairs}`; Write back also runs in the pop quiz card), `episodes` (Daily Episodes: serialized AI story, one
  episode a day with the learner's words, lost pages, quiz; rules in `shared/episodes.ts`, AI in `main/episodes.ts`), `wordbook` (my words,
  FSRS study, word lists, user collections in `wordCollections.ts`; study can be scoped to one collection), `dict` (local dictionary store + lookups), `settings`, `lookup` (history), `reading`.
  Word garden (Home): `wordbook/garden.ts` (plants), `gardenWorld.ts` (worlds by level, islands from 100, layout),
  `gardenRewards.ts` (streak visitors, trophies, seasons / night, one-time news), `gardenData.ts` (DB + meta); 3D in
  `components/garden/` (`gardenScene.ts`, `gardenDecor.ts`, `gardenIslands.ts`, `gardenSky.ts`); preview every world
  in the DEV gallery (Word garden).
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
- Look: the website's world (docs/index.html): white page, soft grey surfaces, one green, SN Pro, pill buttons, round cards (see PRODUCT.md and DESIGN.md). Colours come only from tokens; edit the palette in
  `scripts/gen-theme.py`, never `envi-theme.css` by hand. A word's stage is shown with `components/seal/Seal.tsx`.

## Stats server (`stats-server/`)

Separate Vercel project `luom-stats` (https://luom-stats.vercel.app): `api/ping.ts` takes the app's daily ping into
Upstash Redis (layout in `lib/store.ts`), `api/stats.ts` serves the numbers to the token-gated owner page
`public/index.html` (token: `STATS_TOKEN` in Vercel, `LUOM_STATS_TOKEN` in the git-ignored `.env.local`). It also runs
the landing page's community board: `api/posts.ts` (public list + anonymous posting, CORS; rules in `lib/posts.ts`,
storage in `lib/board.ts`); public posts wait for approval in the owner page's Community tab (`api/admin.ts`), private
ones go only to the owner; emails are never shown publicly. Deploy with
`cd stats-server && vercel deploy --prod`. Its pure parts (`lib/ping.ts`, `lib/posts.ts`) are tested by `npm run test`.

## UI demo gallery

When asked to "build a UI demo", add it to the DEV-only gallery: a component under `src/renderer/src/pages/demos/`
(complex ones in `examples/`), registered in `pages/demos/registry.tsx` (`DEMOS`). Preview at `#/demos`.
