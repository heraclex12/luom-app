# App icons

Icons embedded at packaging time (`build/` is electron-builder's default `buildResources`).

| File | Use |
| --- | --- |
| `app-icon.png` / `icon.png` | 1024×1024 master. In dev, `src/main/appIcon.ts` uses it for the Dock icon |
| `icon.icns` | macOS app bundle icon |

The menu bar icon lives in `../resources/trayTemplate.png` (+ `@2x`): black on transparent, macOS tints it.

Regenerate the `.icns` from `icon.png`:

```bash
cd build && mkdir icon.iconset && for s in 16 32 128 256 512; do
  sips -z $s $s icon.png --out icon.iconset/icon_${s}x${s}.png
  sips -z $((s*2)) $((s*2)) icon.png --out icon.iconset/icon_${s}x${s}@2x.png
done && iconutil -c icns icon.iconset -o icon.icns && rm -rf icon.iconset
```
