# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Electron desktop app, macOS only (Apple Silicon). Rendered with web tech, but it lives on the Mac: menu bar tray,
global hotkey, notifications, login item, small floating windows (capture popup, pop quiz card).

## Users

Vietnamese speakers learning English: a free public Mac app, mostly adults who work or study and meet English words
during their day (articles, docs, books, apps). The author is one of them. Typical use is short: a quick capture
mid-task, a 1–2 minute review between other work, a game or an episode when there is more time.

## Product Purpose

Pick up English words wherever you meet them, keep each with its Vietnamese meaning, and remember them. *Lượm* is
Vietnamese slang for "picked up" (*lượm được từ mới*). Success is words the learner actually met in real life
becoming words they know, with review that feels like play rather than drilling.

## Positioning

Words you met in real life, remembered through play: capture feeds the garden. Both halves matter equally:

- Capture anywhere: select a word in any app, press ⌥⌘E, and it is looked up and saved with its Vietnamese meaning.
- Every saved word is a plant in a 3D word garden; due words wilt and need watering. Review happens through spaced
  repetition (FSRS) and cute games, not just flashcards.

## Operating Context

- Capture: global hotkey → selection read via Accessibility (else clipboard) → capture popup.
- Study: FSRS sessions in five modes: Glance, Quick, Standard, Focus (typing), Play (games, XP, quests).
- Games: Word Bridge, Bubble Tea Shop, Word Fishing + aquarium, Firefly Night, Frog Hop, Garden rescue, quick
  timed games (match, unscramble, lightning, rain, sound).
- Daily Episodes: an AI-written serialized story, one episode a day using the learner's words, with a quiz.
- Reminders: daily notification, episode teasers, pop quiz cards in the screen corner, menu bar due count.
- Reading: EPUB, PDF and Markdown library with select-to-look-up and sentence translation.
- Dictionary lookup, lookup history, word lists to pick from, user collections, notes, CSV export.

## Capabilities and Constraints

- Local and private: no account, no cloud, single local user; data in `~/Library/Application Support/envi-learn/`.
- AI is optional (ChatGPT account, built-in free OpenRouter models, or Claude) for "Improve with AI" and stories.
- Light and dark themes, both first-class.
- UI copy is English; Vietnamese appears only in dictionary content (codebase rule in CLAUDE.md).
- Internal identifiers (`com.envilearn.app`, `envi-learn`, `EnViEntry`) stay unchanged; only the visible name is Lượm.
- Undecided: whether Daily Episodes keep the "miss a day and that page is lost" rule.

## Brand Commitments

- Name: Lượm (with the Vietnamese diacritics).
- Logo / app icon: keep the current one (`build/` icon assets, sidebar logo).
- Tone: playful. Games and rewards stay; they should be organized, not removed.
- The cute 3D critters and the garden are current assets, not binding for the new look; they may be restyled.

## Evidence on Hand

- Public download page: `docs/index.html` (GitHub Pages), README feature list.
- Real dictionary content: Vietnamese meanings, bilingual examples, US/UK audio.
- No testimonials, user counts, or reviews exist; do not invent them.

## Product Principles

1. Start from the learner's own words: everything begins with a word they actually met.
2. Two minutes is a full session: the next useful action is always obvious and quick to finish.
3. Play, not drill: progress should feel like growing something, and games are a first-class way to review.
4. Feels at home on the Mac: keyboard, menu bar, hotkeys and native conventions are part of the product.
5. Private by default: nothing leaves the device unless the learner turns on AI.

## Accessibility & Inclusion

- Text contrast meets WCAG AA (4.5:1 body text) in both themes.
- Core study loop fully keyboard-operable.
- Vietnamese diacritics must render well in every type choice.
- Respect reduced motion for celebrations and 3D scenes.
