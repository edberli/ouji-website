#!/usr/bin/env python3
"""
Collect the imagery for each lens colour.

Two sources, in this order:

  * the supplier's own SHOPLINE store, which has the Hong Kong packaging
    and the Chinese colour names — best when it carries the colour
  * the Japanese brand's own site, which publishes a page per colour with
    a packshot, lens close-ups and worn-eye shots

The brand pages matter more than usual here. Nobody buys a circle lens
from a photograph of the box: they buy from the picture of the colour on
an eye, and that picture only exists on the brand's own site.

    python3 scripts/fetch_lens_images.py --dry-run
    python3 scripts/fetch_lens_images.py

Output: /tmp/lens_images.json, {colour: [urls]}.

A page that does not name the colour it was asked for is discarded. These
sites answer 200 for a wrong slug and serve their front page, so
"it loaded" is not evidence the colour exists.
"""
import argparse
import concurrent.futures as cf
import json
import os
import re
import urllib.parse
import urllib.request

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lens_data import brand_of, load, shade_of  # noqa: E402

OUT = "/tmp/lens_images.json"
SUPPLIER_URLS = "/tmp/lens_urls.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

BRAND_SITE = {
    "Feliamo": "www.feliamo.jp", "Lilmoon": "www.lilmoon.jp",
    "Molak": "www.molak.jp", "N's Collection": "www.ns-collection.jp",
    "TOPARDS": "www.topards.jp",
}

# Shared furniture on the brand pages: UV icons, water-content badges,
# the header logo. Not the colour.
SKIP = ("/common/", "logo", "icon", "btn_", "nav_", "banner", "sns_", "arrow")


def fetch(url, limit=900_000):
    req = urllib.request.Request(urllib.parse.quote(url, safe=":/?=&%"), headers=UA)
    with urllib.request.urlopen(req, timeout=30) as h:
        return h.read(limit).decode("utf8", "ignore")


def slugs(shade):
    """Every way these sites might have spelled it.

    "Pearl CatsEye" is pearl_cats_eye on topards.jp — the brand splits a
    word our own listing runs together, and the site answers 200 for the
    wrong slug, so a missing form looks like a missing colour rather than
    a missing guess."""
    s = re.sub(r"[^a-z0-9]+", "_", shade.lower()).strip("_")
    flat = s.replace("_", "")
    # split runs like "catseye" -> "cats_eye" on known joins
    split = s
    for a, b in (("catseye", "cats_eye"), ("cateye", "cat_eye"),
                 ("catspearl", "cat_pearl")):
        split = split.replace(a, b)
    out = [s, split, flat]
    for base in (s, split, flat):
        out += [f"{base}_1day", f"1day_{base}"]
    return list(dict.fromkeys(out))


def from_brand(colour):
    """The brand's own colour page, if the page really is that colour."""
    host = BRAND_SITE.get(brand_of(colour))
    shade = shade_of(colour)
    if not host:
        return []
    want = re.sub(r"[^a-z0-9]", "", shade.lower())
    for s in slugs(shade):
        url = f"https://{host}/product/{s}.html"
        try:
            page = fetch(url)
        except Exception:
            continue
        # These sites answer 200 for an unknown slug and serve something
        # else, so confirm the page names the colour before trusting it.
        flat = re.sub(r"[^a-z0-9]", "", page.lower())
        if want not in flat:
            continue
        found = re.findall(r'(?:src|data-src)="([^"]+\.(?:jpe?g|png|webp))"',
                           page, re.I)
        # Every colour page ends with a rail of the other colours, each
        # with its own lens.png — the same trap Abib's recommended-items
        # rail set. An image counts only if it sits in *this* colour's
        # directory. The directory uses the run-together spelling even
        # when the page slug is split, so accept either.
        dirs = {f"/{d}/" for d in (s, s.replace("_", ""), want)}
        imgs = []
        for u in dict.fromkeys(found):
            if any(k in u.lower() for k in SKIP):
                continue
            full = urllib.parse.urljoin(url, u)
            low = full.lower()
            # lineup_*.png are the front page's thumbnails, not the product
            if "lineup_" in low:
                continue
            if any(d in low for d in dirs):
                imgs.append(full)
        if imgs:
            # the packshot and the worn-eye shot lead; @2x is print-res
            order = ("package", "lens_on", "product", "sample", "image")
            def rank(u):
                n = u.rsplit("/", 1)[-1].lower()
                for i, k in enumerate(order):
                    if k in n:
                        return (i, 0 if "@2x" in n else 1, n)
                return (len(order), 1, n)
            imgs.sort(key=rank)
            return imgs[:10]
    return []


def from_supplier(colour, locs):
    brand = re.sub(r"[^a-z0-9]", "", brand_of(colour).lower())
    shade = re.sub(r"[^a-z0-9]+", "-", shade_of(colour).lower()).strip("-")
    for l in locs:
        u = l.lower()
        # 1-day and 1-month are different products with the same colour
        # name; taking the wrong one puts a two-lens blister on a
        # ten-lens listing.
        if shade in u and brand in u.replace("-", "") and re.search(r"1-?day", u):
            try:
                page = fetch(l)
            except Exception:
                return []
            cover = re.search(r'<meta property="og:image" content="([^"]*)"', page)
            imgs = [cover.group(1).split("?")[0]] if cover else []
            for x in re.findall(r'https://img\.shoplineapp\.com/media/[^"\'\s\\]+?'
                                r'\.(?:jpe?g|png|webp)', page):
                x = x.split("?")[0]
                if x not in imgs and not any(k in x.lower() for k in SKIP):
                    imgs.append(x)
            return imgs[:10]
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    data = load()
    locs = json.load(open(SUPPLIER_URLS)) if os.path.exists(SUPPLIER_URLS) else []

    def one(colour):
        got = from_supplier(colour, locs)
        where = "供應商"
        if not got:
            got = from_brand(colour)
            where = "品牌官網"
        return colour, got, (where if got else "—")

    out = {}
    with cf.ThreadPoolExecutor(5) as ex:
        for colour, imgs, where in ex.map(one, sorted(data)):
            print(f'{colour:<44}{len(imgs):>3} 張  {where}')
            if imgs:
                out[colour] = imgs

    print(f"\n{len(out)} / {len(data)} 個色有圖")
    if not args.dry_run:
        with open(OUT, "w") as f:
            json.dump(out, f, ensure_ascii=False)
        print(f"→ {OUT}")


if __name__ == "__main__":
    main()
