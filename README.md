# Lượm

*Lượm* is Vietnamese slang for "picked up". *Lượm được từ mới*: pick up new English words wherever you meet them,
keep them with Vietnamese meanings, and review them until they stick. macOS (Apple Silicon).

## Features

- **Capture anywhere**: select a word in any app and press **⌥⌘E**. Lượm looks it up and saves it (to a collection
  if you like). With nothing selected, it uses the text you last copied.
- **Rich entries**: Vietnamese meanings, English definitions, bilingual examples, US / UK pronunciation, word forms,
  word family, synonyms and antonyms.
- **Study your way**: spaced repetition (FSRS) with five modes: Glance, Quick, Standard, Focus (typing) and Play
  (games, XP, quests). A 3D word garden shows how each word is growing; water its wilting plants (due words) in
  *Garden rescue*.
- **Games**: Word Bridge (spell the word to build a bridge), Bubble Tea Shop (spell orders for animal customers),
  Word Fishing (catch the right word; caught fish live in your aquarium and grow as you learn them), Firefly Night
  (catch the spelling you hear), Frog Hop (hop onto the right meanings), Garden rescue, plus quick timed games.
- **Daily episodes**: an AI-written serialized story, one episode a day with your words, ending on a cliffhanger.
  Miss a day and that page is lost.
- **Reminders**: a daily notification, episode teasers, and pop quiz cards that ask what one of your words means.
- **Reading**: EPUB, PDF and Markdown with select-to-look-up and sentence translation.
- **AI** (optional): *Improve with AI* and Story mode, using your ChatGPT account (unofficial: it automates the
  ChatGPT website, so use at your own risk), OpenRouter free models (built in) or Claude.
- **Private**: no account, no cloud. Data lives in `~/Library/Application Support/envi-learn/`; export to CSV
  anytime.

## Install

Download the `.dmg` from [Releases](https://github.com/heraclex12/luom-app/releases) and drag **Lượm** to
Applications. The app is not notarized, so open it the first time with right-click → **Open**. After that it updates
itself.

Then allow, when asked or in *Settings*:

1. **Notifications**: *Settings → Reminders → Notification settings*, set Lượm to Banners or Alerts.
2. **Accessibility** (lets the hotkey read your selection): *System Settings → Privacy & Security → Accessibility*.
   If Lượm is listed but capture still only uses copied text, remove it with **−** and add it again.

## Develop

Requires Node 22 (`nvm use`) and Xcode Command Line Tools.

```bash
npm install
npm run dev         # run with hot reload
npm run typecheck
npm run test        # runs inside Electron's Node
```

Architecture and conventions: [CLAUDE.md](CLAUDE.md).

## Release

```bash
# bump "version" in package.json, commit, then
git push && GH_TOKEN=<token> npm run release:publish
```

This builds, signs and uploads the dmg, zip and `latest-mac.yml` to a GitHub release; installed apps pick it up
within 6 hours.

- **Signing**: updates only install when signed with the same certificate, kept in `~/.luom-signing/`. Back it up.
- **Built-in AI key**: put `ENVI_OPENROUTER_KEY=…` in `.env.local` (git-ignored) before building. It can be
  recovered from the app, so use a key with a $0 credit limit.

## License

AGPL-3.0-or-later (see [LICENSE](LICENSE)), based on the open-source QiYan app. Reader engine: foliate-js (MIT).
Word lists: New General Service List, CC BY-SA 4.0. Dictionary data: Google Translate and the Free Dictionary API
(Wiktionary, CC BY-SA).
