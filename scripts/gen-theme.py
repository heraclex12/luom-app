#!/usr/bin/env python3
"""Generates src/renderer/src/styles/envi-theme.css: the Đông Hồ print world (light + dark) over the inherited token
system. Edit the palettes here and rerun: `python3 scripts/gen-theme.py`. Prints WCAG contrast for the key text pairs."""
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
grays = [(k, from_oklch(to_oklch(v)[0], 0.006 + 0.010 * (1 - abs(2 * to_oklch(v)[0] - 1)), 70)) for k, v in ramp('gray')]
indigo = [(k, from_oklch(to_oklch(v)[0], min(0.13, to_oklch(v)[1] * 1.05 + 0.01), 262)) for k, v in ramp('blue')]

# ---- the world ----
INK = '#1d1915'        # than tre: bamboo-leaf charcoal
PAPER = '#f3efe6'      # giấy điệp: shell-white dó paper
SON = '#b3342a'        # son: earth red
HOE = '#e3b12f'        # hoa hòe: sophora yellow
DONG = '#2e7656'       # gỉ đồng: copper green
CHAM = '#2d4f8a'       # chàm: indigo

light = {
    'text-primary': INK, 'text-secondary': '#4a4239', 'text-muted': '#6a6055',
    'text-disabled': 'rgb(29 25 21 / 0.38)',
    'page-bg': PAPER, 'surface-0': PAPER, 'surface-1': '#f8f5ee', 'surface-2': '#fffdf8', 'surface-3': '#fffdf8',
    'surface-panel': '#fffdf8', 'surface-popover': '#fffdf8',
    # primary action and brand: son red; one red family, danger is its deeper shade
    'brand-clay': SON, 'brand-clay-emphasized': '#9a2b22', 'fill-brand': SON, 'fill-brand-hover': '#9a2b22',
    'on-brand': '#fffaf2',
    # accent (links, focus, selection): chàm indigo
    'fill-accent': CHAM, 'fill-accent-hover': '#243f70', 'bg-accent': '#dde4f1', 'bg-accent-chip': '#dde4f1',
    'text-accent': '#26437a', 'border-accent': '#9fb1d4', 'on-accent': '#ffffff',
    'fill-danger': '#a8302a', 'fill-danger-hover': '#8f261f', 'bg-danger': '#f4dcd5', 'bg-danger-chip': '#f4dcd5',
    'text-danger': '#8a231c', 'border-danger': '#dc9a8f', 'on-danger': '#ffffff',
    'fill-success': DONG, 'fill-success-hover': '#256347', 'bg-success': '#d8eadf', 'bg-success-chip': '#d8eadf',
    'text-success': '#1f5a40', 'border-success': '#8cc0a6', 'on-success': '#ffffff',
    'fill-warning': HOE, 'fill-warning-hover': '#cf9c1d', 'bg-warning': '#f6e5ad', 'bg-warning-chip': '#f6e5ad',
    'text-warning': '#674a05', 'border-warning': '#d8b04a', 'on-warning': INK,
    'fill-primary': INK, 'fill-primary-hover': '#3a332b', 'on-primary': '#fffaf2',
    'border': 'rgb(29 25 21 / 0.12)', 'border-strong': 'rgb(29 25 21 / 0.24)', 'border-stronger': 'rgb(29 25 21 / 0.45)',
    'bg-neutral': 'rgb(29 25 21 / 0.05)', 'bg-neutral-hover': 'rgb(29 25 21 / 0.09)',
    'bg-neutral-chip': 'rgb(29 25 21 / 0.06)', 'bg-neutral-chip-hover': 'rgb(29 25 21 / 0.1)',
    'fill-ghost-hover': 'rgb(29 25 21 / 0.06)', 'fill-control': 'rgb(29 25 21 / 0.1)',
    'fill-control-hover': 'rgb(29 25 21 / 0.2)', 'fill-disabled': 'rgb(29 25 21 / 0.06)',
    'fill-secondary-hover': 'rgb(29 25 21 / 0.06)', 'fill-field': '#fffdf8',
    'alpha-1': 'rgb(29 25 21 / 0.05)', 'alpha-2': 'rgb(29 25 21 / 0.1)', 'alpha-3': 'rgb(29 25 21 / 0.2)',
    'scrollbar-thumb': 'rgb(29 25 21 / 0.28)',
    'segmented-control-thumb': '#fffdf8', 'segmented-control-track': 'rgb(29 25 21 / 0.06)',
    'switch-track': 'rgb(29 25 21 / 0.22)', 'switch-track-hover': 'rgb(29 25 21 / 0.32)',
    'tooltip-bg': INK, 'tooltip-fg': '#fffaf2',
    # flat pigment: hairline rings, shadows only where something floats
    'shadow-sm': '0 1px 0 rgb(29 25 21 / 0.06)',
    'shadow-md': '0 1px 2px rgb(29 25 21 / 0.06), 0 4px 12px rgb(29 25 21 / 0.06)',
    'shadow-lg': '0 2px 4px rgb(29 25 21 / 0.08), 0 10px 24px rgb(29 25 21 / 0.08)',
    'shadow-popover': '0 2px 4px rgb(29 25 21 / 0.08), 0 10px 24px rgb(29 25 21 / 0.12)',
    'shadow-panel': '0 0 0 1px rgb(29 25 21 / 0.14), 0 2px 4px rgb(29 25 21 / 0.08), 0 10px 24px rgb(29 25 21 / 0.12)',
    'shadow-panel-sm': '0 0 0 1px rgb(29 25 21 / 0.14), 0 2px 8px rgb(29 25 21 / 0.08)',
    'shadow-card-ring': '0 0 0 1px rgb(29 25 21 / 0.12)', 'shadow-field-ring': 'inset 0 0 0 1px rgb(29 25 21 / 0.18)',
    'shadow-tooltip': '0 2px 8px rgb(29 25 21 / 0.18)',
    'focus-shadow': f'0 0 0 2px {PAPER}, 0 0 0 4px {CHAM}',
    'backdrop': 'rgb(29 25 21 / 0.45)',
    # shell rail: ink block
    'rail-bg': INK, 'rail-fg': '#f3ece0', 'rail-muted': '#b9ae9c', 'rail-hover': '#2c2620', 'rail-active': '#3a322a',
    'rail-border': 'rgb(243 236 224 / 0.1)',
    # world pigments for direct use
    'pigment-son': SON, 'pigment-hoe': HOE, 'pigment-dong': DONG, 'pigment-cham': CHAM, 'pigment-ink': INK,
    'paper': PAPER, 'seal': SON, 'seal-ink': '#fffaf2',
    'marker': 'rgb(227 177 47 / 0.5)',
    'radius': '4px',
}
dark = {
    'text-primary': '#f1e9dc', 'text-secondary': '#cbbfac', 'text-muted': '#a59985',
    'text-disabled': 'rgb(241 233 220 / 0.38)',
    'page-bg': '#14110e', 'surface-0': '#14110e', 'surface-1': '#1a1612', 'surface-2': '#221d18', 'surface-3': '#2a241e',
    'surface-panel': '#221d18', 'surface-popover': '#2a241e',
    'brand-clay': '#d44a3c', 'brand-clay-emphasized': '#e05e4f', 'fill-brand': '#c9402f', 'fill-brand-hover': '#d65040',
    'on-brand': '#fffaf2',
    'fill-accent': '#7d9bd6', 'fill-accent-hover': '#93ade0', 'bg-accent': '#1d2840', 'bg-accent-chip': '#1d2840',
    'text-accent': '#a9bfe8', 'border-accent': '#3d5486', 'on-accent': '#0f1626',
    'fill-danger': '#d0503f', 'fill-danger-hover': '#dc6352', 'bg-danger': '#3a1914', 'bg-danger-chip': '#3a1914',
    'text-danger': '#f0a093', 'border-danger': '#6e2a22', 'on-danger': '#fffaf2',
    'fill-success': '#4fa57f', 'fill-success-hover': '#60b48e', 'bg-success': '#16291f', 'bg-success-chip': '#16291f',
    'text-success': '#8fd0b0', 'border-success': '#2c5a43', 'on-success': '#0b1a12',
    'fill-warning': '#e3b12f', 'fill-warning-hover': '#ecc04d', 'bg-warning': '#33270b', 'bg-warning-chip': '#33270b',
    'text-warning': '#efcd6e', 'border-warning': '#6b5414', 'on-warning': '#1d1915',
    'fill-primary': '#f1e9dc', 'fill-primary-hover': '#ddd3c3', 'on-primary': '#1d1915',
    'border': 'rgb(241 233 220 / 0.12)', 'border-strong': 'rgb(241 233 220 / 0.22)',
    'border-stronger': 'rgb(241 233 220 / 0.42)',
    'bg-neutral': 'rgb(241 233 220 / 0.05)', 'bg-neutral-hover': 'rgb(241 233 220 / 0.09)',
    'bg-neutral-chip': 'rgb(241 233 220 / 0.06)', 'bg-neutral-chip-hover': 'rgb(241 233 220 / 0.1)',
    'fill-ghost-hover': 'rgb(241 233 220 / 0.06)', 'fill-control': 'rgb(241 233 220 / 0.1)',
    'fill-control-hover': 'rgb(241 233 220 / 0.2)', 'fill-disabled': 'rgb(241 233 220 / 0.06)',
    'fill-secondary-hover': 'rgb(241 233 220 / 0.08)', 'fill-field': 'rgb(241 233 220 / 0.05)',
    'alpha-1': 'rgb(241 233 220 / 0.05)', 'alpha-2': 'rgb(241 233 220 / 0.1)', 'alpha-3': 'rgb(241 233 220 / 0.2)',
    'scrollbar-thumb': 'rgb(241 233 220 / 0.28)',
    'segmented-control-thumb': 'rgb(241 233 220 / 0.16)', 'segmented-control-track': 'rgb(241 233 220 / 0.06)',
    'switch-track': 'rgb(241 233 220 / 0.22)', 'switch-track-hover': 'rgb(241 233 220 / 0.32)',
    'tooltip-bg': '#f1e9dc', 'tooltip-fg': '#1d1915',
    'shadow-sm': '0 1px 0 rgb(0 0 0 / 0.3)',
    'shadow-md': '0 1px 2px rgb(0 0 0 / 0.3), 0 4px 12px rgb(0 0 0 / 0.3)',
    'shadow-lg': '0 2px 4px rgb(0 0 0 / 0.35), 0 10px 24px rgb(0 0 0 / 0.35)',
    'shadow-popover': '0 0 0 1px rgb(241 233 220 / 0.1), 0 10px 24px rgb(0 0 0 / 0.45)',
    'shadow-panel': '0 0 0 1px rgb(241 233 220 / 0.12), 0 10px 24px rgb(0 0 0 / 0.45)',
    'shadow-panel-sm': '0 0 0 1px rgb(241 233 220 / 0.12), 0 2px 8px rgb(0 0 0 / 0.35)',
    'shadow-card-ring': '0 0 0 1px rgb(241 233 220 / 0.12)', 'shadow-field-ring': 'inset 0 0 0 1px rgb(241 233 220 / 0.16)',
    'shadow-tooltip': '0 2px 8px rgb(0 0 0 / 0.4)',
    'focus-shadow': '0 0 0 2px #14110e, 0 0 0 4px #7d9bd6',
    'backdrop': 'rgb(0 0 0 / 0.6)',
    'rail-bg': '#0e0c0a', 'rail-fg': '#f1e9dc', 'rail-muted': '#a59985', 'rail-hover': '#1f1a15', 'rail-active': '#2c251f',
    'rail-border': 'rgb(241 233 220 / 0.08)',
    'pigment-son': '#d44a3c', 'pigment-hoe': '#e3b12f', 'pigment-dong': '#4fa57f', 'pigment-cham': '#7d9bd6',
    'pigment-ink': '#f1e9dc', 'paper': '#14110e', 'seal': '#d44a3c', 'seal-ink': '#14110e',
    'marker': 'rgb(227 177 47 / 0.32)',
}
# inherited semantic scales that point at ramps: re-aim the status ones at the pigments
light.update({'danger-000': '#8a231c', 'danger-100': '#a8302a', 'danger-200': '#a8302a', 'danger-900': '#f4dcd5',
              'success-000': '#1f5a40', 'success-100': DONG, 'success-200': DONG, 'success-900': '#d8eadf',
              'warning-000': '#674a05', 'warning-100': '#a87b10', 'warning-200': '#a87b10', 'warning-900': '#f6e5ad'})
dark.update({'danger-000': '#f0a093', 'danger-100': '#d0503f', 'danger-200': '#d0503f', 'danger-900': '#3a1914',
             'success-000': '#8fd0b0', 'success-100': '#4fa57f', 'success-200': '#4fa57f', 'success-900': '#16291f',
             'warning-000': '#efcd6e', 'warning-100': '#e3b12f', 'warning-200': '#e3b12f', 'warning-900': '#33270b',
             'scrollbar-thumb': 'rgb(241 233 220 / 0.28)'})

def block(sel, d, indent='  '):
    lines = [f'{indent}--{k}: {v};' for k, v in d.items()]
    return f'{sel} {{\n' + '\n'.join(lines) + f'\n{indent[:-2]}}}\n'

root = dict([(f'gray-{k}', v) for k, v in grays] + [(f'blue-{k}', v) for k, v in indigo])
root.update(light)
dark_scheme = dict(dark, **{'color-scheme': 'dark'})
css = ['/* GENERATED by scripts/gen-theme.py: edit the script, not this file.\n'
       '   Lượm as a Đông Hồ folk print: dó paper, than tre ink, son red, hoa hòe yellow, gỉ đồng green, chàm indigo.\n'
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
