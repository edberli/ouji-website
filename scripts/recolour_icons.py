#!/usr/bin/env python3
"""Repaint every app icon in the brand blue, keeping the exact OUJI lettering.

The icons were already the right shape — a rounded square with the OUJI
wordmark — but painted on `#1e3038`, the near-black we used before the
palette moved to the brand blue. Google's search result still showed an
even older mark, so the files needed to change anyway to prompt a re-fetch.

The lettering is **not** redrawn. Every pixel in these icons is a blend of
exactly two colours — the dark background and the cream letters — so the
blend factor per pixel recovers the original anti-aliased artwork, and
recomposing it against the new background keeps the letterforms and their
soft edges byte-for-byte faithful. Redrawing with a font would have meant
guessing the typeface, tracking and optical centring all over again.

    python3 scripts/recolour_icons.py

Writes favicon.ico (6 sizes), favicon.png, apple-touch-icon.png and
favicon.svg in place.
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OLD_BG = (30, 48, 56)      # #1e3038 —— 舊嘅近黑
INK = (250, 248, 244)      # #faf8f4 —— 米白字，唔變
NEW_BG = (109, 163, 181)   # #6da3b5 —— 品牌 logo 主色

ICO_SIZES = [16, 32, 48, 64, 128, 256]


def repaint(im):
    """把每個像素由（舊底 → 字）嘅混合，重算成（新底 → 字）。"""
    im = im.convert("RGBA")
    out = Image.new("RGBA", im.size)
    src, dst = im.load(), out.load()
    w, h = im.size
    # 用綠通道算混合比例：舊底同字色喺呢個通道差距最大（48 vs 248），
    # 分母大，量化誤差最細。
    lo, hi = OLD_BG[1], INK[1]
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a == 0:
                dst[x, y] = (0, 0, 0, 0)
                continue
            t = (g - lo) / (hi - lo)
            t = 0.0 if t < 0 else 1.0 if t > 1 else t
            dst[x, y] = tuple(
                round(NEW_BG[i] + (INK[i] - NEW_BG[i]) * t) for i in range(3)
            ) + (a,)
    return out


def main():
    # 由 .ico 入面最大嗰張（256px）出發，之後每個尺寸都由佢縮，質素最好。
    ico = Image.open(os.path.join(ROOT, "favicon.ico"))
    ico.size = (256, 256)
    master = repaint(ico.convert("RGBA"))

    master.save(os.path.join(ROOT, "favicon.ico"),
                sizes=[(s, s) for s in ICO_SIZES])
    master.resize((32, 32), Image.LANCZOS).save(
        os.path.join(ROOT, "favicon.png"))
    master.resize((180, 180), Image.LANCZOS).save(
        os.path.join(ROOT, "apple-touch-icon.png"))

    # SVG 嗰個底色寫死喺 <rect>，直接換色就得，入面嵌住嘅字樣唔郁。
    p = os.path.join(ROOT, "favicon.svg")
    svg = open(p).read()
    svg = svg.replace('fill="#1e3038"', 'fill="#6da3b5"')
    open(p, "w").write(svg)

    print("favicon.ico  ", ICO_SIZES)
    print("favicon.png   32x32")
    print("apple-touch-icon.png  180x180")
    print("favicon.svg   底色 #1e3038 → #6da3b5")


if __name__ == "__main__":
    main()
