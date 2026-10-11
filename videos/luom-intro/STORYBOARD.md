---
format: 1920x1080
duration: 60s
message: "Lượm turns the English words you meet every day into words you keep: capture, save, review, watch them grow."
arc: BAB with a demo loop (before → product → capture → understand → dictionary → reminders → widget → review & play → speak → write → story → plant/water/grow → everything you need → private + download)
audience: Vietnamese learners of English who just installed (or are considering) the Lượm macOS app
mode: collaborative
music: upbeat modern acoustic pop, bright and playful, light percussion and plucks, ~115-125 bpm, no vocals
narration: none (text overlays carry the story; must read with sound off)
journey_word: resilient
---

# Lượm — 60s intro

No narration. Every frame carries one short **on-screen line** (the `on_screen` field) in SN Pro, plus a small green step
eyebrow ("Step 1 · Capture"). The `voiceover` field is left empty on purpose; reveals pace to the on-screen cue
phrases (separated by " / ") across each frame's duration. One word, **resilient**, travels through the whole video.
Cursor: a macOS-style black arrow with a soft white outline; clicks show a small green ring pulse.

## Decisions

- **Spine:** the word *resilient* (frames 01 → 03 → 04 → 05 → 06 → 09) and a 5-step rail (Capture · Understand ·
  Remember · Review · Grow) at the bottom of the step frames.
- **Layout family:** step frames use a left text column (eyebrow pill at 7cqw, headline 3.8cqw at 11.2cqw, sub 2cqw at
  21.6cqw) and real screens on the right (x 38–95cqw), soft macOS-window shadows; type-only frames (01, 02, 12, 13) are centred.
- **Direction rule:** every push travels leftward. Zoom-through only at section turns (03, 06, 12).
- **Held frame:** the last second of 13.
- **Bans:** no fake app UI (only the browser article, keycaps, cursor, menu bar, callouts and the lock badge are drawn;
  everything else is a real capture) · no glow · no dark frames · no slideshow cards · no motion that says nothing.
- **Truthfulness:** every Lượm screen is a real capture from the 0.7.1 app on a demo profile; the Write back feedback and
  the story episode are real AI output; the garden images are the real 3D scene at those levels.
- **Sketch sheet:** storyboard.html (v2).

## Changes from v1

- User: "show some other games not the aquarium" → Frame 8 now shows Word Fishing, Bubble Tea Shop, Firefly Night, Frog Hop, Word Bridge.
- User: "step 5 grow … show the planting, watering the words" → Frame 12 now runs seed → water → bloom on real plants before the garden grows.
- User: "a scene that list all features in a box like the \"Everything you need to remember words.\"" → new Frame 13 (12 feature cards); privacy + download moves to Frame 14.

## Video direction

- **Palette (frame.md roles):** canvas `#FFFFFF`; soft surface `#F5F5F7` for stages and cards; ink `#1D1D1F` for
  headlines; muted `#6E6E73` for sub lines; the one green `#2F8A63` as the only accent (eyebrow pill text on a
  `rgba(47,138,99,.08)` tint, CTA, click ripples, highlight outlines, the step rail); brush `#9FE0BF` for underlines and
  highlight sweeps. Exceptions, each in one frame only: 06 uses the real macOS wallpaper crop; 13 uses the landing
  page's own icon colours (`#2F8A63 #FF8A3D #5B7CFF #FF4F9A #A259FF #F5B400 #19B5C9`) and its orange→pink→purple
  gradient on "remember".
- **Type:** SN Pro only (display 700, −0.02em; body 400/600), loaded with `@font-face` from `assets/fonts/` (latin,
  latin-ext and vietnamese subsets, as in docs/index.html). Patrick Hand appears once (02, "free for Mac!").
- **Fixed positions for step frames (03, 04, 05, 06, 08, 09, 10, 11, 12):** eyebrow pill at x 96, y 134; headline
  (display, ~73px, two lines) at y 215; sub line (~38px, muted) at y 415; real screens live in the right block
  x 730–1824 (cards with 14–16px radius, layered soft shadow; macOS window chrome only where the storyboard says
  "window"). The 5-step rail (Capture · Understand · Remember · Review · Grow) is bottom-centre at y ~1030 on step frames;
  its dots fill in order and never move between frames.
- **Real screens only:** every Lượm UI pixel is a real capture (`<img>` in an overflow-hidden crop wrapper; zoom by
  transforming the inner image). Drawn elements are limited to: the browser article (03), keycaps, the cursor, click
  ripples, sound rings, callout pills, highlight boxes, the menu-bar pulse, chips, the lock badge and the 13 cards.
  Pixel boxes given below are in the source image's pixels and approximate; check them against the image.
- **Cursor:** macOS arrow (black, 2px white outline, soft shadow), ~36px tall; moves on a gentle arc with
  `power2.inOut`; a click is a 0.12s press (cursor scale .9) plus one green ring ripple (`cursor-click-ripple`).
