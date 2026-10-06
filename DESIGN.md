---
name: Lượm
description: Words you met in real life, kept as a Đông Hồ folk print, flat pigment on paper with a son-red seal for every word that becomes yours.
colors:
  son-red: "#b3342a"
  son-red-deep: "#9a2b22"
  hoe-yellow: "#e3b12f"
  dong-green: "#2e7656"
  cham-indigo: "#2d4f8a"
  cham-indigo-text: "#26437a"
  than-tre-ink: "#1d1915"
  ink-secondary: "#4a4239"
  ink-muted: "#6a6055"
  paper: "#f3efe6"
  paper-raised: "#f8f5ee"
  paper-sheet: "#fffdf8"
  on-pigment: "#fffaf2"
  rail-ink: "#1d1915"
  rail-label: "#f3ece0"
  rail-muted: "#b9ae9c"
  rail-hover: "#2c2620"
  rail-active: "#3a322a"
  warning-wash: "#f6e5ad"
  warning-text: "#674a05"
  success-wash: "#d8eadf"
  danger-text: "#8a231c"
  dark-paper: "#14110e"
  dark-paper-raised: "#1a1612"
  dark-sheet: "#221d18"
  dark-ink: "#f1e9dc"
  dark-ink-secondary: "#cbbfac"
  dark-ink-muted: "#a59985"
  dark-rail: "#0e0c0a"
  dark-son-red: "#d44a3c"
  dark-son-fill: "#c9402f"
  dark-dong-green: "#4fa57f"
  dark-cham-indigo: "#7d9bd6"
typography:
  display:
    fontFamily: "Bitter, Rockwell, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  headword:
    fontFamily: "Bitter, Rockwell, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
  headline:
    fontFamily: "Bitter, Rockwell, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Bitter, Rockwell, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  term:
    fontFamily: "Bitter, Rockwell, Georgia, serif"
    fontSize: "15px"
    fontWeight: 600
  lead:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'cv11', 'ss01'"
  body:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  mono:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  hair: "2px"
  sm: "4px"
  md: "5px"
  lg: "6px"
  card: "8px"
  pill: "9999px"
spacing:
  rail-collapsed: "52px"
  rail-expanded: "224px"
  bar: "48px"
  page-x: "40px"
  section: "40px"
  section-lg: "48px"
components:
  button-brand:
    backgroundColor: "{colors.son-red}"
    textColor: "{colors.on-pigment}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-brand-hover:
    backgroundColor: "{colors.son-red-deep}"
  button-brand-lg:
    backgroundColor: "{colors.son-red}"
    textColor: "{colors.on-pigment}"
    rounded: "{rounded.lg}"
    padding: "0 24px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.than-tre-ink}"
    textColor: "{colors.on-pigment}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.than-tre-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    height: "36px"
  input:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.than-tre-ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  rail:
    backgroundColor: "{colors.rail-ink}"
    textColor: "{colors.rail-muted}"
    width: "224px"
  rail-item-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.rail-label}"
    rounded: "{rounded.sm}"
  rail-add-word:
    backgroundColor: "{colors.son-red}"
    textColor: "{colors.on-pigment}"
    rounded: "{rounded.sm}"
    height: "36px"
  top-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.than-tre-ink}"
    height: "48px"
  card:
    backgroundColor: "{colors.paper-raised}"
    rounded: "{rounded.card}"
  rating-key:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.than-tre-ink}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  due-row:
    backgroundColor: "{colors.warning-wash}"
    textColor: "{colors.than-tre-ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  ink-block-row:
    backgroundColor: "{colors.rail-ink}"
    textColor: "{colors.rail-label}"
    rounded: "{rounded.card}"
    padding: "20px 24px"
  seal-md:
    backgroundColor: "{colors.son-red}"
    textColor: "{colors.on-pigment}"
    rounded: "{rounded.hair}"
    size: "22px"
---

