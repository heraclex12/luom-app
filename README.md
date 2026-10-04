# EnVi Learn

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
- **Spaced repetition (FSRS)** — *Study* shows due reviews and new words each day, scheduled just before you would
  forget them. Rate each card *Again / Hard / Good*.
- **Daily reminders** — a notification at your chosen time ("12 words to review · 5 new words to learn"), plus
  optional **word flashes**: one of your words with its meaning pops up every few hours (9:00–22:00) so you keep seeing it.
- **Menu bar** — the due count sits in the menu bar; the app keeps running there when you close the window.
- **Word lists** — add words in bulk from bundled lists: Everyday English 1–3 (NGSL), Academic (NAWL), TOEIC, Business.
- **Dictionary, reader, phonetics** — look words up, read EPUB/PDF books with tap-to-look-up and sentence translation
  to Vietnamese, practise IPA sounds.
- **Optional AI** — add an Anthropic API key in *Settings → AI* to rewrite any entry with Claude
  (*Improve with AI*: more natural Vietnamese and better examples).
- **Private** — no account, no cloud. Everything lives in `~/Library/Application Support/envi-learn/`.
  *Settings → Data & about → Export CSV* backs up your words.

## Build and install

Requirements: macOS (Apple Silicon), Node 22 (`nvm use` reads `.nvmrc`), Xcode Command Line Tools
(`xcode-select --install`, for the small native selection helper in `native/`).

```bash
nvm use
npm install
npm run release:mac        # → release/mac-arm64/EnVi Learn.app and release/EnVi Learn-<version>-arm64.dmg
```

Open the `.dmg` and drag **EnVi Learn** to Applications. The app is not notarized (it's a personal build), so the
first time: right-click the app → **Open** → **Open** (or run `xattr -cr "/Applications/EnVi Learn.app"`).

### First-run permissions

1. **Notifications** — allow them when macOS asks (or *Settings → Reminders → Send test*).
2. **Accessibility** (lets the hotkey read the word you selected) — *Settings → Quick capture → Grant access…*
   (or *Allow* in the capture popup), then enable **EnVi Learn** in *System Settings → Privacy & Security →
   Accessibility*. Without it, only copied text (⌘C) can be captured.
   **After installing a new build**, macOS may keep the switch on but no longer trust the app (personal builds are
   not signed with an Apple ID): select EnVi Learn in that list, remove it with **–**, and add it again.
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
