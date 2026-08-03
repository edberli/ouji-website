#!/usr/bin/env python3
"""
Shrink mirrored brand imagery to web weight.

Korean brand sites ship 6-9 MB animated GIFs and multi-MB WebP for their
swatch demos, plus uncompressed 2000px JPEGs. Serving those as-is
would make a product page a 190 MB download, so we flatten GIFs to their
first frame and cap everything at 1200px / quality 82 JPEG.

    python3 scripts/optimise_brand_images.py brands/coralhaze
"""
import os
import sys

from PIL import Image, ImageSequence

MAX_W = 1200
QUALITY = 82


def optimise(path):
    before = os.path.getsize(path)
    im = Image.open(path)
    if getattr(im, "is_animated", False):
        im = next(ImageSequence.Iterator(im))
    im = im.convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    out = os.path.splitext(path)[0] + ".jpg"
    im.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    if out != path:
        os.remove(path)
    return before, os.path.getsize(out), out


def main(root):
    b = a = 0
    for dirpath, _, names in os.walk(root):
        for n in sorted(names):
            if not n.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
                continue
            try:
                x, y, out = optimise(os.path.join(dirpath, n))
                b, a = b + x, a + y
            except Exception as e:
                print(f"  FAIL {n}: {e}")
    print(f"{b/1024/1024:.1f} MB → {a/1024/1024:.1f} MB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "brands/coralhaze")
