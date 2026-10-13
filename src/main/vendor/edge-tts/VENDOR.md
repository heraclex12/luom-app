# edge-tts (Sec-MS-GEC v2 token) · vendor note

- Source: <https://github.com/rany2/edge-tts>, `src/edge_tts/drm.py` (`generate_sec_ms_gec_v2`), release 7.3.1,
  commit `360fa8e1de354e1dda74c09bd695887d6a44df74`.
- License: **LGPLv3** (`LICENSE` in this folder, kept as published upstream; it also notes one MIT file that is not
  used here). Shipped inside the app as `Contents/Resources/licenses/edge-tts-LICENSE` (electron-builder.yml).
- What is here: `gec.ts`, a TypeScript port of the token generator only. The rest of the Edge client
  (`src/main/edgeTts.ts`) is our own code and only calls `secMsGecV2()`.

## Rules

- Keep the port a separate module with this interface (`secMsGecV2(unixSeconds)`, `TRUSTED_CLIENT_TOKEN`), so it stays
  replaceable as the LGPL asks. Don't move other code into this folder.
- When Microsoft changes the token again (HTTP 403 for every word, as on 2026-10-10), port the new upstream
  `drm.py`, update `gec.test.ts` with values printed by upstream's own code for fixed timestamps, and update the
  commit above.
