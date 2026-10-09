---
version: 1
slug: "src-renderer-src"
primary_target: "src/renderer/src"
related_targets: []
---

# Lượm app shell and main screens

Scope: the whole renderer app (shell, home, study, words, lookup, reading, play, episodes, popups). Mode: Operate.
Task: capture words, review due words in 1–2 minute sessions, play, read. Light and dark both first-class.
Constraints: keep name Lượm and current app icon/logo; English UI; 3D scenes keep working; layouts stay (re-theme pass).
User answers (2026-10-08): light sidebar like the landing nav; keep the word seal, restyled green; whole-app re-theme, layouts unchanged.

## Direction contract

THESIS: Lượm looks like its own website: a bright white Mac app with soft grey surfaces, one fresh green, and generous round shapes, friendly and current. Refuses the old warm-paper folk print and the heavy dark rail.

OWN-WORLD: White page; soft grey #f5f5f7 sidebar and cards with no hairline boxes; ink #1d1d1f text; green #2f8a63 for the one action, links, focus and the seal; mint #9fe0bf as the highlighter brush behind learned words; coral, amber and blue only as small skill and rating markers. SN Pro everywhere (bold, tightly tracked for titles), Patrick Hand for small handwritten notes. Pill buttons, 20px cards, 12px fields, soft wide shadows only on floating layers. Dark mode: green-tinted near-black, same roles.

STORY: The learner opens a calm bright page, sees what is due in a big bold headline with one green Study pill, and moves through study and games that feel like the website they downloaded from.

FIRST VIEWPORT: Soft grey sidebar with the logo, a green "Add a word" pill and quiet nav (active item a white pill with a green icon); white page with the due headline in bold SN Pro, the green Study pill beside it, the garden below in a soft rounded card.

FORM: Pinned by the user: the landing page's world (docs/index.html), carried into the app. No concept roll (brief-pinned direction). Seed key: none (pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
