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


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=60).read()


def score(path_or_bytes):
    """Higher is a better cover."""
    import io
    im = Image.open(io.BytesIO(path_or_bytes) if isinstance(path_or_bytes, bytes)
                    else path_or_bytes).convert("RGB")
    im.thumbnail((160, 160))
    px = list(im.getdata())
    n = len(px)
    lum = [(r * 299 + g * 587 + b * 114) / 1000 for r, g, b in px]
    mean = sum(lum) / n

    # a black studio backdrop: most of the frame is nearly black
    dark_share = sum(1 for v in lum if v < 40) / n
    # skin: warm, mid-bright, red above blue by a clear margin
    skin = sum(1 for r, g, b in px
               if 95 < r < 245 and 55 < g < 200 and 40 < b < 190
               and r > b + 18 and r > g + 8) / n
    # near-monochrome frames (pure packshots) read flat
    sat = sum(max(p) - min(p) for p in px) / n

    return (skin * 260) - (dark_share * 200) + (mean * 0.28) + (sat * 0.25)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("vendor")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    moved = 0
    for p in all_products():
        if p["vendor"].lower() != args.vendor.lower():
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
