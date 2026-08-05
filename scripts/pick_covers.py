#!/usr/bin/env python3
"""
Reorder a product's media so the best image leads.

Brands ship two kinds of gallery image: a packshot on a hard black
studio背景, and a model or lifestyle shot. The packshot is usually first
on their own site, so mirroring in order put a black tile on every card
— which reads as cheap next to the rest of the grid.

Scoring favours, in order: a face or hand in frame, a light background,
and colour that is not near-monochrome. Anything scoring below the
current cover is left alone, so a brand that already leads with a good
shot is untouched.

    python3 scripts/pick_covers.py TIRTIR --dry-run
    python3 scripts/pick_covers.py TIRTIR
"""
import argparse
import os
import sys
import urllib.request

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import all_products, gql, user_errors  # noqa: E402

MEDIA_Q = """
query($id: ID!) {
  product(id: $id) {
    id title
    media(first: 50) { edges { node { id ... on MediaImage { image { url } } } } }
  }
}
"""

REORDER = """
mutation($id: ID!, $moves: [MoveInput!]!) {
  productReorderMedia(id: $id, moves: $moves) {
    userErrors { field message }
  }
}
"""

# Covers chosen by eye, which this must never overwrite. Scoring cannot
# tell a swatch chart from a packshot, so every sweep used to undo the
# hand-fixed ones and the same covers went bad again.
LOCK_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "covers.lock.json")


def locked():
    import json
    try:
        with open(LOCK_PATH) as f:
            return set(json.load(f))
    except (OSError, ValueError):
        return set()


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=60).read()


def score(path_or_bytes):
    """Higher is a better cover.

    The product has to be visible. Scoring on skin alone promoted macro
    shots of an eye, a lip or a swatch — frames where the product does not
    appear at all, which tells a shopper nothing about what they are
    buying. Packaging has hard edges and straight lines; skin and swatches
    do not, so edge density is what separates them.

    Order of preference: a studio product shot, a model holding the
    product, a plain packshot. Never a skin macro or a colour chart.
    """
    import io
    from PIL import ImageFilter, ImageStat

    im = Image.open(io.BytesIO(path_or_bytes) if isinstance(path_or_bytes, bytes)
                    else path_or_bytes).convert("RGB")
    im.thumbnail((200, 200))
    px = list(im.getdata())
    n = len(px)
    lum = [(r * 299 + g * 587 + b * 114) / 1000 for r, g, b in px]
    mean = sum(lum) / n

    dark_share = sum(1 for v in lum if v < 40) / n
    skin = sum(1 for r, g, b in px
               if 95 < r < 245 and 55 < g < 200 and 40 < b < 190
               and r > b + 18 and r > g + 8) / n

    # crisp packaging edges vs smooth skin / soft swatches
    edges = ImageStat.Stat(im.convert("L").filter(ImageFilter.FIND_EDGES)).mean[0]

    s = 0.0
    s += min(edges, 30) * 4.0          # product in frame — the main signal
    s += (mean - 110) * 0.30           # bright studio background
    s -= dark_share * 260              # black backdrop
    if skin > 0.50:
        s -= (skin - 0.50) * 500       # a face or swatch filling the frame
    elif 0.08 < skin < 0.40:
        s += 25                        # a model holding it reads well
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("vendor", nargs="?", help="omit with --audit to scan every brand")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--audit", action="store_true",
                    help="list products whose cover is still dark or flat, "
                         "meaning their whole gallery is and a new image must "
                         "be sourced (Olive Young, the brand's Instagram)")
    args = ap.parse_args()

    if args.audit:
        bad = []
        for p in all_products():
            if p["status"] != "ACTIVE":
                continue
            if args.vendor and p["vendor"].lower() != args.vendor.lower():
                continue
            m = gql(MEDIA_Q, {"id": p["id"]})["product"]["media"]["edges"]
            url = next(((e["node"].get("image") or {}).get("url") for e in m), None)
            if not url:
                continue
            try:
                s_ = score(fetch(url))
            except Exception:
                continue
            if s_ < 20:
                bad.append((round(s_), p["vendor"], p["title"]))
        bad.sort()
        print(f"{len(bad)} 個產品封面仍然偏暗／單調，要另外搵圖：")
        for s_, v, t in bad:
            print(f"{s_:>5}  {v:<14} {t}")
        return

    moved = 0
    keep = locked()
    for p in all_products():
        if p["vendor"].lower() != args.vendor.lower():
            continue
        if p["handle"] in keep:
            print(f"  lock   {p['title'][:44]}")
            continue
        media = gql(MEDIA_Q, {"id": p["id"]})["product"]["media"]["edges"]
        imgs = [(e["node"]["id"], (e["node"].get("image") or {}).get("url"))
                for e in media]
        imgs = [(i, u) for i, u in imgs if u]
        if len(imgs) < 2:
            continue

        scored = []
        for mid, url in imgs:
            try:
                scored.append((score(fetch(url)), mid, url))
            except Exception:
                scored.append((-999, mid, url))
        best = max(scored)
        current = scored[0]
        if best[1] == current[1] or best[0] <= current[0] + 8:
            print(f"  keep   {p['title'][:44]}")
            continue

        print(f"  move   {p['title'][:44]}   {current[0]:.0f} -> {best[0]:.0f}")
        moved += 1
        if args.dry_run:
            continue
        data = gql(REORDER, {"id": p["id"],
                             "moves": [{"id": best[1], "newPosition": "0"}]})
        user_errors(data, "productReorderMedia")

    print(f"\n{moved} 個產品換咗封面" + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
