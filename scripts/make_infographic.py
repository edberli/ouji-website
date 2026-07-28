#!/usr/bin/env python3
"""
Generate long-form Traditional Chinese product infographics (Taobao style).

Composites real product photography with OUJI-branded 繁體中文 copy into a
single tall image, then slices it into web-friendly chunks.

Usage:
    python3 scripts/make_infographic.py <config.json> <outdir>
"""
import json
import sys
import os
from PIL import Image, ImageDraw, ImageFont

W = 1000
DARK = (30, 48, 56)        # --dark-base
DEEP = (46, 80, 92)        # --primary-deep
PRIMARY = (99, 149, 166)   # --primary
CREAM = (253, 248, 243)    # --warm-50
WARM = (240, 221, 200)     # --warm-200
GREY = (120, 135, 142)

LATIN = "/System/Library/Fonts/Supplemental/Futura.ttc"
CJK_B = "/System/Library/Fonts/STHeiti Medium.ttc"
CJK_R = "/System/Library/Fonts/STHeiti Light.ttc"


def f_cjk(size, bold=False):
    return ImageFont.truetype(CJK_B if bold else CJK_R, size)


def f_lat(size):
    return ImageFont.truetype(LATIN, size)


def centre(d, y, text, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], y), text, font=font, fill=fill)
    return y + (bb[3] - bb[1])


def wrap(d, text, font, max_w):
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur)
            cur = ""
            continue
        t = cur + ch
        if d.textbbox((0, 0), t, font=font)[2] > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines


def fit(img, w, h):
    """Cover-fit a photo into w x h."""
    r = max(w / img.width, h / img.height)
    im = img.resize((int(img.width * r), int(img.height * r)), Image.LANCZOS)
    x = (im.width - w) // 2
    y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def build(cfg, outdir):
    photos = {k: Image.open(v).convert("RGB") for k, v in cfg["photos"].items()}
    panels = []

    # ---- 1. Cover ----------------------------------------------------------
    p = Image.new("RGB", (W, 1150), CREAM)
    d = ImageDraw.Draw(p)
    p.paste(fit(photos["hero"], W, 760), (0, 0))
    y = 810
    y = centre(d, y, cfg["brand"], f_lat(40), PRIMARY) + 26
    y = centre(d, y, cfg["title_zh"], f_cjk(58, True), DARK) + 22
    centre(d, y, cfg["title_en"], f_lat(30), GREY)
    d.rectangle([W / 2 - 46, 1075, W / 2 + 46, 1079], fill=PRIMARY)
    panels.append(p)

    # ---- 2. Selling points -------------------------------------------------
    pts = cfg["points"]
    p = Image.new("RGB", (W, 200 + len(pts) * 205), "white")
    d = ImageDraw.Draw(p)
    y = centre(d, 78, "產品特點", f_cjk(44, True), DARK) + 60
    for i, pt in enumerate(pts):
        top = y + i * 205
        d.rectangle([70, top, 930, top + 165], fill=CREAM)
        d.text((110, top + 34), f"{i + 1:02d}", font=f_lat(46), fill=PRIMARY)
        d.text((205, top + 32), pt["t"], font=f_cjk(34, True), fill=DARK)
        for j, ln in enumerate(wrap(d, pt["d"], f_cjk(24), 660)):
            d.text((205, top + 84 + j * 36), ln, font=f_cjk(24), fill=GREY)
    panels.append(p)

    # ---- 3. Texture / lifestyle shot ---------------------------------------
    if "texture" in photos:
        p = Image.new("RGB", (W, 820), "white")
        p.paste(fit(photos["texture"], W, 700), (0, 60))
        panels.append(p)

    # ---- 4. Shade chart ----------------------------------------------------
    shades = cfg.get("shades", [])
    if shades:
        rows = len(shades)
        p = Image.new("RGB", (W, 190 + rows * 150), CREAM)
        d = ImageDraw.Draw(p)
        y = centre(d, 72, "色號選擇", f_cjk(44, True), DARK) + 56
        for i, s in enumerate(shades):
            top = y + i * 150
            sw = Image.open(s["img"]).convert("RGB")
            sw = fit(sw, 250, 118)
            p.paste(sw, (70, top))
            d.text((350, top + 26), s["code"] + " " + s["en"], font=f_lat(34), fill=DARK)
            d.text((350, top + 74), s["zh"], font=f_cjk(28), fill=GREY)
        panels.append(p)

    # ---- 5. How to use -----------------------------------------------------
    steps = cfg.get("steps", [])
    if steps:
        p = Image.new("RGB", (W, 210 + len(steps) * 120), "white")
        d = ImageDraw.Draw(p)
        y = centre(d, 74, "使用方法", f_cjk(44, True), DARK) + 62
        for i, s in enumerate(steps):
            top = y + i * 120
            d.ellipse([80, top, 138, top + 58], fill=PRIMARY)
            bb = d.textbbox((0, 0), str(i + 1), font=f_lat(30))
            d.text((109 - (bb[2] - bb[0]) / 2, top + 14), str(i + 1), font=f_lat(30), fill="white")
            for j, ln in enumerate(wrap(d, s, f_cjk(26), 700)):
                d.text((175, top + 8 + j * 38), ln, font=f_cjk(26), fill=DARK)
        panels.append(p)

    # ---- 6. Spec + footer --------------------------------------------------
    specs = cfg.get("specs", [])
    p = Image.new("RGB", (W, 200 + len(specs) * 74 + 190), DARK)
    d = ImageDraw.Draw(p)
    y = centre(d, 70, "產品資料", f_cjk(40, True), "white") + 56
    for i, (k, v) in enumerate(specs):
        top = y + i * 74
        d.text((110, top), k, font=f_cjk(26), fill=(150, 175, 185))
        d.text((330, top), v, font=f_cjk(26), fill="white")
        d.line([110, top + 50, 890, top + 50], fill=(60, 85, 96))
    fy = y + len(specs) * 74 + 60
    centre(d, fy, "OUJI", f_lat(46), "white")
    centre(d, fy + 66, "香港最齊 K-Beauty 專門店 · 100% 正品保證", f_cjk(24), (150, 175, 185))
    panels.append(p)

    # ---- stitch + slice ----------------------------------------------------
    H = sum(x.height for x in panels)
    full = Image.new("RGB", (W, H), "white")
    y = 0
    for x in panels:
        full.paste(x, (0, y))
        y += x.height

    os.makedirs(outdir, exist_ok=True)
    slug = cfg["slug"]
    full.save(f"{outdir}/{slug}-full.jpg", quality=88)

    # slice into ~1200px chunks so browsers stream them nicely
    parts, i, y = [], 1, 0
    while y < H:
        h = min(1200, H - y)
        full.crop((0, y, W, y + h)).save(f"{outdir}/{slug}-{i:02d}.jpg", quality=88)
        parts.append(f"{slug}-{i:02d}.jpg")
        y += h
        i += 1
    return full.size, parts


if __name__ == "__main__":
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    size, parts = build(cfg, sys.argv[2])
    print(f"{cfg['slug']}: {size[0]}x{size[1]} -> {len(parts)} slices")
    for p in parts:
        print("  ", p)