- **Motion grammar:** long-tail `power3.out` for every settle, `expo.out` for fast arrivals; no bounce, no overshoot,
  no breathing, no infinite loops, no `Math.random`. Each frame reveals its on-screen cue phrases (the " / "
  separated parts of `on_screen`) in order across the shot; first visible motion within 0.2s; every frame ends on a
  held read (subtle jitter at most). Pushes in the back half are allowed only where the shot is the camera move
  itself (03 end push into the popup, 07 drift to the widget, 11 story scroll, 12 garden zoom-out).
- **Rhythm / held frames:** 02 (lockup, last 0.7s), 07 (widget glance, last 1.3s), 13 (grid read, last 0.5s), 14 (final
  second). Everything else moves to its cue then holds briefly.
- **Captions:** none (no narration). The bottom band holds only the step rail.
- **Negative list:** no glow blobs or bokeh, no purple-blue "AI" gradients (13's gradient word excepted), no dark
  frames (06's wallpaper and 08's Firefly crop are content), no fake app UI, no slideshow (front-load then freeze), no
  screensaver (things floating independently), no bouncy entrances.

## Frame 1 — Words slip away

- scene: English words you met today pop in around the frame, then blow away like leaves
- voiceover: ""
- on_screen: "Every day you meet new English words. / By tomorrow, most are gone."
- duration: 4s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Pain validation
- beat: recognition → mild frustration
- blueprint: kinetic-type-beats (Adapt)
- asset_candidates:
- focal: headline
- roles: headline = focal · word chips = supporting
- sfx: soft pop ×8 (very quiet)

narrativeRole: name the everyday pain in the viewer's own experience before any product appears.
keyMessage: you meet words all the time and lose them.

Word chips (pill-shaped, soft grey, real words from the demo list: resilient, meticulous, serendipity, persevere,
diligent, eloquent, inevitable, thrive) pop in scattered around the headline in a quick stagger. On "most are gone"
they drift up and fade like blown leaves, except **resilient**, which stays and glides to centre (handoff to Frame 2).

Adapt: keep the statement-build signature; the "swap" is the chips leaving, not a token change.
Scene 1 (0.0–1.6s): white canvas; the headline "Every day you meet / new English words." assembles by **per-word staggered reveal** (`dynamic-content-sequencing`) centred in the upper-middle; from 0.3s eight word chips (soft-grey pills, display 600 ~36px: meticulous, serendipity, persevere, diligent, eloquent, inevitable, thrive, resilient) **spring-pop** in (`spring-pop-entrance`, smooth) around it in an index-staggered ring. Centered, chips frame the text.
Scene 2 (1.6–2.7s): the sub "By tomorrow, most are gone." reveals below; on it, every chip except **resilient** drifts up 60–120px with a small index-derived rotation and fades out, staggered like leaves.
Scene 3 (2.7–4.0s): **resilient** glides to centre below the sub and fills green (#2F8A63, white text); hold.
- handoff_out: resilient chip, centre x 960 y 760, scale 1, opacity 1, still.

## Frame 2 — Meet Lượm

- scene: the app icon springs in, wordmark and tagline lock up beside it
- voiceover: ""
- on_screen: "Lượm / Pick up a word. Keep it for good."
- duration: 3.5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/02-intro.html
- type: product_intro
- persuasion: Promise statement
- beat: curiosity → relief
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/luom-icon.png — app icon, green rounded square
- focal: assets/luom-icon.png
- roles: luom-icon = cutout
- sfx: soft whoosh into the icon

narrativeRole: land the promise by beat 2: Lượm is how you keep the words.
keyMessage: Lượm keeps the words you pick up.

Tagline is the landing page's own h1 ("Pick up a word. Keep it for good."), with "Keep it for good." in green and a
hand-drawn green underline (Patrick Hand register is allowed for one small accent: "free for Mac" sticker).

Adapt: the mark blooms from the previous frame's chip instead of assembling from parts.
- handoff_in: resilient chip at x 960 y 760, scale 1, opacity 1 (draw it, then morph it).
Scene 1 (0.0–0.9s): the green resilient chip shrinks to a dot while the app icon (luom-icon.png, ~340px, rounded 76px, soft green-tinted shadow) blooms in at left-centre (x ~430–770) with a smooth long-tail settle (`spring-pop-entrance`).
Scene 2 (0.9–1.8s): wordmark "Lượm" (display 700, ~135px) slides in from the right beside the icon (`power3`).
Scene 3 (1.8–2.8s): tagline "Pick up a word." then "Keep it for good." (green) reveal line by line under the wordmark; a brush underline (#9FE0BF, 10px, rounded) draws under "Keep it for good." (`svg-path-draw`); the hand-lettered "free for Mac!" (Patrick Hand, green, −3°) pops beneath.
Scene 4 (2.8–3.5s): held lockup. Composition: asymmetric 40/60 lockup centred as a group.

## Frame 3 — Step 1: Select any word, press ⌥⌘E

- scene: an article in a browser window; the cursor double-clicks "resilient", the ⌥⌘E keycaps pop, the real Lượm capture popup springs open next to the word
- voiceover: ""
- on_screen: "Step 1 · Capture / Select any word, in any app. / Press ⌥⌘E."
- duration: 5.5s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/03-capture.html
- type: feature_showcase
- persuasion: Friction reduction (one shortcut, any app)
- beat: ease
- blueprint: cursor-ui-demo (Adapt)
- asset_candidates: assets/app-capture.png — real quick-capture popup for "resilient" showing Saved, IPA, Vietnamese meaning and examples
- focal: assets/app-capture.png
- roles: app-capture = focal (cutout, appears from the word) · browser article = supporting (drawn)
- sfx: keyboard click ×3 (on the keycaps), mouse double-click

narrativeRole: show the core loop starting where learners actually meet words: outside the app.
keyMessage: one shortcut saves any word you see.

The article is a simple reading surface built in HTML (a neutral browser window with an article: "Children are often
more resilient than we think. …"). The cursor double-clicks "resilient" (blue text selection), three keycaps ⌥ ⌘ E
press in sequence at bottom centre, then the capture popup (real screenshot, rounded 12px, soft shadow) scales up from
the word. Gentle push-in toward the popup at the end.

Adapt: the "app" being driven is a neutral browser article (drawn) and the payoff surface is the real capture popup.
Scene 1 (0.0–1.0s): eyebrow "Step 1 · Capture" + headline "Select any word, / in any app." reveal in the left column; a browser window (macOS chrome, white page, ~1100×840 at x 730) rises in from 40px below on the right: article title "What makes kids bounce back" (display 700 ~50px) and a paragraph (~32px, line-height 1.7): "Children are often more resilient than we think. A bad day at school rarely sticks, and with a little support most of them recover faster than the adults around them…". Rail dot 1 fills.
Scene 2 (1.0–2.3s): the cursor arcs in from the lower right to "resilient", double-clicks (two ripples), and a macOS-blue selection (#B3D7FF) sweeps across the word left→right.
Scene 3 (2.3–3.3s): sub line "Press" + three keycaps ⌥ ⌘ E (white, 1px #E6E6EA ring + 4px bottom edge, ~68px) reveal, then press in sequence 0.15s apart (`press-release-spring`, smooth).
Scene 4 (3.3–4.6s): the real capture popup (app-capture.png, 1200×1560 source shown ~440px wide, 24px radius, layered shadow) scales up from the selected word's position (transform-origin at the word) to sit just right-below it, `expo.out`; a green ring pulses once around its "Saved" pill (source box x 930–1125, y 335–392).
Scene 5 (4.6–5.5s): one short push toward the popup (`coordinate-target-zoom`, to ~1.1), landing for the handoff.
- handoff_out: capture popup, its centre at x 1290 y 640, displayed width 470px, opacity 1, still after the push.

## Frame 4 — Step 2: Meaning, sound, saved

- scene: push into the capture popup; highlights land on the Saved pill, the IPA + speaker, the Vietnamese meaning and the examples
- voiceover: ""
- on_screen: "Step 2 · Understand / Vietnamese meaning, sound and examples. / Saved to My words."
- duration: 3.5s
- transition_in: cut
- status: animated
- src: compositions/frames/04-meaning.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: clarity
- blueprint: device-surface-showcase (Adapt)
- asset_candidates: assets/app-capture.png — the same capture popup, now the hero
- focal: assets/app-capture.png
- roles: app-capture = focal (hero, cutout)
- sfx: soft pop per callout, a short "speak" tick on the sound rings

narrativeRole: show what you get the moment you capture: understanding, not just a saved string.
keyMessage: you instantly understand the word and it is already saved.

Popup large at right (about 60% height), callout pills at left connect with thin green lines: "kiên cường? đàn hồi ✓",
"Hear it in US or UK English", "Real examples, in both languages", "✓ Saved". Speaker icon pulses with 3 sound rings.

Adapt: the "device" is the popup itself; its parts are called out instead of screens cycling.
- handoff_in: capture popup centred at x 1290 y 640, width 470px, opacity 1.
Scene 1 (0.0–0.6s): the popup glides from the handoff to its hero place (centre x ~1400, y ~520, ~640px wide) (`card-morph-anchor` / scale); eyebrow "Step 2 · Understand" + headline "Meaning, sound / and examples." reveal in the left column; rail dot 2 fills.
Scene 2 (0.6–2.6s): four callout pills (white, 1.5px green-tint border, ✓ in green) tick in down the left column, 0.45s apart, each with a thin green leader line drawing (`svg-path-draw`) to its part of the popup: "Vietnamese meaning" → the meaning line (source y 545–600); "US / UK pronunciation" → the IPA row (source y 440–490), whose speaker emits three sound rings; "Real examples, both languages" → the examples block (source y 680–1340); "Saved" → the Saved pill (source x 930–1125, y 335–392).
Scene 3 (2.6–3.5s): sub "Already saved to My words." reveals; hold.

## Frame 5 — Look anything up in the Dictionary

- scene: the real Dictionary page; "resilient" types into the search box, the word card is there, cursor clicks the speaker and hovers Improve with AI
- voiceover: ""
- on_screen: "Or look it up in the Dictionary. / Meanings, sound, examples, word family. / Improve any entry with AI."
- duration: 4s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-dictionary.html
- type: feature_showcase
- persuasion: Value stacking
- beat: confidence
- blueprint: cursor-ui-demo (Reproduce)
- asset_candidates: assets/app-dict.png — real Dictionary page for resilient
- focal: assets/app-dict.png
- roles: app-dict = focal (inside a macOS window)
- sfx: keyboard typing (soft), mouse click

narrativeRole: show the in-app dictionary as the second way in, and its depth.
keyMessage: a full English–Vietnamese dictionary is built in.

Screenshot inside a macOS window frame. The search text is covered by a white field and re-typed letter by letter.
Slow push-in from the full window to the headword area; cursor clicks the US speaker (ring pulse), then glides to
"Improve with AI" (soft green glow). Tabs underline slides Examples → Word family.

Scene 1 (0.0–1.4s): eyebrow "Dictionary" + headline "Or look it up / in the Dictionary." reveal; a macOS window holding app-dict.png (2880×1800 shown ~1100px wide) rises in on the right. The search text is covered by a white field (source box x 1110–1500, y 160–220) and "resilient" types into it letter by letter with a green caret (`discrete-text-sequence`).
Scene 2 (1.4–2.6s): `coordinate-target-zoom` into the headword area (source region x 1000–2350, y 120–1000) to ~1.45; the cursor moves to the US speaker chip (source x 1040–1152, y 410–458) and clicks; three sound rings radiate from it.
Scene 3 (2.6–4.0s): the cursor glides to "Improve with AI" (source x 1663–1927, y 281–343); a green outline ring settles around the button (no glow); the sub "Word family, synonyms, / and Improve with AI." reveals ("Improve with AI" in green 600); hold.

## Frame 6 — Step 3: Lượm reminds you

- scene: a calm macOS desktop; the menu-bar Lượm item shows a due count, a pop-quiz card slides into the corner, the cursor picks the right meaning and the sprout blooms into a flower
- voiceover: ""
- on_screen: "Step 3 · Remember / Lượm reminds you, right before you forget. / A pop quiz in the corner. One click."
- duration: 4.5s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/06-reminders.html
- type: feature_showcase
- persuasion: Risk reversal (you don't have to remember to study)
- beat: peace of mind
- blueprint: compose
- asset_candidates: assets/app-popquiz.png — real pop-quiz card for resilient (sprout, three options); assets/app-popquiz-answered.png — same card after the right answer (flower, "You remembered it."); assets/app-desktop-widgets.jpg — desktop with the Lượm menu-bar count, use only its top menu-bar strip and wallpaper here
- focal: assets/app-popquiz.png
- roles: app-desktop-widgets = background (menu bar strip + plain wallpaper area only, no widgets) · app-popquiz = focal (cutout) · app-popquiz-answered = focal (state 2)
- sfx: soft notification blip, mouse click, small chime on the bloom

narrativeRole: show the reminder system that makes words come back without effort.
keyMessage: Lượm brings words back at the right time.

Menu bar strip (cropped from app-desktop-widgets.jpg top) with the "📖 6" Lượm item; a small notification-style
pulse on it. Pop-quiz card slides up from bottom-right with a spring. Cursor clicks the third option "đàn hồi, bật
lên, dội lên"; it crossfades to the answered card (sprout → pink flower) with a tiny confetti of 6 green dots.

Compose: macOS desktop stage + a real corner card + one click.
Scene 1 (0.0–0.8s): full-bleed desktop made from app-desktop-widgets.jpg: its menu-bar strip (source y 0–30, scaled to full width) on top and its plain wallpaper area (source x 560–1600, y 560–1059, no widgets) scaled to fill behind; the menu-bar Lượm item "6" (source x 1360–1399, y 5–27) gets one green pulse ring. White eyebrow pill "Step 3 · Remember", white headline "Lượm reminds you, / right before you forget." reveal top-left; rail dot 3 fills (rail drawn white-on-glass for this frame).
Scene 2 (0.8–1.8s): the pop-quiz card (app-popquiz.png crop x 25–1055, y 25–755 of 1080×900, shown ~560px wide, 24px radius, shadow) slides up into the bottom-right corner with a smooth settle.
Scene 3 (1.8–3.0s): the cursor arcs in and clicks the third option "đàn hồi, bật lên, dội lên" (source box x 77–1003, y 593–703); the card crossfades to app-popquiz-answered.png (same crop), the sprout becoming a pink flower, and six small green dots burst from the flower icon (source x 100–190, y 95–215) (`css-marker-patterns` burst).
Scene 4 (3.0–4.5s): the sub "A pop quiz in the corner. One click." reveals (white, 85%); hold.

## Frame 7 — Your words on your desktop

- scene: push across the real desktop full of Lượm widgets; the large widget's Show meaning button gets a click
- voiceover: ""
- on_screen: "Widgets keep your words on your desktop. / A glance is a review."
- duration: 3.5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/07-widget.html
- type: feature_showcase
- persuasion: Habit anchoring (learning where you already look)
- beat: ease + delight
- blueprint: camera-journey (Adapt)
- asset_candidates: assets/app-desktop-widgets.jpg — macOS desktop with four Lượm widgets (meticulous, serendipity, diligent, accumulate)
- focal: assets/app-desktop-widgets.jpg
- roles: app-desktop-widgets = focal (full-bleed, the world the camera travels)
- sfx: mouse click

narrativeRole: show passive review through the desktop widget.
keyMessage: you review just by looking at your desktop.

Start framed on the whole desktop, slow drift-and-push to the large "meticulous" widget; cursor clicks "Show
meaning" (ring pulse); a small callout "small · medium · large" pill.

Adapt: a single motivated push across the real desktop, with one click at the destination; no second leg.
Scene 1 (0.0–1.6s): full-bleed app-desktop-widgets.jpg (1600×1059); one smooth push (`multi-phase-camera`, single phase) from the full desktop to the large "meticulous" widget (source x 25–480, y 55–530), landing by 1.6s and then still.
Scene 2 (1.2–2.2s): a white card (radius 28px, 95% white, shadow) on the right carries the eyebrow "Widgets" and headline "Your words, on / your desktop."; the cursor clicks "Show meaning" (source x 44–459, y 252–286) with a ripple.
Scene 3 (2.2–3.5s): sub "A glance is a review." and a small pill "Small · medium · large" reveal in the card; held frame.

## Frame 8 — Step 4: Review in minutes, or play

- scene: a study card gets answered (option turns green), then the real 3D games fan in as cards
- voiceover: ""
- on_screen: "Step 4 · Review / Two minutes a day. / Or play games made from your own words."
- duration: 5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/08-review-play.html
- type: feature_showcase
- persuasion: Friction reduction + delight
- beat: confidence → fun
- blueprint: cursor-ui-demo (Adapt)
- asset_candidates: assets/app-study-q.png — study question for inevitable with four options; assets/app-study-answered.png — same after answering, option 1 green, Rated Good; assets/app-game-fishing.png — Word Fishing 3D game; assets/app-game-tea.png — Bubble Tea Shop 3D game; assets/app-game-firefly.png — Firefly Night 3D game (night, fireflies with words); assets/app-game-frog.png — Frog Hop 3D game (lily pads with meanings); assets/app-game-bridge.png — Word Bridge 3D game
- focal: assets/app-game-fishing.png
- roles: app-study-q / app-study-answered = supporting (state pair) · five game screenshots = focal (cards)
- sfx: mouse click, five soft card-deal swishes

narrativeRole: show that reviewing is fast and can be a game.
keyMessage: spaced review takes minutes and can be play.

0–2s: study card (cropped to the content column), cursor clicks option 1, crossfade to the answered state, "Rated
Good" pill pops. 2–5s: five game cards (crops of the 3D scenes, rounded 14px, slight tilts) deal in from the right in
a fanned row, each with a label pill: Word Fishing, Bubble Tea Shop, Firefly Night, Frog Hop, Word Bridge. No aquarium.

Adapt: a demo|text|demo sandwich: one click on the study card, then the games deal in as a fanned grid.
Scene 1 (0.0–0.7s): eyebrow "Step 4 · Review" + headline "Two minutes a day." reveal; a study card (app-study-q.png crop x 1020–2300, y 280–1250, ~560px wide) rises in at the lower-left of the right block; rail dot 4 fills.
Scene 2 (0.7–1.8s): the cursor clicks option 1 (source x 1038–1653, y 528–669); crossfade to app-study-answered.png (same crop) where it turns green; a "Rated Good" green pill pops at the card's corner.
Scene 3 (1.8–2.4s): "Or play." (green) joins the headline; sub "Games made from your own words." reveals.
Scene 4 (2.4–4.2s): five game cards (crops of the 3D scene area of each screenshot: source x 495–2700, y 120–920; ~420×250 each, 16px radius, shadow, tilts −3°…+2° by index) deal in from the right 0.3s apart into a fanned 3+2 arrangement (Word Fishing, Bubble Tea Shop, Firefly Night, Frog Hop, Word Bridge), each followed by its white label pill.
Scene 5 (4.2–5.0s): hold.

## Frame 9 — Speak it

- scene: the real Say it card, the green mic pulses as the word is spoken, then the Misheard pairs game asks "resilient or resident?"
- voiceover: ""
- on_screen: "Say it out loud. / Lượm hears you, and shows what came across."
- duration: 4s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/09-speak.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: confidence
- blueprint: device-surface-showcase (Adapt)
- asset_candidates: assets/app-say.png — Say it card for persevere with the big green microphone; assets/app-pairs.png — Misheard pairs: resilient / resident
- focal: assets/app-pairs.png
- roles: app-say = supporting · app-pairs = focal
- sfx: soft mic blip, mouse click

narrativeRole: pronunciation practice: speaking, not only reading.
keyMessage: you practise saying your words and hearing the difference.

0–2.2s: Say it card (crop of the card), mic button pulses with expanding green rings, a small waveform of 5 bars
bounces beside it. 2.2–4.5s: cut-swap to Misheard pairs card, cursor clicks "resilient" (ring pulse, green outline).

Adapt: two real cards in sequence instead of one device cycling.
Scene 1 (0.0–0.7s): eyebrow "Speak" + headline "Say it out loud." reveal; the Say it card (app-say.png crop x 1060–2270, y 360–1150, ~560px wide) rises in at the upper part of the right block.
Scene 2 (0.7–1.9s): the green mic button (source centre x 1713, y 825, r ~63) emits three expanding green rings, and a 5-bar waveform beside it bounces (deterministic per bar, finite).
Scene 3 (1.9–2.5s): sub "Lượm hears you, and shows / what came across." reveals; the Misheard pairs card (app-pairs.png crop x 1060–2270, y 360–960, ~720px wide) slides up overlapping the lower-right.
Scene 4 (2.5–4.0s): the cursor clicks "resilient" (source x 1137–1650, y 636–765); a green outline + small check settle on that button; hold.

## Frame 10 — Write it

- scene: the real Write back chat: a friend's message, the learner's reply using their words, then AI feedback with Natural / Almost and a native version
- voiceover: ""
- on_screen: "Use your words in a real reply. / Get friendly feedback on how natural it sounds."
- duration: 4.5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/10-write.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: competence
- blueprint: cursor-ui-demo (Adapt)
- asset_candidates: assets/app-write-typed.png — Write back with Minh's message and the typed reply; assets/app-write-feedback.png — the feedback: Almost / Natural pills and "A native speaker might say"
- focal: assets/app-write-feedback.png
- roles: app-write-typed = supporting (state 1) · app-write-feedback = focal (state 2)
- sfx: soft typing, send whoosh, soft pop ×2

narrativeRole: the sentence game: active use of words with feedback.
keyMessage: you learn to use the word, not just recognise it.

Crop to the Write back card. 0–2s typed state, the reply text reveals left-to-right (wipe) as if typed; cursor clicks
send. 2–5s crossfade to the feedback state with a slow scroll so the Almost / Natural pills and the native version
are centred; the two verdict pills get a soft highlight in turn.

Adapt: one send, then the real feedback arrives; the camera holds on the card.
Scene 1 (0.0–1.4s): eyebrow "Write" + headline "Use your words / in a real reply." reveal; the Write back card (app-write-typed.png crop x 1050–2280, y 330–1150, ~720px wide) rises in on the right; a white mask over the reply text (source x 1119–2124, y 897–1050) wipes away left→right as if typed.
Scene 2 (1.4–1.9s): the cursor clicks the send button (source centre x 2175, y 1020); ripple.
Scene 3 (1.9–3.4s): crossfade to app-write-feedback.png (crop x 1050–2280, y 700–1500) showing the green reply bubble and the feedback; a brush highlight sweeps behind the "Almost" pill (source x 1164–1248, y 1020–1050), then behind "Natural" (source x 1173–1251, y 1110–1140) (`css-marker-patterns` highlight).
Scene 4 (3.4–4.5s): sub "Get friendly feedback on / how natural it sounds." reveals; hold.

## Frame 11 — A story with your words

- scene: today's episode of the AI story, the learner's words glowing in the text
- voiceover: ""
- on_screen: "A new story episode every day, / written with the words you're learning."
- duration: 3.5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/11-story.html
- type: feature_showcase
- persuasion: Curiosity / cliffhanger habit
- beat: intrigue
- blueprint: camera-journey (Adapt)
- asset_candidates: assets/app-episode-read.png — Episode 5 "Project Orion Discovery" with highlighted words
- focal: assets/app-episode-read.png
- roles: app-episode-read = focal
- sfx: soft chime ×4 (very quiet)

narrativeRole: the daily story episodes as a reason to come back.
keyMessage: your words come alive in a story that continues daily.

Slow push down the story column; the "Your words" chips light up one by one and the matching highlighted words in
the paragraph pulse green in sync (persevere, inevitable, give up, diligent).

Adapt: a cursorless slow read down the story with the learner's words lighting up.
Scene 1 (0.0–0.8s): eyebrow "Daily story" + headline "A new episode / every day," reveal; the episode card (app-episode-read.png crop x 940–2390, y 170–1800, ~760px wide) rises in on the right.
Scene 2 (0.8–2.6s): the "Your words" chips light up one by one with a green outline pulse (source boxes, y 397–435: persevere x 1099–1236, inevitable x 1250–1385, diligent x 1398–1509, serendipity x 1522–1673), and the same words in the story get a brush highlight sweep right after their chip (persevere x 2107–2265 y 616–665; inevitable x 1833–1989 y 677–726; diligent x 1993–2114 y 1086–1135; serendipity x 1868–2045 y 1495–1544); the crop scrolls down slowly (~180 source px) as the highlights move down the page.
Scene 3 (2.6–3.5s): sub "written with the words / you're learning." reveals ("you're learning." in green 600); hold.

## Frame 12 — Step 5: Plant, water, watch it grow

- scene: the word you saved is a seed in your 3D garden; reviewing waters it; mastering makes it bloom; then the whole garden grows into a world
- voiceover: ""
- on_screen: "Step 5 · Grow / Every word you save is a seed. / Review to water it. Master it to bloom. / Keep going and your garden becomes a world."
- duration: 6.5s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/12-garden.html
- type: benefit_highlight
- persuasion: Progress visualisation / care loop
- beat: tenderness → awe + motivation
- blueprint: zoom-out-workspace-reveal (Adapt)
- asset_candidates: assets/app-garden-hover-seed-resilient.png — the resilient seed with tooltip "Seed: not learned yet"; assets/app-garden-hover-thirsty.png — persevere, "Needs water: due for review"; assets/app-garden-water-1.png — water droplets falling on the thirsty plant (Garden rescue, serendipity ✓); assets/app-garden-water-2.png — droplets landing; assets/app-garden-water-3.png — golden ring at the watered plant; assets/app-garden-hover-bloom.png — gratitude, "In bloom: mastered"; assets/app-garden-rescue.png — Garden rescue question card; assets/app-garden-level-1.png — seed patch; assets/app-garden-level-25.png — cottage; assets/app-garden-level-50.png — pond; assets/app-garden-level-70.png — hamlet; assets/app-garden-level-90.png — walled town; assets/app-garden-level-100.png — sky kingdom; assets/app-garden-level-140.png — archipelago
- focal: assets/app-garden-level-140.png
- roles: garden hover crops + water frames = focal in sequence (one stage) · garden level images = focal for the finale
- sfx: soft seed pop, water drops, bloom chime, rising swell into the zoom-out

narrativeRole: the emotional payoff, and how the garden works: words are plants you care for.
keyMessage: saving plants a seed, reviewing waters it, mastering makes it bloom, and the garden grows.

Three-state life cycle on one stage, each ~1.3s, with a three-chip row at top lighting up in turn
("🌱 Plant" · "💧 Water" · "🌸 Bloom", drawn as brand pills):
0–1.4s: tight crop of the home garden on the resilient seed tooltip (callback to the journey word): "Every word you save is a seed."
1.4–3.0s: cut to the persevere "Needs water" tooltip, then a close crop of Garden rescue where droplets fall on the
plant (water-1 → water-2 → water-3, ~0.3s each, a "serendipity ✓" answer chip pops beside): "Review to water it."
3.0–4.0s: the gratitude "In bloom" tooltip: "Master it to bloom."
4.0–6.5s: one continuous zoom-out while the garden levels crossfade fast (1 → 25 → 50 → 70 → 90 → 100 → 140) and a
Level pill counts up: "Keep going and your garden becomes a world." Crop the "Visit" chip row out of 100/140.

Adapt: the close-up dwell is a three-state care cycle on real plants; the single zoom-out lands the scale payoff.
Scene 1 (0.0–1.4s): soft-surface background (#F5F5F7). Eyebrow "Step 5 · Grow" + headline "Every word you save / is a seed." reveal; three state chips "🌱 Plant · 💧 Water · 🌸 Bloom" appear under it with Plant lit (green fill, white text). The stage (rounded 24px card, x 730–1824, y 120–960) shows app-garden-hover-seed-resilient.png cropped around the tooltip (centre x 1794, y 738; crop ~900×690), with a gentle `coordinate-target-zoom` onto the "resilient · Seed: not learned yet" tooltip. Rail dot 5 fills.
Scene 2 (1.4–2.2s): `cut-the-curve` to app-garden-hover-thirsty.png cropped on its tooltip (centre x 1788, y 780): "persevere · Needs water"; Water chip lights; sub "Review to water it." reveals.
Scene 3 (2.2–3.1s): the stage swaps to the watering close-up: app-garden-water-1 → water-2 → water-3 (crop x 750–1650, y 420–980), ~0.3s each, quick crossfades; an answer chip "serendipity ✓" (green outline) pops at the stage's top-left.
Scene 4 (3.1–4.1s): app-garden-hover-bloom.png cropped on its tooltip (centre x 1509, y 696): "gratitude · In bloom: mastered"; Bloom chip lights; sub adds "Master it to bloom.".
Scene 5 (4.1–6.5s): the left column fades; the stage expands to a centred wide card (`card-morph-anchor`); the garden level images (1888×920; crop off the bottom 70px of 100/140 to drop the Visit chips) crossfade 1 → 25 → 50 → 70 → 90 → 100 → 140, accelerating, under ONE continuous zoom-out; a white "Level" pill top-right counts 1 → 140 (`counting-dynamic-scale`, numbers only, tabular); the headline hard-cuts to "Keep going and your garden becomes a world." centred above the stage. Hold the last 0.5s.

## Frame 13 — Everything you need

- scene: a grid of 12 feature cards assembles, in the landing page's "Everything you need to remember words." style
- voiceover: ""
- on_screen: "Everything you need / to remember words."
- duration: 4.5s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/13-features.html
- type: benefit_highlight
- persuasion: Value stacking
- beat: abundance → confidence
- blueprint: grid-card-assemble (Reproduce)
- asset_candidates:
- cards: Capture anywhere (⌥⌘E in any app) · English–Vietnamese dictionary (meanings, sound, examples) · Spaced repetition (back right before you forget) · Read EPUB, PDF & Markdown (tap a word to save it) · Free AI help (better examples and explanations) · Pop quizzes & reminders (in the corner of your screen) · Desktop widgets (small, medium, large) · Natural voices (US or UK English) · Word games (made from your words) · Speak & write (pronunciation and feedback) · Daily story (a new episode every day) · Word lists & resources (verbs, phrases, sound pairs)
- focal: 12 feature cards
- roles: cards = focal (drawn, landing style)
- sfx: soft tick per row

narrativeRole: the breadth beat: everything the app does, at a glance, before the ask.
keyMessage: it's a complete toolkit for keeping words.

Faithful to the landing page section (docs/index.html "And much more"): small green eyebrow "And much more", headline
"Everything you need / to remember words." with "remember" in the landing's orange → pink → purple gradient, then a
4×3 grid of soft-grey rounded cards (radius 16px, no border), each with a coloured round icon (green, orange, blue,
pink, purple, yellow, teal… as on the landing), a bold title and one short line. Cards cascade in row by row
(≈60ms stagger), then a slow 3% zoom-out. Icons are simple line glyphs drawn in white inside the coloured circles.

Scene 1 (0.0–0.9s): white canvas; small green eyebrow "And much more" then the headline "Everything you need / to remember words." (display 700 ~84px, centred, top ~110px) with "remember" in the landing gradient (#FF8A3D → #FF4F9A → #A259FF); per-word reveal.
Scene 2 (0.9–3.0s): a 4×3 grid of soft-grey cards (#F5F5F7, radius 28px, no border, ~370×210, gap 22px, grid centred below the headline) cascades in row by row, index-staggered: each card has a 48px coloured circle with a simple white line glyph, a bold title (~27px) and one muted line (~21px). Cards in order: Capture anywhere / ⌥⌘E in any app (green) · English–Vietnamese dictionary / Meanings, sound, examples (orange) · Spaced repetition / Back right before you forget (blue) · Read EPUB, PDF & Markdown / Tap a word to save it (pink) · Free AI help / Better examples, explanations (purple) · Pop quizzes & reminders / In the corner of your screen (yellow) · Desktop widgets / Small, medium and large (teal) · Natural voices / US or UK English (green) · Word games / Made from your own words (orange) · Speak & write / Pronunciation and feedback (blue) · Daily story / A new episode every day (pink) · Word lists & resources / Verbs, phrases, sound pairs (purple).
Scene 3 (3.0–4.5s): the whole grid eases out ~3% (single move, ends by 4.0s); held read.

## Frame 14 — Private, free, on your Mac

- scene: the app icon with a small lock; privacy promises tick in, then the Download for Mac pill
- voiceover: ""
- on_screen: "Your words stay on your Mac. / No account. Free. / Download Lượm for Mac."
- duration: 3.5s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/14-private-cta.html
- type: cta
- persuasion: Risk reversal (private, no account, free) + clear next step
- beat: trust → urgency-to-act
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/luom-icon.png — app icon
- focal: assets/luom-icon.png
- roles: luom-icon = cutout
- sfx: soft lock click, button press

narrativeRole: remove the last worry (privacy, cost) and tell the viewer what to do.
keyMessage: it's private and free; download it.

Icon springs in with a small green lock badge on its corner. Three check-rows tick in: "Your words and progress are
stored on your Mac", "No account, no sign-up", "Free". Then the green "Download for Mac" pill (Apple logo glyph) pops
with a cursor click pulse. No URL. Wording follows the landing page ("No account. Your words stay on your Mac."); do
not claim "nothing leaves your Mac" (dictionary lookups and AI help go online).

Adapt: lockup + promises + the single action; no URL.
Scene 1 (0.0–0.8s): white canvas; the app icon (~350px) blooms in at left (x ~230–580, y ~300–650) with a smooth settle; a white round lock badge (green lock glyph, drawn) pops onto its lower-right corner; headline "Your words stay / on your Mac." (display 700 ~80px) per-word reveals at x ~730.
Scene 2 (0.8–2.0s): three rows tick in 0.3s apart, each with a green check that draws (`svg-path-draw`): "Words and progress stored on your Mac" · "No account, no sign-up" · "Free".
Scene 3 (2.0–2.6s): the green "Download for Mac" pill (Apple glyph, white text 600 ~46px) pops (`press-release-spring`, smooth) with one cursor-less click ripple.
Scene 4 (2.6–3.5s): held final frame; the music fades out at the root.

