#!/usr/bin/env python3
"""
Cut the brand-section banners used by catalog.js.

Category pages group products under a brand header; without artwork the
header falls back to a plain typographic band, so each brand gets one
wide crop taken from imagery we have already mirrored from its own site
or Olive Young listing.

    python3 scripts/make_brand_banners.py

`focus` is where the interesting part sits vertically, 0 = top, 1 =
bottom — faces and key-visual type usually sit high, not centre.
"""
import os

from PIL import Image

W, H = 1400, 490

BANNERS = {
    "coralhaze": ("brands/coralhaze/gallery/coralhaze-glow-lock-jelly-tint-06.jpg", 0.35),
    "braye": ("brands/braye/oy/gallery/braye-lipsleek-01.jpg", 0.35),
    "glint": ("brands/glint/oy/gallery/glint-highlighter-03.jpg", 0.30),
    # the brand's key visual is a boy-group poster too tall to band-crop;
    # its palette cover reads better wide
    "heartpercent": ("brands/heartpercent/gallery/heart-percent-dote-on-mood-eye-palette-01.jpg", 0.5),
}


def cut(src, focus, dest):
    im = Image.open(src).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    top = max(0, min(im.height - H, round(im.height * focus - H / 2)))
    left = max(0, (im.width - W) // 2)
    im.crop((left, top, left + W, top + H)).save(dest, "JPEG", quality=86, optimize=True)
    return os.path.getsize(dest)


def main():
    for slug, (src, focus) in BANNERS.items():
        dest = os.path.join("brands", slug, "banner.jpg")
        if not os.path.exists(src):
            print(f"  MISSING  {src}")
            continue
        n = cut(src, focus, dest)
        print(f"  {n/1024:6.0f}KB  {dest}")


if __name__ == "__main__":
    main()
