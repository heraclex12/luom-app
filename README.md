# Lượm

*Lượm* is Vietnamese slang for "picked up", like finding something on the street. *Lượm được từ mới*: pick up
new words wherever you meet them.

A personal **English → Vietnamese vocabulary app for macOS**. Collect English words from anywhere (any Chrome
profile or window, PDFs, Slack…), get Vietnamese meanings, English definitions, bilingual examples and
pronunciation, and review them with spaced repetition until they stick.

## What it does

- **Capture from anywhere** — select (highlight) a word in any app and press **⌥⌘E**. A small popup looks it up,
  saves it to *My words* (and the collection you picked) and reads it aloud. The selected text always wins; if
  nothing is selected, the text you last copied is used. (Menu bar → *Add a word…* or the sidebar's *Add a word* also work.)
- **Collections** — group words your way (Animals, Vegetables, Work…). A word can be in several collections; browse
  or *Study* a single collection; the capture popup's *Save to* menu files new words straight into one.
- **Vietnamese + English** — Vietnamese meanings by part of speech, English definitions with Vietnamese translations,
  example sentences in English with Vietnamese translations, synonyms & antonyms, word forms (V2 / V3 / -ing,
  plural, comparative) and the word family (decide → decision, decisive, decisively).
- **Pronunciation** — US and UK neural voices for every word *and* every example sentence (cached, so it works
  offline after the first play; falls back to the macOS voices when offline).
- **Learning modes** — pick the style that fits you (first-run setup recommends one; switch anytime in
  *Settings → Learning style*):
  👀 **Glance** (words come to you as notifications with *Got it / Again* buttons), ⚡ **Quick** (tap the right
  meaning), 📚 **Standard** (flashcards), 🎯 **Focus** (type the word, listen & type, fill the blank — auto-graded,
  reminders until your goal is done), 🎮 **Play** (XP, combos, quests, matching game).
- **Motivation** — daily goal ring, streak 🔥, levels & XP, daily quests, 7-day activity, a matching game, and
  **Story mode** (Claude writes a short story with your words, Vietnamese hidden until you want it; needs an API key).
- **Spaced repetition (FSRS)** — *Study* shows due reviews and new words each day, scheduled just before you would
  forget them. Rate each card *Again / Hard / Good*.
- **Daily reminders** — a notification at your chosen time ("12 words to review · 5 new words to learn"), plus
  optional **word flashes**: one of your words with its meaning pops up every few hours (9:00–22:00) so you keep seeing it.
- **Menu bar** — the due count sits in the menu bar; the app keeps running there when you close the window.
- **Word lists** — add words in bulk from bundled lists: Everyday English 1–3 (NGSL), Academic (NAWL), TOEIC, Business.
- **Dictionary, reader, phonetics** — look words up, read EPUB and PDF books and Markdown notes with tap-to-look-up and sentence translation
  to Vietnamese, practise IPA sounds.
- **Optional AI** (*Improve with AI* on word cards, and Story mode). Pick a service in *Settings → AI*:
  **ChatGPT** (your own subscription: sign in once in a built-in chatgpt.com window; Lượm then runs each
  request in a hidden temporary chat. This automates the ChatGPT website, so use it at your own risk),
  **OpenRouter** (free models) or **Claude** (Anthropic API key). Keys are stored encrypted on this Mac.
  AI works out of the box: release builds include a free OpenRouter key, so when you are not signed in to ChatGPT
  (or it fails) Lượm uses free models, trying in order: Nemotron 3 Super, Inkling, Inkling Small,
  Nemotron 3.5 Lightning, Qwen 3.8 27B (`FREE_MODEL_FALLBACKS` in `src/shared/ai.ts`). Your own OpenRouter key, if
  you add one, takes priority.

  **Building with the built-in key:** put `ENVI_OPENROUTER_KEY=sk-or-…` in `.env.local` (git-ignored) before
  `npm run release:mac`. The key is scrambled in the bundle but anyone with the app can recover it, so use a key
  limited to free models ($0 credit limit on openrouter.ai/settings/keys).
- **Private** — no account, no cloud. Everything lives in `~/Library/Application Support/envi-learn/`.
  *Settings → Data & about → Export CSV* backs up your words.

## Build and install

Requirements: macOS (Apple Silicon), Node 22 (`nvm use` reads `.nvmrc`), Xcode Command Line Tools
(`xcode-select --install`, for the small native selection helper in `native/`).

```bash
nvm use
npm install
npm run release:mac        # → release/mac-arm64/Luom.app (shown as Lượm) and release/Luom-<version>-arm64.dmg
```

Open the `.dmg` and drag **Lượm** to Applications. The app is not notarized (it's a personal build), so the
first time: right-click the app → **Open** → **Open** (or run `xattr -cr /Applications/Luom.app`).

### First-run permissions

1. **Notifications** — allow them when macOS asks (or *Settings → Reminders → Send test*).
2. **Accessibility** (lets the hotkey read the word you selected) — *Settings → Quick capture → Grant access…*
   (or *Allow* in the capture popup), then enable **Lượm** in *System Settings → Privacy & Security →
   Accessibility*. Without it, only copied text (⌘C) can be captured.
   **After installing a new build**, macOS may keep the switch on but no longer trust the app (personal builds are
   not signed with an Apple ID): select Lượm in that list, remove it with **–**, and add it again.
3. **Open at login** — *Settings → General* (keeps reminders and the hotkey working after a restart).

## Development

```bash
npm run dev          # start in development (hot reload)
npm run typecheck    # TypeScript (main + renderer)
npm run test         # unit tests (run inside Electron's Node)
npm run db:generate  # after editing src/renderer/src/db/schema.ts
```

Architecture and conventions: see [CLAUDE.md](CLAUDE.md).

## Credits and licence

Built on the open-source [QiYan](https://nvwa.world) app — code under [AGPL-3.0-or-later](LICENSE). The QiYan name and
icon are not used. Reader engine: foliate-js (MIT, `src/renderer/src/vendor/foliate-js/`). Word lists © Browne,
Culligan & Phillips (newgeneralservicelist.com), CC BY-SA 4.0. Dictionary data: Google Translate and the Free
Dictionary API (Wiktionary, CC BY-SA). Phonetics audio in `src/renderer/public/phonetic/` belongs to its authors
(see the `index.json` files there).

## Renamed from EnVi Learn

The bundle id (`com.envilearn.app`) and the data folder (`~/Library/Application Support/envi-learn/`) are unchanged,
so words, settings and permissions carry over. The bundle is `Luom.app` on disk (Finder shows Lượm). After installing it, delete the old *EnVi Learn.app*; if you use
*Open at login*, switch it off and on once in Settings so it points at the new app.

## Releases and auto-update

Lượm updates itself from [GitHub Releases](https://github.com/heraclex12/luom-app/releases): it checks on launch and
every 6 hours, downloads in the background and offers *Restart to update* (notification, menu bar, *Settings → Data &
about*). Quitting also installs a downloaded update.

To publish a version: bump `version` in `package.json`, commit, then

```bash
git push && GH_TOKEN=<token with repo scope> npm run release:publish   # builds, signs, uploads dmg + zip + latest-mac.yml
```

**Signing.** macOS only installs an update that is signed like the running app, so every release must be signed with
the same certificate. There is no Apple Developer ID; builds use a self-signed certificate kept in `~/.luom-signing/`
(its own keychain; `scripts/after-pack.cjs` unlocks it and signs). **Back up that folder**: a release signed with a
different certificate cannot update existing installs (users would download it manually once). Builds without it are
ad-hoc signed and cannot auto-update.

New users still need the first-launch steps above (the app is not notarized). Updates after that install by themselves.
