---
name: Lượm
description: A bright white Mac app for keeping English words, in the same world as its website.
colors:
  ink: "#1d1d1f"
  ink-secondary: "#424245"
  ink-muted: "#6e6e73"
  page: "#ffffff"
  soft-surface: "#f5f5f7"
  green: "#2a7d5a"
  green-hover: "#226a4c"
  green-text: "#1f6b4b"
  green-wash: "#e3f4ea"
  mint: "#9fe0bf"
  coral: "#e5533d"
  amber: "#f2a531"
  blue: "#4a6cf0"
  danger: "#d23c27"
  danger-text: "#b4362b"
  warning-text: "#7a4d00"
  rail-muted: "#5f5f64"
  dark-page: "#111312"
  dark-soft-surface: "#1b1d1c"
  dark-raised: "#222524"
  dark-popover: "#2a2d2c"
  dark-rail: "#171918"
  dark-ink: "#f5f5f7"
  dark-ink-muted: "#a1a1a6"
  dark-green: "#4fbf8a"
  dark-green-text: "#86d9b0"
  dark-coral: "#f0705b"
  dark-amber: "#f5b54a"
  dark-blue: "#7d95ff"
typography:
  display:
    fontFamily: "SN Pro, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "SN Pro, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    letterSpacing: "-0.015em"
  title:
    fontFamily: "SN Pro, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "-0.015em"
  body:
    fontFamily: "SN Pro, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "SN Pro, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  hand:
    fontFamily: "Patrick Hand, SN Pro, cursive"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  2xl: "24px"
  field: "12px"
  card: "20px"
  pill: "9999px"
spacing:
  tile-gap: "12px"
  card-x: "24px"
  card-y: "20px"
  section: "40px"
  page-x: "40px"
components:
  button-brand:
    backgroundColor: "{colors.green}"
    textColor: "{colors.page}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "8px 16px"
    typography: "{typography.label}"
  button-brand-hover:
    backgroundColor: "{colors.green-hover}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.page}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "rgb(29 29 31 / 0.08)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    height: "36px"
  input:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "36px"
    padding: "0 14px"
  card:
    backgroundColor: "{colors.soft-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px 24px"
  game-tile:
    backgroundColor: "{colors.soft-surface}"
    rounded: "{rounded.card}"
    padding: "12px"
  sidebar:
    backgroundColor: "{colors.soft-surface}"
    textColor: "{colors.ink}"
  sidebar-item-active:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  word-seal:
    backgroundColor: "{colors.green}"
    textColor: "{colors.page}"
    size: "22px"
---

# Design System: Lượm

## Overview

**Creative North Star: "The Website, Opened as an App"**

Lượm looks like the landing page it is downloaded from (docs/index.html): a bright white page, soft grey surfaces instead of drawn boxes, ink text, and one fresh green that marks the single action, links, focus and the word seal. The mood is calm, friendly and current. Big bold SN Pro headlines say what is due; everything else is quiet, and round shapes keep it soft.

The density is that of a Mac app at reading distance: generous page padding, sections 40px apart, cards and tiles that are filled grey shapes rather than outlined ones. Colour beyond the green is small and purposeful: coral, amber and blue appear as skill tiles, rating marks and the thirsty ring, never as page fields. A mint highlighter brush sits behind learned words in sentences and behind selected text. Small handwritten notes in Patrick Hand, in green, add the website's scribble voice to status lines.

Light and dark are designed together with the same roles. Dark mode is a green-tinted near-black, not neutral grey, with the green lifted for contrast. This world replaces the earlier Đông Hồ folk-print world (warm paper, carved seals, heavy dark rail); none of that vocabulary carries over.