# Design System: Lượm

## Overview

**Creative North Star: "The Đông Hồ Print"**

Lượm is a Vietnamese folk woodblock print (tranh Đông Hồ) turned into a Mac app: flat pressed pigment on a warm paper ground, carved black-ink lettering, and a son-red seal that stamps each word as the learner makes it theirs. Colour arrives as solid blocks of a small named pigment set, never as tints or glows; edges are cut, not softened; a single hairline weight separates things. The shell is an ink-black rail beside a paper page, so the app reads as one printed sheet with its ink block on the left.

Density is calm and editorial: one headline in the carved slab face states what is due, one son-red action sits beside it, and everything else steps down in Be Vietnam Pro. Dark mode is the same print inverted onto ink: the paper becomes near-black (`dark-paper`), the ink becomes paper-cream, and the pigments lift in lightness to stay AA. Both themes are first-class.

The world rejects the calm grey SaaS sidebar with a single jade accent: no glass, no decorative gradients, no soft drop-shadowed cards at rest.

**Key Characteristics:**
- Ink rail + paper page; the page is one sheet with hairline divisions.
- Five named pigments (son, hoa hòe, gỉ đồng, chàm, than tre ink), each with a fixed meaning.
- Bitter (carved slab) for anything a word or a page is called; Be Vietnam Pro for everything you operate.
- Small cut radii (2–8px); flat at rest; shadows only on things that float.
- The seal (đóng dấu) is the signature: a carved 5×5 seal-script chop that marks a word's stage and presses on Good.

## Colors

A natural-pigment palette pressed flat onto shell-white paper, with near-black bamboo-charcoal ink for text and the shell.

**Source of truth.** Every palette value is edited in `scripts/gen-theme.py` (pigment constants and the `light` / `dark` maps) and regenerated with `python3 scripts/gen-theme.py`, which writes `src/renderer/src/styles/envi-theme.css` and prints the WCAG contrast of the key text pairs. Never edit `envi-theme.css` by hand; it is overwritten. The hand-written tail (body ink, selection, placeholder, `.marker`, `.font-display`) lives in `scripts/theme-tail.css` and is appended verbatim. Tailwind utilities (`bg-son`, `bg-hoe`, `bg-dong`, `bg-cham`, `bg-rail-bg`, `text-rail-fg`, `bg-paper`, `bg-seal`) are wired in `styles/theme.css`.

### Primary
- **Son Earth Red** (`son-red`; dark `dark-son-red` for pigment and seal, `dark-son-fill` for the button fill): the one action colour and the seal. The Study / Play block on Home, "Add a word" on the rail, the finish-screen "Done" button, the text caret, the Again rating dot, the streak flame. Hover deepens to `son-red-deep`. Danger is a deeper shade of the same red family, not a second red.

### Secondary
- **Hoa Hòe Sophora Yellow** (`hoe-yellow`): due and thirsty. The ring around a thirsty seal, the active rail icon, the daily-goal bar, the Hard rating dot, the arrow on the ink-block row. Its wash (`warning-wash`) is the due-words row; its 50% alpha is the highlighter (`.marker`, and `::selection`) pressed behind the lower half of a vocabulary word in a sentence (32% in dark).

### Tertiary
- **Gỉ Đồng Copper Green** (`dong-green`; dark `dark-dong-green`): growing and success. The Good rating dot, Recall games, success washes (`success-wash`).
- **Chàm Indigo** (`cham-indigo`; dark `dark-cham-indigo`): links, info and focus. Text links use `cham-indigo-text`; the focus ring is a 2px paper gap then 2px indigo. Listening games.

