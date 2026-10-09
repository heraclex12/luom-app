#!/usr/bin/env python3
"""Generates src/renderer/src/styles/envi-theme.css: the Lượm world (light + dark), the same look as the website
(docs/index.html): white page, soft grey surfaces, ink text, one fresh green, mint highlighter, coral / amber / blue as
small markers. Layered over the inherited token system. Edit the palettes here and rerun: `python3 scripts/gen-theme.py`.
Prints WCAG contrast for the key text pairs."""
import math, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/renderer/src/styles/envi-theme.css'

# ---- colour maths (OKLab / OKLCH) ----
def h2rgb(h):
    h = h.lstrip('#'); return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
def rgb2h(c):
    return '#' + ''.join(f'{round(max(0, min(1, x)) * 255):02x}' for x in c)
def lin(x): return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
def gam(x): return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
def to_oklch(h):
    r, g, b = map(lin, h2rgb(h))
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360
def from_oklch(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return rgb2h([gam(max(0, x)) for x in (r, g, bl)])
def lum(h):
    r, g, b = map(lin, h2rgb(h)); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def contrast(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x + 0.05) / (y + 0.05)

# ---- ramps: keep the inherited lightness steps, change hue/chroma ----
src = (ROOT / 'src/renderer/src/styles/primitives.css').read_text()
def ramp(name):
    return [(k, v) for k, v in re.findall(rf'--{name}-(\d+):\s*(#[0-9a-fA-F]{{6}})', src)]
# Near-neutral greys (a hair cool, like the website's #f5f5f7 / #6e6e73); the inherited "blue" ramp becomes green so
# every inherited accent (focus outline, accent scales) speaks the brand.
grays = [(k, from_oklch(to_oklch(v)[0], 0.004 * (1 - abs(2 * to_oklch(v)[0] - 1)), 270)) for k, v in ramp('gray')]
indigo = [(k, from_oklch(to_oklch(v)[0], min(0.12, to_oklch(v)[1] * 0.85 + 0.01), 160)) for k, v in ramp('blue')]

# ---- the world ----
INK = '#1d1d1f'        # text, the website's ink
WHITE = '#ffffff'      # page
SOFT = '#f5f5f7'       # sidebar, cards, raised surfaces
GREEN = '#2a7d5a'      # the one action, links, focus, the seal (website green #2f8a63, a step deeper for white text)
GREEN_HOVER = '#226a4c'
MINT = '#9fe0bf'       # highlighter brush behind words
CORAL = '#e5533d'      # Again, streak, recording, the Spelling skill
AMBER = '#f2a531'      # due / thirsty, daily goal
BLUE = '#4a6cf0'       # Listening / Writing skills, covers

light = {
    'text-primary': INK, 'text-secondary': '#424245', 'text-muted': '#6e6e73',
    'text-disabled': 'rgb(29 29 31 / 0.38)',
    'page-bg': WHITE, 'surface-0': WHITE, 'surface-1': SOFT, 'surface-2': WHITE, 'surface-3': WHITE,
    'surface-panel': WHITE, 'surface-popover': WHITE,
    # the one action: green pill with white label
    'brand-clay': GREEN, 'brand-clay-emphasized': GREEN_HOVER, 'fill-brand': GREEN, 'fill-brand-hover': GREEN_HOVER,
    'on-brand': '#ffffff',
    # accent (links, focus, selection chips): the same green
    'fill-accent': GREEN, 'fill-accent-hover': GREEN_HOVER, 'bg-accent': '#e3f4ea', 'bg-accent-chip': '#e3f4ea',
    'text-accent': '#1f6b4b', 'border-accent': '#9fd3b8', 'on-accent': '#ffffff',
    'fill-danger': '#d23c27', 'fill-danger-hover': '#b8331f', 'bg-danger': '#fdecea', 'bg-danger-chip': '#fdecea',
    'text-danger': '#b4362b', 'border-danger': '#f2b3aa', 'on-danger': '#ffffff',
    'fill-success': GREEN, 'fill-success-hover': GREEN_HOVER, 'bg-success': '#e3f4ea', 'bg-success-chip': '#e3f4ea',
    'text-success': '#1f6b4b', 'border-success': '#9fd3b8', 'on-success': '#ffffff',
    'fill-warning': AMBER, 'fill-warning-hover': '#e39520', 'bg-warning': '#fff3dc', 'bg-warning-chip': '#fff3dc',
    'text-warning': '#7a4d00', 'border-warning': '#f5c983', 'on-warning': INK,
    'fill-primary': INK, 'fill-primary-hover': '#3a3a3c', 'on-primary': '#ffffff',
    'border': 'rgb(29 29 31 / 0.08)', 'border-strong': 'rgb(29 29 31 / 0.16)', 'border-stronger': 'rgb(29 29 31 / 0.32)',
    'bg-neutral': 'rgb(29 29 31 / 0.04)', 'bg-neutral-hover': 'rgb(29 29 31 / 0.07)',
    'bg-neutral-chip': 'rgb(29 29 31 / 0.05)', 'bg-neutral-chip-hover': 'rgb(29 29 31 / 0.08)',
    'fill-ghost-hover': 'rgb(29 29 31 / 0.05)', 'fill-control': 'rgb(29 29 31 / 0.08)',
    'fill-control-hover': 'rgb(29 29 31 / 0.14)', 'fill-disabled': 'rgb(29 29 31 / 0.05)',
    'fill-secondary-hover': 'rgb(29 29 31 / 0.05)', 'fill-field': WHITE,
    'alpha-1': 'rgb(29 29 31 / 0.04)', 'alpha-2': 'rgb(29 29 31 / 0.08)', 'alpha-3': 'rgb(29 29 31 / 0.16)',
    'scrollbar-thumb': 'rgb(29 29 31 / 0.22)',
    'segmented-control-thumb': WHITE, 'segmented-control-track': 'rgb(29 29 31 / 0.06)',
    'switch-track': 'rgb(29 29 31 / 0.16)', 'switch-track-hover': 'rgb(29 29 31 / 0.24)',
    'tooltip-bg': INK, 'tooltip-fg': '#ffffff',
    # soft, wide shadows (offset + blur), only on what floats; cards at rest sit on the soft grey without a box
    'shadow-sm': '0 1px 2px rgb(29 29 31 / 0.06)',
    'shadow-md': '0 1px 2px rgb(29 29 31 / 0.04), 0 8px 24px -8px rgb(29 29 31 / 0.12)',
    'shadow-lg': '0 2px 6px rgb(29 29 31 / 0.05), 0 20px 40px -16px rgb(29 29 31 / 0.2)',
    'shadow-popover': '0 0 0 1px rgb(29 29 31 / 0.06), 0 12px 32px -8px rgb(29 29 31 / 0.18)',
    'shadow-panel': '0 0 0 1px rgb(29 29 31 / 0.06), 0 24px 56px -16px rgb(29 29 31 / 0.25)',
    'shadow-panel-sm': '0 0 0 1px rgb(29 29 31 / 0.06), 0 12px 32px -12px rgb(29 29 31 / 0.2)',
    'shadow-card-ring': '0 0 0 1px rgb(29 29 31 / 0.06)', 'shadow-field-ring': 'inset 0 0 0 1px rgb(29 29 31 / 0.14)',
    'shadow-tooltip': '0 6px 16px -4px rgb(29 29 31 / 0.25)',
    'focus-shadow': f'0 0 0 2px {WHITE}, 0 0 0 4px {GREEN}',
    'backdrop': 'rgb(29 29 31 / 0.32)',
    # sidebar: soft grey, active item a white pill
    'rail-bg': SOFT, 'rail-fg': INK, 'rail-muted': '#5f5f64', 'rail-hover': 'rgb(29 29 31 / 0.05)', 'rail-active': WHITE,
    'rail-border': 'rgb(29 29 31 / 0.07)',
    # named accent colours for direct use (token names kept from the first world)
    'pigment-son': CORAL, 'pigment-hoe': AMBER, 'pigment-dong': GREEN, 'pigment-cham': BLUE, 'pigment-ink': INK,
    'paper': WHITE, 'seal': GREEN, 'seal-ink': '#ffffff',
    'marker': 'rgb(159 224 191 / 0.75)',
    'radius': '10px',
}
dark = {
    'text-primary': '#f5f5f7', 'text-secondary': '#c7c7cc', 'text-muted': '#a1a1a6',
    'text-disabled': 'rgb(245 245 247 / 0.38)',
    'page-bg': '#111312', 'surface-0': '#111312', 'surface-1': '#1b1d1c', 'surface-2': '#222524', 'surface-3': '#2a2d2c',
    'surface-panel': '#222524', 'surface-popover': '#2a2d2c',
    'brand-clay': '#3a9d72', 'brand-clay-emphasized': '#46ad81', 'fill-brand': GREEN, 'fill-brand-hover': '#2f8a63',
    'on-brand': '#ffffff',
    'fill-accent': '#4fbf8a', 'fill-accent-hover': '#66cc9b', 'bg-accent': '#16302a', 'bg-accent-chip': '#16302a',
    'text-accent': '#86d9b0', 'border-accent': '#2d6b52', 'on-accent': '#0b1a12',
    'fill-danger': '#c43d29', 'fill-danger-hover': '#d14a35', 'bg-danger': '#3a1a15', 'bg-danger-chip': '#3a1a15',
    'text-danger': '#f4a597', 'border-danger': '#743226', 'on-danger': '#ffffff',
    'fill-success': '#4fbf8a', 'fill-success-hover': '#66cc9b', 'bg-success': '#16302a', 'bg-success-chip': '#16302a',
    'text-success': '#86d9b0', 'border-success': '#2d6b52', 'on-success': '#0b1a12',
    'fill-warning': '#f5b54a', 'fill-warning-hover': '#f7c46c', 'bg-warning': '#36280e', 'bg-warning-chip': '#36280e',
    'text-warning': '#f6cd80', 'border-warning': '#6e5320', 'on-warning': '#1d1d1f',
    'fill-primary': '#f5f5f7', 'fill-primary-hover': '#e0e0e3', 'on-primary': '#1d1d1f',
    'border': 'rgb(245 245 247 / 0.09)', 'border-strong': 'rgb(245 245 247 / 0.18)',
    'border-stronger': 'rgb(245 245 247 / 0.36)',
    'bg-neutral': 'rgb(245 245 247 / 0.05)', 'bg-neutral-hover': 'rgb(245 245 247 / 0.09)',
    'bg-neutral-chip': 'rgb(245 245 247 / 0.06)', 'bg-neutral-chip-hover': 'rgb(245 245 247 / 0.1)',
    'fill-ghost-hover': 'rgb(245 245 247 / 0.06)', 'fill-control': 'rgb(245 245 247 / 0.1)',
    'fill-control-hover': 'rgb(245 245 247 / 0.18)', 'fill-disabled': 'rgb(245 245 247 / 0.06)',
    'fill-secondary-hover': 'rgb(245 245 247 / 0.08)', 'fill-field': 'rgb(245 245 247 / 0.05)',
    'alpha-1': 'rgb(245 245 247 / 0.05)', 'alpha-2': 'rgb(245 245 247 / 0.1)', 'alpha-3': 'rgb(245 245 247 / 0.2)',
    'scrollbar-thumb': 'rgb(245 245 247 / 0.24)',
    'segmented-control-thumb': 'rgb(245 245 247 / 0.16)', 'segmented-control-track': 'rgb(245 245 247 / 0.06)',
    'switch-track': 'rgb(245 245 247 / 0.2)', 'switch-track-hover': 'rgb(245 245 247 / 0.3)',
    'tooltip-bg': '#f5f5f7', 'tooltip-fg': '#1d1d1f',
    'shadow-sm': '0 1px 2px rgb(0 0 0 / 0.3)',
    'shadow-md': '0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px -8px rgb(0 0 0 / 0.5)',
    'shadow-lg': '0 2px 6px rgb(0 0 0 / 0.35), 0 20px 40px -16px rgb(0 0 0 / 0.6)',
    'shadow-popover': '0 0 0 1px rgb(245 245 247 / 0.09), 0 12px 32px -8px rgb(0 0 0 / 0.6)',
    'shadow-panel': '0 0 0 1px rgb(245 245 247 / 0.1), 0 24px 56px -16px rgb(0 0 0 / 0.7)',
    'shadow-panel-sm': '0 0 0 1px rgb(245 245 247 / 0.1), 0 12px 32px -12px rgb(0 0 0 / 0.6)',
    'shadow-card-ring': '0 0 0 1px rgb(245 245 247 / 0.08)', 'shadow-field-ring': 'inset 0 0 0 1px rgb(245 245 247 / 0.14)',
    'shadow-tooltip': '0 6px 16px -4px rgb(0 0 0 / 0.5)',
    'focus-shadow': '0 0 0 2px #111312, 0 0 0 4px #4fbf8a',
    'backdrop': 'rgb(0 0 0 / 0.55)',
    'rail-bg': '#171918', 'rail-fg': '#f5f5f7', 'rail-muted': '#a1a1a6', 'rail-hover': 'rgb(245 245 247 / 0.05)',
    'rail-active': '#2a2d2c', 'rail-border': 'rgb(245 245 247 / 0.07)',
    'pigment-son': '#f0705b', 'pigment-hoe': '#f5b54a', 'pigment-dong': '#4fbf8a', 'pigment-cham': '#7d95ff',
    'pigment-ink': '#f5f5f7', 'paper': '#111312', 'seal': '#4fbf8a', 'seal-ink': '#111312',
    'marker': 'rgb(79 191 138 / 0.35)',
}
# inherited semantic scales that point at ramps: re-aim the status ones at the world
light.update({'danger-000': '#b4362b', 'danger-100': '#d23c27', 'danger-200': '#d23c27', 'danger-900': '#fdecea',
              'success-000': '#1f6b4b', 'success-100': GREEN, 'success-200': GREEN, 'success-900': '#e3f4ea',
              'warning-000': '#7a4d00', 'warning-100': '#b87310', 'warning-200': '#b87310', 'warning-900': '#fff3dc'})
dark.update({'danger-000': '#f4a597', 'danger-100': '#e5533d', 'danger-200': '#e5533d', 'danger-900': '#3a1a15',
             'success-000': '#86d9b0', 'success-100': '#4fbf8a', 'success-200': '#4fbf8a', 'success-900': '#16302a',
             'warning-000': '#f6cd80', 'warning-100': '#f5b54a', 'warning-200': '#f5b54a', 'warning-900': '#36280e'})

def block(sel, d, indent='  '):
    lines = [f'{indent}--{k}: {v};' for k, v in d.items()]
    return f'{sel} {{\n' + '\n'.join(lines) + f'\n{indent[:-2]}}}\n'

root = dict([(f'gray-{k}', v) for k, v in grays] + [(f'blue-{k}', v) for k, v in indigo])
root.update(light)
dark_scheme = dict(dark, **{'color-scheme': 'dark'})
css = ['/* GENERATED by scripts/gen-theme.py: edit the script, not this file.\n'
       '   Lượm: white page, soft grey surfaces, ink text, one green; coral, amber and blue as small markers.\n'
       '   Layered over the inherited token system (loaded after system.css), light and dark. */\n',
       block(':root', root),
       block("[data-mode='dark']", dark_scheme),
       '@media (prefers-color-scheme: dark) {\n' + block("  :root:not([data-mode='light'])", dark_scheme, '    ') + '}\n',
       (ROOT / 'scripts/theme-tail.css').read_text()]
OUT.write_text('\n'.join(css))

pairs = [('text-primary', 'page-bg'), ('text-secondary', 'page-bg'), ('text-muted', 'page-bg'), ('text-muted', 'surface-2'),
         ('text-muted', 'surface-1'), ('text-accent', 'page-bg'), ('text-danger', 'bg-danger'),
         ('text-success', 'bg-success'), ('text-warning', 'bg-warning'), ('on-brand', 'fill-brand'),
         ('on-accent', 'fill-accent'), ('rail-fg', 'rail-bg'), ('rail-muted', 'rail-bg'), ('rail-muted', 'rail-active'),
         ('text-accent', 'bg-accent'), ('text-muted', 'surface-1'), ('on-danger', 'fill-danger'),
         ('on-warning', 'fill-warning'), ('on-success', 'fill-success'), ('text-muted', 'bg-neutral-chip')]
for name, pal in (('light', light), ('dark', dark)):
    bad = []
    for fg, bg in pairs:
        f, b = pal[fg], pal[bg]
        if not f.startswith('#'): continue
        if not b.startswith('#'):  # translucent neutral chip: approximate on the surface-2
            b = pal['surface-2']
        c = contrast(f, b)
        bad.append(f'{fg}/{bg} {c:.2f}{"  <-- FAIL" if c < 4.5 else ""}')
    print(f'[{name}]', '; '.join(bad))