**Key Characteristics:**
- White page, soft grey (#f5f5f7) sidebar and cards, no hairline boxes around cards.
- One green for the one action per view, links, focus rings, caret and the word seal.
- Pill buttons, 20px cards, 12px fields.
- SN Pro everywhere, bold and slightly tight for titles; Patrick Hand only for short green notes.
- Soft, wide shadows only on things that float or lift on hover.
- Light and dark from one generator, AA contrast checked in both.

## Colors

A white-and-soft-grey neutral field with ink text, one green voice, a mint highlighter, and three small marker colours.

### Primary
- **Fresh Leaf Green** (green): the brand fill. Study and Add a word pills, the active sidebar icon, progress bars, focus outline, caret, accent-color, solid "bloom" seals and the Today mark of the streak. It is a step deeper than the website's #2f8a63 so white labels on it pass AA (5.0:1). Hover deepens to green-hover.
- **Deep Leaf Text** (green-text): green used as text on white, soft grey and green-wash: links such as "All 30 words", accent labels and the Patrick Hand notes.
- **Green Wash** (green-wash): accent and success chips, selected states, correct-answer fills.

### Secondary
- **Mint Brush** (mint, used at 75% as the `--marker` token): the highlighter behind vocabulary words inside sentences (`.marker`, lower half only) and the `::selection` colour. In dark mode the marker is the dark green at 35%.

### Tertiary
- **Coral** (coral): the Spelling and Speaking skill tiles, the Again rating, streak and recording marks; danger fills use the deeper danger value.
- **Amber** (amber): due and thirsty (the ring on a thirsty seal), the daily goal, the Speed skill tile. Text on amber is ink, never white.
- **Signal Blue** (blue): the Listening and Writing skill tiles and book covers.

### Neutral
- **Ink** (ink): all primary text, the dark Typing skill tile, the tooltip background and the ink button.
- **Graphite** (ink-secondary) and **Pebble** (ink-muted): secondary copy and muted captions; muted passes AA on both white (5.1:1) and soft grey (4.7:1).
- **Page White** (page): the page, popovers, fields and the active sidebar pill.
- **Soft Surface** (soft-surface): sidebar, cards, game tiles, the review strip. Raised by tone, not by line.
- Hairlines and neutral fills are ink at low alpha (borders 8%, strong 16%; neutral chip 5%; control 8%, hover 14%), so they tint correctly on any surface.
- **Dark mode**: page dark-page, cards dark-soft-surface, raised dark-raised, popovers dark-popover, sidebar dark-rail, text dark-ink / dark-ink-muted; green becomes dark-green for accents (ink-dark labels on it) while the brand pill keeps the light green with white text; markers lift to dark-coral, dark-amber, dark-blue.

### Named Rules
**The Generator Rule.** The palette is edited only in `scripts/gen-theme.py` (light and dark maps) and regenerated with `python3 scripts/gen-theme.py`, which also prints the WCAG contrast pairs. `styles/envi-theme.css` is generated and never edited by hand; hand-written globals live in `scripts/theme-tail.css`.

**The Tokens-Only Rule.** Components take colour only from tokens (Tailwind utilities such as `bg-surface-1`, `text-text-accent`, `bg-fill-brand`, `bg-son`, `bg-hoe`, `bg-dong`, `bg-cham`, `bg-seal`, `rail-*`). No hex values in components.

**The One Green Rule.** Each view has one green action. Other actions are soft grey (secondary) or ink pills; green as text is for links and notes.

**The Both Modes Rule.** Every colour change is made for light and dark at once and must keep AA (4.5:1 for text) in both, as reported by the generator.

**The Markers Stay Small Rule.** Coral, amber and blue appear as tiles, rings, dots and rating marks. They do not carry body text: white on coral (3.7:1) and white on blue (4.5:1 at the edge) are for icons and short bold labels only.

## Typography

**Display Font:** SN Pro (variable 200 to 900, with -apple-system, Helvetica Neue fallback)
**Body Font:** SN Pro
**Hand Font:** Patrick Hand (falls back to SN Pro)
**Mono Font:** Geist Mono (code only)

**Character:** One rounded, friendly grotesque carries everything; hierarchy comes from size and weight, not from a second face. Patrick Hand is a small handwritten aside, like the scribbles on the website.

### Hierarchy
- **Display** (700, 2.75rem, 1.08, -0.015em): the Home due headline ("3 words to review"), balanced.
- **Headline** (700, 2.25rem, -0.015em): page titles such as Play.
- **Title** (700, 1.25rem): section headings ("Your garden", "Review rounds"); card titles at 1.125rem.
- **Body** (400, 1rem, relaxed 1.625): page intros, capped at 52 to 60ch; secondary colour.
- **Label** (600, 0.875rem): buttons, sidebar items, tile names. Small app UI text uses the 11 to 14px system scale.
- **Hand** (Patrick Hand 400, 1rem, 1.25, green-text): one-line status notes ("3 plants need water", pages missed, the pop quiz prompt).
- Headwords and the wordmark use `.font-display` (700, -0.03em).

### Named Rules
**The One Face Rule.** SN Pro for every role; weight and size make the hierarchy. No serif and no system display face.

**The Note Rule.** Patrick Hand is for short green notes of one line, never for headings, buttons, body copy or data.

## Layout

A fixed light sidebar (soft grey) on the left, the page on white. Page content is centred in a column of 56rem (Play) to 64rem (Home) with 32 to 40px side padding and 48 to 64px top padding. Sections stand 40px apart; headings sit 16px above their grid. Game tiles run in a 2-column grid (3 for Speak and write, 2 to 3 for quick drills) with a 12px gap, collapsing to one column on narrow windows (checked at 900px). Home leads with the headline and its pill actions on one line (actions wrap below on narrow widths), then the review strip, then the garden card (340px tall), then episode and progress cards. Numbers use tabular figures.

## Elevation & Depth

Depth is tonal first: soft grey shapes on white, white pills on soft grey. Cards and tiles have no shadow and no border at rest. Shadows are soft and wide, ink-tinted (pure black in dark), and appear only on things that float (popovers, menus, dialogs, tooltips) or as a hover response on clickable cards and tiles.

### Shadow Vocabulary
- **Hover lift** (`--shadow-md`): clickable cards and game tiles rise 2px with this shadow on hover (300ms, cubic-bezier(0.16,1,0.3,1)); removed under reduced motion.
- **Small** (`--shadow-sm`): the Add a word pill and white chips on the sidebar.
- **Popover / panel** (`--shadow-popover`, `--shadow-panel`): a 1px ink ring at 6% plus a wide soft drop for menus, selects, dialogs.
- **Field ring** (`--shadow-field-ring`): an inset 1px ink ring at 14% that draws input edges.
- **Focus** (`--focus-shadow`): 2px page-colour gap then 2px green.

### Named Rules
**The Flat At Rest Rule.** Nothing on the page casts a shadow until it floats or is hovered.

## Shapes

Round and soft. Buttons and the sidebar's Add a word control are full pills. Cards, tiles, dialogs and popovers use 20px corners; inputs, selects and menus 12px; the review strip 14px; the default rounded scale is softened (6 / 10 / 14 / 18 / 24px). Skill icon squares inside tiles are rounded squares. The word seal is a squircle-like tile with a corner of 32% of its size. Borders are rare: answer-option buttons keep a 1px outline because it carries idle, correct and wrong state colour; elsewhere edges come from tone.

## Components

### Buttons
Soft pills that squish when pressed.
- **Shape:** full pill; heights 32 / 36 / 40px (`lg` is 40px with a 15px label); icon buttons are circles. No shadow on any button.
- **Brand:** green fill, white semibold label; the one action per view (Study, Add a word).
- **Primary (ink) / Secondary / Ghost:** ink pill with white text; soft grey control fill with ink text (Water plants, Your aquarium); transparent with secondary text that darkens on hover. Next to a brand pill the second action is a ghost in ink (Home: Browse word lists beside Study), not a second filled pill.
- **Labels, not icons:** a text button says what it does in words and carries no leading icon. Icons stay only on icon-only buttons and where the glyph is the action itself (play sound, mic, undo, shuffle, add).
- **The AI chip (the one exception):** Improve with AI is a small green-tinted pill (`bg-accent` wash, `border-accent` outline, green label) with a sparkle, so the optional AI action is findable at a glance. Nothing else uses this treatment or the sparkle.
- **Danger:** danger fill, white label.
- **Press:** scales to 0.975 on press, springs back over 450ms.
- **Focus:** 2px green outline offset 1px.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** soft surface (dark-soft-surface in dark).
- **Shadow Strategy:** none at rest; hover lift when the whole card is a link.
- **Border:** none.
- **Internal Padding:** 20px x 24px for feature cards, 12px for tiles.

### Inputs / Fields
- **Style:** white fill (5% light tint in dark), 12px corners, 36px tall, 14px side padding, inset 1px ink ring at 14%.
- **Focus:** fill turns popover white and the ring becomes the green focus shadow.
- **Error / Disabled:** inset 1px danger-border ring; 50% opacity.
- Placeholders in muted ink; caret green.

### Navigation (sidebar)
Soft grey rail with the app icon and the SN Pro bold "Lượm" wordmark, a full-width green Add a word pill with its shortcut, then quiet items (18px Lucide icons, 2px stroke). The active item is a white rounded pill with a green icon and semibold label; hover is a 5% ink wash. The Free AI answers meter (green bar on a white track) and the Settings switcher sit at the bottom above a rail hairline. Dark: dark-rail with dark-popover active pill.

### Game Tiles
Soft grey 20px tiles with a 56px rounded-square skill icon on the left, the game name in bold, the skill in muted small text beside it, a one-line description and an optional green Patrick Hand status. Skill colours: Spelling and Speaking coral, Recall green, Listening and Writing blue, Speed amber (ink icon), Typing ink. Tiles lift on hover.

### Word Seal (signature)
A rounded tile carrying the word's first letter (SN Pro 750), showing the word's stage at 16 / 22 / 44px: **seed** a dashed neutral outline with a muted letter; **sprout** a green outline with the lower half filled at 30%; **thirsty** a light green wash with an amber ring outside; **bloom** solid green with a white letter. After a Good rating the seal is pressed in: it drops from 1.5x with an 8deg turn and settles with a small overshoot (440ms, ease-out-expo curve), disabled under reduced motion. Always rendered through `components/seal/Seal.tsx`.

### Highlighter
The mint brush behind the lower half of a vocabulary word inside a sentence (`.marker`), also used as the text selection colour.

### Desktop widget
`native/widget/LuomWidget.swift` (SwiftUI, outside the web tokens) mirrors this world by hand: white / `#111312` ground, the same ink, muted and green values, the rounded green seal with the word's first letter, pill buttons (green Show meaning / Got it, soft grey Again / Next) and the word in bold green inside its example. Type is SF Pro Rounded, the system's closest kin to SN Pro, since the extension can't load the web font files. Change its `Palette` whenever `scripts/gen-theme.py` changes.

## Do's and Don'ts

### Do:
- **Do** change colours only in `scripts/gen-theme.py`, rerun `python3 scripts/gen-theme.py`, and read its contrast report for light and dark.
- **Do** take every colour from a token; design each change in light and dark together and keep AA in both.
- **Do** give each view one green pill; make the rest soft grey, ink or ghost pills.
- **Do** separate surfaces by tone: soft grey cards on white, white pills on soft grey, 20px corners.
- **Do** keep shadows for floating layers and hover lift, with reduced-motion fallbacks for lifts and the seal press.
- **Do** show a word's stage with the word seal, and highlight vocabulary in sentences with the mint marker.
- **Do** keep the 1px outline on answer-option buttons; it carries idle, correct and wrong state.

### Don't:
- **Don't** edit `styles/envi-theme.css` by hand or put hex values in components.
- **Don't** outline cards or tiles with hairline borders or give them shadows at rest.
- **Don't** set body text in coral or blue, or white text on amber.
- **Don't** use Patrick Hand for headings, buttons or more than a short line.
- **Don't** put a decorative icon in front of a button label, or sparkles on anything but the Improve with AI chip.
- **Don't** bring back the folk-print vocabulary: warm paper, carved red seals, woodcut textures or the heavy dark rail.
- **Don't** add small uppercase tracked labels above headings or titles.