### Neutral
- **Than Tre Ink** (`than-tre-ink`): primary text, the `primary` button fill, tooltips, the rail block in light mode.
- **Ink Secondary / Muted** (`ink-secondary`, `ink-muted`): supporting copy and metadata; muted still clears 4.5:1 on paper and raised surfaces.
- **Giấy Paper** (`paper`): the page ground and top bar. `paper-raised` for cards and rating keys, `paper-sheet` for fields, panels and popovers.
- **Rail** (`rail-ink`, `rail-label`, `rail-muted`, `rail-hover`, `rail-active`): the ink block of the shell; dark mode drops it to `dark-rail`, one step below the dark page.
- **Hairlines**: ink at 12% (`border`), 24% (`border-strong`), 45% (`border-stronger`); dark uses paper-cream at 12 / 22 / 42%.

### Named Rules
**The Pigment Meaning Rule.** Each pigment says one thing everywhere: son = act / mastered, hoa hòe = due, gỉ đồng = growing / good, chàm = link / info / focus, ink = structure. Skill blocks on Play reuse the same map (Spelling son, Recall đồng, Listening chàm, Speed hòe, Typing ink).

**The One Red Block Rule.** A screen carries one son-red action block. Everything else that is clickable is secondary (hairline), ghost, or an indigo link.

**The Flat Pigment Rule.** Pigment is laid as a solid fill or as a hard-stop band (the highlighter, the half-inked sprout seal). No soft blends, no colour-to-colour gradients.

## Typography

**Display Font:** Bitter (with Rockwell, Georgia, serif)
**Body Font:** Be Vietnam Pro (with system-ui, -apple-system, Helvetica Neue, sans-serif)
**Label/Mono Font:** Geist Mono for code only

**Character:** Bitter is the carved slab of the print's lettering, heavy and square-footed; Be Vietnam Pro is the quiet working voice, drawn for Vietnamese so diacritics in meanings and examples sit cleanly. All three are self-hosted per subset (Vietnamese, Latin-ext, Latin) in `styles/fonts.css`; body text enables `cv11` and `ss01`.

### Hierarchy
- **Display** (Bitter 700, 2.75rem, line-height 1.08, -0.015em): the Home headline that states what is due ("4 words to review").
- **Headword** (Bitter 600, 3rem; 2.25rem below `sm`): the word itself on study and detail.
- **Headline** (Bitter 700, 1.875rem): finish screen and page-level titles.
- **Title** (Bitter 700, 1.25rem): section heads such as "Your garden"; game names at 1.125rem.
- **Term** (Bitter 600, 15px): a word named inside a list, row or recap.
- **Lead** (Be Vietnam Pro 400, 1rem, 1.625): the line under a headline; held to 52–62ch.
- **Body** (Be Vietnam Pro 400, 0.875rem): UI copy, nav labels, buttons (500–600).
- **Label** (Be Vietnam Pro 500, 0.75rem): metadata, skill names, day labels, key hints. Numbers set `tabular-nums`.

### Named Rules
**The Carved Name Rule.** If it is a word being learned or the name of a place, page, game or story, set it in Bitter. If it is something you press or read past, set it in Be Vietnam Pro.

**The Sentence Case Rule.** Headings and labels are sentence case at normal tracking; the print's lettering does not shout.

## Layout

A two-column shell: the ink rail (224px, collapsible to 52px) and the paper page. Each page has a 48px sticky top bar of solid paper with one hairline under it, carrying the location as a breadcrumb; a back arrow appears only on nested pages. Content sits in a centred column: Home and Play at `max-w-5xl` (1024px) with 40px side padding, reading surfaces at `max-w-2xl` / `max-w-3xl`, finish and study cards at `max-w-xl`. Vertical rhythm moves in large steps between sections (40–48px, a hairline rule plus 32px before the progress block) and small steps inside them (8–16px). Home leads with headline + actions on one baseline row (wrapping below ~1100px), then the due-words row, the garden (340px frame), and one "next" row. Long copy is held to 52–62ch.

## Elevation & Depth

