# Lượm

*Lượm* is Vietnamese slang for "picked up". *Lượm được từ mới*: pick up new English words wherever you meet them,
keep them with Vietnamese meanings, and review them until they stick. macOS (Apple Silicon).

**[Download for Mac](https://heraclex12.github.io/luom-app/)**

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
- **Reminders**: a daily notification, episode teasers, and pop quiz cards that ask what your words mean (as often
  as every 10 minutes, up to 5 words a round, during the active hours you choose; they wait while you are away from
  your Mac).
- **Write back**: after a pop quiz (or from Play), use your words in a real situation: reply to a friend's text or
  an email, finish or fix a sentence, translate a line. AI feedback says how natural each word sounds (in English or
  Vietnamese), with a more natural version, and the word counts as a review. Your sentences are kept on the word card.
- **Say it**: say your words and read sentences aloud; your Mac's on-device speech recognition shows what came
  across. Words it hears as another word become your own *Misheard pairs* to practise.
- **Desktop widget** (macOS 14+): your words on the desktop, due ones first. Tap *Show meaning*, then *Again* or
  *Got it*: the answer counts as a review. Right-click → *Edit Widgets…* and search for Lượm.
- **Reading**: EPUB, PDF and Markdown with select-to-look-up and sentence translation.
- **AI help** (optional): *Improve with AI* writes richer examples and explanations, and Story mode writes short
  stories with your words.
- **Private**: no account, no cloud. Data lives in `~/Library/Application Support/envi-learn/`; export to CSV
  anytime. The app sends anonymous usage counts once a day (a random install ID, versions, how many AI answers and
  lookups were used; never your words); turn it off in *Settings → Data & about*.

## Install

Download the `.dmg` from [Releases](https://github.com/heraclex12/luom-app/releases) and drag **Lượm** to
Applications. It is signed and notarized by Apple, so it opens like any other app, and it updates itself.

Using 0.6.3 or older? Download the new version once by hand: those builds were signed differently, so they cannot
update to the notarized ones. macOS also asks for the permissions below once more.

Then allow, when asked or in *Settings*:

1. **Notifications**: *Settings → Reminders → Notification settings*, set Lượm to Banners or Alerts.
2. **Accessibility** (lets the hotkey read your selection): *System Settings → Privacy & Security → Accessibility*.
   If Lượm is listed but capture still only uses copied text, remove it with **−** and add it again.
3. **Microphone** and **Speech Recognition** (Say it): asked the first time you speak; everything stays on your Mac.

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

Needs Xcode (15 or later, license accepted) for the desktop widget (`npm run build:widget`). This builds, signs and
uploads the dmg, zip and `latest-mac.yml` to a GitHub release; installed apps pick it up within 6 hours.

- **Signing**: with a *Developer ID Application* certificate in the keychain, the build is signed with the hardened
  runtime and notarized through the `notarytool` keychain profile `luom`
  (`xcrun notarytool store-credentials luom --apple-id … --team-id …`); `LUOM_NOTARIZE=0` skips notarizing for local
  builds. Without one it falls back to a self-signed certificate. Updates only install when signed with the same
  certificate as the installed app.

## License

AGPL-3.0-or-later (see [LICENSE](LICENSE)), based on the open-source QiYan app. Reader engine: foliate-js (MIT).
Word lists: New General Service List, CC BY-SA 4.0. Dictionary data: Google Translate and the Free Dictionary API
(Wiktionary, CC BY-SA).
