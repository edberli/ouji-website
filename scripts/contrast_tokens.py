#!/usr/bin/env python3
"""Check explicitly allowed semantic text/surface pairings and non-text boundaries."""
import re
from pathlib import Path

css = Path(__file__).resolve().parents[1] / 'ds/tokens.css'
raw = css.read_text()
values = dict(re.findall(r'(--o-[\w-]+):\s*(#[0-9a-fA-F]{6}|var\(--o-[\w-]+\))\s*;', raw))

def rgb(value):
    while value in values:
        value = values[value]
        if value.startswith('var('): value = value[4:-1]
    value = value.lstrip('#')
    return tuple(int(value[i:i+2], 16) / 255 for i in (0, 2, 4))

def luminance(value):
    return sum(coef * (v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4)
               for coef, v in zip((.2126, .7152, .0722), rgb(value)))

def contrast(fg, bg):
    a, b = sorted((luminance(fg), luminance(bg)), reverse=True)
    return (a+.05)/(b+.05)

light = ['--o-white', '--o-canvas', '--o-n-50', '--o-blue-50']
text = ['--o-blue-900', '--o-n-600', '--o-n-500', '--o-blue-700',
        '--o-sale', '--o-success', '--o-warning', '--o-error']
pairs = [(f,b,4.5) for b in light for f in text]
pairs += [(f,'--o-blue-800',4.5) for f in ('--o-on-dark','--o-on-dark-2')]
pairs += [('--o-white','--o-blue-650',4.5), ('--o-white','--o-blue-680',4.5),
          ('--o-sale','--o-sale-bg',4.5), ('--o-promo','--o-promo-bg',4.5),
          ('--o-award','--o-award-bg',4.5), ('--o-success','--o-success-bg',4.5),
          ('--o-error','--o-error-bg',4.5), ('--o-info','--o-info-bg',4.5)]
pairs += [('--o-n-450',b,3) for b in light]
pairs += [('--o-blue-800',b,3) for b in light]
pairs += [('--o-white','--o-blue-800',3), ('--o-white','--o-blue-950',3)]
failed=[]
print(f'{"foreground":<20} {"background":<20} {"ratio":>7} {"min":>5}  result')
for fg,bg,minimum in pairs:
    ratio=contrast(fg,bg)
    status='PASS' if ratio+1e-9>=minimum else 'FAIL'
    print(f'{fg:<20} {bg:<20} {ratio:7.2f} {minimum:5.1f}  {status}')
    if status=='FAIL': failed.append((fg,bg,ratio))
print(f'Checked {len(pairs)} pairs; failures: {len(failed)}')
raise SystemExit(bool(failed))
