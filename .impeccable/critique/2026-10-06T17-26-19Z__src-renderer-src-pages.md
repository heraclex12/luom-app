---
target: main screens of Lượm (src/renderer/src/pages)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/razent/sources/envi-learn/src/renderer/src/pages"
timestamp: 2026-10-06T17-26-19Z
slug: src-renderer-src-pages
---
Method: dual-agent (A: design review · B: detector + live overlay)

## Design Health Score: 24/40 (Acceptable)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Home "Plus 5 new" vs Today page "New words: 0" (different meanings) |
| 2 | Match System / Real World | 3 | "Play mode" (learning mode) vs "Play" (games); "New" means two things |
| 3 | User Control and Freedom | 2 | No undo of last rating; lookup history Clear has no confirm/undo; dead back arrow on top-level pages |
| 4 | Consistency and Standards | 2 | Dictionary→"Look up", Reading→"Library"; "Add a word" vs "Add words" do different things |
| 5 | Error Prevention | 3 | Mark-as-known confirms; clear history doesn't |
| 6 | Recognition Rather Than Recall | 3 | Space/Enter hints shown, ratings have no key hints |
| 7 | Flexibility and Efficiency | 2 | No rating keys, no app menu shortcuts (⌘, ⌘1–4), no arrow keys in lookup suggestions |
| 8 | Aesthetic and Minimalist Design | 2 | Home stacks 9 sections and ~6 progress systems |
| 9 | Error Recovery | 2 | "File not on this device" with no relocate action; failed suggestions vanish silently |
| 10 | Help and Documentation | 2 | Capture hotkey only taught in the zero-words empty state |

## Design Specificity
Partly authored: 3D garden, Lora headwords, highlighter on target word, jade accent, inline Vietnamese are product-specific. Shell (sidebar + breadcrumb top bar, self-described "claude.ai-style"), games/episodes/resources icon-tile grids are category-interchangeable. Garden is a mid-page panel, not the organizing idea.
Detector: 4 static bounce-easing (popquiz:189, episodes:196, AnswerFx:43, switch.tsx:26); live layout-transition (sidebar width, toggle-group thumb); cramped-padding on root shell (false positive); dark-glow (false positive, detector's own banner).

## Priority Issues
- [P1] Study ratings not keyboard-operable (RatingBar.tsx; study/index.tsx only binds Space/Enter). Fix: 1/2/3 + Enter=Good, key hints, bar under answer, Z undo.
- [P1] Home overload / reward-system sprawl (pages/word-book/index.tsx). Fix: headline + garden + one next row; move quests/week/collections to Progress; fold XP into garden.
- [P1] Muted text contrast: light #78837f on #f4f6f5 = 3.62:1; dark #74807c on #1a201e = 4.03:1; 271 uses. Fix: darken/lighten tokens in envi-theme.css.
- [P2] Naming/navigation drift (Dictionary/Look up, Reading/Library, Add a word/Add words, Play mode/Play, orphan /wordbook/today).
- [P2] Not native-feeling: no app menu/shortcuts; web back arrow disabled on top-level pages.

## Persona Red Flags
Alex: no rating keys, no arrow-key suggestions, no ⌘ shortcuts, junk history entries undeletable individually.
Sam: muted contrast; canvas-only garden (no list alternative); underline-only card type indicator; 55% opacity "Coming soon".
Linh (2-min daily learner): garden plant opens a lookup not a review; finish screen pushes more work, no recap; episodes punish missed days.

## Minor Observations
Firefly Night card looks selected; Library placeholder "i" cover + truncated filename; Resources too thin for top-level nav; garden legend hex not tokens; two "⋯" menus in Study; switch.tsx overshoot easing on a core control.

## Questions
1. Should the garden be the home screen itself, with due words as thirsty plants?
2. Which of streak/XP/quests/goal/garden/aquarium/coins/lost pages would the learner miss?
3. Should missed episodes wait as seeds instead of being lost?
