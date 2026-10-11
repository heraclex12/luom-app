---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Lượm turns the English words you meet every day into words you keep — capture, save, review, watch them grow."
destination: website
aspect: 1920x1080
language: en
audience: "Vietnamese learners of English who just installed (or are considering) the Lượm macOS app"
length: 60s
angle: one-word-journey
narration: no
---

## Intent

A 60-second product introduction for the Lượm macOS app, used both on the landing page (docs/index.html) and inside the
app's new-user onboarding (played at the end of the first-run setup, skippable). Follow one real word through the app:
you meet it in an article → capture it with the hotkey → it is saved with its Vietnamese meaning → you review it in a
game / study → your word garden grows. Each feature appears as a step of that journey, so the video doubles as a
step-by-step how-to. Ends with a strong call to action to get started.

User's words: "professional, modern, and engaging … real app screens, smooth transitions, subtle zoom-ins, animated
cursor interactions, and clear, concise text overlays … upbeat, modern background music … clean, visually appealing,
easy to follow, and consistent with my app's branding … compelling introduction … strong call to action … easy to
understand even without sound."

## Assets

- Real app screens: fresh screenshots of the running app (scratch profile with a demo word list and a grown garden),
  captured via the Chrome DevTools Protocol, 2x where we zoom.
- ../../docs/assets/icon.png — app icon, for the intro and the CTA.
- ../../docs/assets/*.jpg — existing landing-page screenshots (fallback / reference).

## Customizations

- Animated cursor interactions over the real screens; subtle push-ins on the region being used.
- Text overlays carry the whole story (no narration); must read with sound off.
- Must also show (user, mid-run): the desktop widget, reminders (menu-bar due count + notifications / word flashes),
  the Dictionary, "etc." — the journey should pass through these, plus a quick glimpse of the other features
  (games, reading library, resources, daily episodes, Say it / Write back) so new users know they exist.
- Landing page: https://heraclex12.github.io/luom-app/ (captured for brand tokens / assets).
- Upbeat modern background music from the HeyGen library (signed in).

## Notes

- Visible name is "Lượm" (the user wants "Luom app", never the author's personal name).
- Never mention ChatGPT or OpenRouter. AI features may be shown generically ("Improve with AI").
- Brand: the website's world — white page, soft grey surfaces, one green, SN Pro, pill buttons, round cards
  (see ../../PRODUCT.md, ../../DESIGN.md, ../../docs/index.html).
- UI copy English; Vietnamese only in dictionary content.