Flat by default. Depth comes from tone (paper → raised paper → sheet) and the hairline, not from shadows; cards at rest carry a 1px border, not a shadow. Shadows exist only for things that genuinely float above the sheet: popovers, panels, tooltips, and the hardcover book object. Dark mode swaps ink-tinted shadows for black ones and adds a 1px cream ring so floating surfaces still read.

### Shadow Vocabulary
- **Hairline lift** (`box-shadow: 0 1px 0 rgb(29 25 21 / 0.06)`): the faintest separation; bookshelf covers.
- **Float** (`box-shadow: 0 1px 2px rgb(29 25 21 / 0.06), 0 4px 12px rgb(29 25 21 / 0.06)`): detail-size book cover.
- **Popover** (`box-shadow: 0 2px 4px rgb(29 25 21 / 0.08), 0 10px 24px rgb(29 25 21 / 0.12)`): menus, selects.
- **Panel** (`box-shadow: 0 0 0 1px rgb(29 25 21 / 0.14), 0 2px 4px rgb(29 25 21 / 0.08), 0 10px 24px rgb(29 25 21 / 0.12)`): dialogs and sheets.
- **Field ring** (`box-shadow: inset 0 0 0 1px rgb(29 25 21 / 0.18)`): input stroke.
- **Focus** (`box-shadow: 0 0 0 2px #f3efe6, 0 0 0 4px #2d4f8a`): keyboard focus.

### Named Rules
**The Pressed Not Lifted Rule.** Nothing on the sheet hovers. Hover changes the fill or the hairline; the only lift is for an object that is literally above the page.

## Shapes

Cut, small corners: 2px on seals and swatch dots, 4px on small buttons, rail items and kbd keys, 5px on default buttons, fields and pigment icon blocks, 6px on large buttons, rating keys and the due row, 8px (`--radius-card`) on cards, the garden frame and the ink-block row. Fully round only for progress tracks, status dots and avatars. One hairline weight (1px) for every border. Book covers are 3:4 pigment blocks with a 1px spine line at 25% of the ink. The seal is a square; large seals carry a carved double frame (2.5px rim, a 1px inner line).

## Components

### Buttons
Printed blocks: solid pigment, semibold label, a tiny spring on press.
- **Shape:** cut corners (4px sm, 5px default, 6px lg); heights 32 / 36 / 44px.
- **Brand:** son red with cream label, the one action per screen (Study, Play, Done). Hover `son-red-deep`.
- **Primary:** ink fill with cream label, for confirmation inside dialogs.
- **Secondary:** transparent with a 24% ink hairline; hover adds a 6% ink wash and darkens the hairline to 45%.
- **Ghost:** no fill, secondary ink; hover takes the 6% wash and primary ink.
- **Press / Focus:** `scale(0.975)` in 60ms, released on a 450ms overshoot spring (`--btn-spring`); colours ease in 120ms. Focus is a 2px indigo outline at 1px offset.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** `paper-raised`, hover to `paper-sheet`.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1px `border`, `border-strong` on hover.
- **Internal Padding:** 10–12px for tiles, 20–24px for rows.
- **Game tile:** a pigment block (skill colour, white or ink icon) beside the game name in Bitter, the skill in label size, and status in indigo.
- **Ink-block row:** the Home "next" row (episode waiting, garden rescue) prints as a block of rail ink with a 44px son or đồng icon block and a hòe arrow.
- **Due row:** sophora wash at 50% with a 60% sophora hairline; each due word shows a small thirsty seal and its name in Bitter; the whole row starts the review.

### Inputs / Fields
- **Style:** `paper-sheet` fill, inset 1px ink ring at 18%, 5px radius, 32px tall, 14px text, muted placeholder.
- **Focus:** fill moves to the popover sheet and the ring becomes the paper-gap indigo focus ring (150ms).
- **Error / Disabled:** inset danger hairline; disabled at 50% opacity.

### Navigation
- **Rail:** ink block, 224px ↔ 52px. Logo + "Lượm" in Bitter 700 20px at the top. Directly below, "Add a word" as the one son-red block (4px radius, 36px, ⌘N hint at 75%). Items are 14px Be Vietnam Pro in `rail-muted`; hover `rail-hover` + `rail-label`; active takes `rail-active`, medium weight, and the icon turns sophora yellow. Settings sits at the foot above a `rail-border` hairline.
- **Top bar:** solid paper, 48px, one bottom hairline, breadcrumb with `/` separators; current segment medium primary ink.

### Rating keys (study)
Three equal keys (Again / Hard / Good) on `paper-raised` with a 1px hairline and 6px radius; each has a 8px pigment square (son / hòe / đồng), a 15px semibold label, a kbd hint (1 / 2 / 3) and the next interval in tabular 13px.

### Book cover
A 3:4 woodblock print in one pigment chosen by hashing the title (son, đồng, chàm, hòe, ink), with a spine line; large sizes (104px detail, grid fill) stamp the initial as a pressed seal in the cover's ink, small sizes carve it in Bitter.

### The Seal (signature)
A square son-red chop with the word's first letter carved in a 5×5 seal-script alphabet (`components/seal/glyphs.ts`), rendered as SVG cells and roughened by the `envi-ink` filter (edge displacement + paper-fibre grain; `envi-ink-sm` is edge-only for 16px seals). Sizes: 16 / 22 / 44px. Stages: **seed** dashed pencil outline, no ink; **sprout** lower half inked at 38%; **thirsty** 16% ink wash with a 2px sophora ring; **bloom** fully inked, the letter left as paper. **Press:** on a Good / Easy rating the chop comes down from `scale(1.6) rotate(-10deg)` at 25% opacity and lands at `rotate(-3deg)` in 440ms on `cubic-bezier(0.16, 1, 0.3, 1)`; the study card holds 720ms so the impression is seen (240ms and no animation under reduced motion). The finish recap stamps each grown word in sequence (250ms + 140ms per seal).

## Do's and Don'ts

### Do:
- **Do** edit the palette in `scripts/gen-theme.py` and regenerate; read its contrast printout and keep every text pair ≥ 4.5:1 in both themes.
- **Do** keep one son-red block per screen and route every other action to secondary, ghost or an indigo link.
- **Do** use pigments by meaning: hoa hòe for due, gỉ đồng for growing / good, chàm for links / focus, son for act / mastered.
- **Do** set words being learned and page / game / story names in Bitter; everything operable in Be Vietnam Pro.
- **Do** separate with one 1px hairline and tonal steps of paper; keep corners at 2–8px.
- **Do** mark word progress with the Seal and its four stages, and press it on Good with the 440ms ink-down.
- **Do** design light and dark together; dark is the print inverted onto ink, not a grey theme.

### Don't:
- **Don't** edit `src/renderer/src/styles/envi-theme.css` by hand; it is generated.
- **Don't** use frosted glass or backdrop blur on surfaces of the sheet.
- **Don't** blend pigments into gradients; hard-stop bands (highlighter, sprout seal) are the only gradient form.
- **Don't** put shadows on cards or tiles at rest; hover changes fill or hairline, not elevation.
- **Don't** add a second accent outside the five pigments, or a calm grey sidebar with one jade accent.
- **Don't** use uppercase tracked labels or kickers above headings.

## Known gaps (open)

Recorded as gaps in the build, not as rules:
- No giấy điệp paper material: the ground is a flat warm colour (`paper`), with no shell-mica sheen or fibre texture; only the seal carries ink grain.
- No carved key-block framing: surfaces are divided by hairlines, not by woodblock-cut borders.
- The 3D garden (and the 3D activity scenes) still render outside the print world: soft-shaded low-poly with gradients of light, not flat pigment.
- The Home "episode waiting" ink-block row is implemented but was not visually verified in the review captures (only the garden-rescue variant was seen).
