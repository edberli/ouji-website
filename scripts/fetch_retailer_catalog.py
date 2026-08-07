#!/usr/bin/env python3
"""
Fall back to a stockist's catalogue when a brand has no reachable store.

Six of the skincare brands cannot be read from their own sites: Skinfood,
Goodal, Bring Green, Purito, Dr. Melaxin and OOTD are either offline,
Korea-only, or serving a challenge page to anything that is not a browser.
Their products still have to go up with a photo of the product on them.

Shopify storefronts publish /products.json to anyone, so a stockist that
carries the brand can supply the packshots. Second best, and it is worth
saying why: these are the retailer's listing photos, usually the brand's
own asset re-hosted, occasionally re-shot. Look at what comes back before
publishing it — a retailer's badge burned into the corner of an image is
exactly the kind of cover this shop has already had to be cleaned of.

    python3 scripts/fetch_retailer_catalog.py Purito --dry-run
    python3 scripts/fetch_retailer_catalog.py Purito

Output goes into /tmp/skin/stores.json in the usual {title, handle, imgs}
shape, so matching and publishing are unchanged from here on.
"""
import argparse
import json
import os
import re
import urllib.request

STORES = "/tmp/skin/stores.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

# Ordered by how well each one photographs the product on white. The first
# stockist that carries a product wins; the rest fill the gaps.
STOCKISTS = ["nudieglow.com", "hikoco.co.nz", "kbeautyworld.com",
             "seoulmills.com"]

CACHE = "/tmp/skin/ret_{}.json"


def catalogue(host):
    path = CACHE.format(host.split(".")[0])
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    out, page = [], 1
    while page <= 20:
        url = f"https://{host}/products.json?limit=250&page={page}"
        try:
            data = json.load(urllib.request.urlopen(
                urllib.request.Request(url, headers=UA), timeout=30))
        except Exception:
            break
        got = data.get("products", [])
        if not got:
            break
        out += got
        page += 1
    with open(path, "w") as f:
        json.dump(out, f)
    return out


def clean(title):
    """Stockists prefix and suffix their listings: "SKINFOOD Rice Mask
    Wash Off 100g | Nudie Glow". Strip the furniture so the matcher sees
    the product name."""
    title = re.split(r"\s*[|｜]\s*", title)[0]
    return re.sub(r"\s+", " ", title).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("--match", help="vendor substring, if it differs from brand")
    # A brand can appear twice in stores.json: once for the imagery it was
    # published with, once for a stockist list used only to borrow the
    # words. --key keeps the two from overwriting each other.
    ap.add_argument("--key", help="stores.json key, if not the brand name")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    needle = (args.match or args.brand).lower()
    items, seen = [], set()
    for host in STOCKISTS:
        for p in catalogue(host):
            hay = f'{p.get("vendor", "")} {p.get("title", "")}'.lower()
            if needle not in hay:
                continue
            title = clean(p.get("title", ""))
            key = re.sub(r"[^a-z0-9]", "", title.lower())
            if not title or key in seen:
                continue
            imgs = [i["src"] for i in p.get("images", []) if i.get("src")]
            if not imgs:
                continue
            seen.add(key)
            items.append({"title": title, "handle": p.get("handle", ""),
                          "imgs": imgs, "source": host})

    items.sort(key=lambda x: x["title"])
    by_host = {}
    for i in items:
        by_host[i["source"]] = by_host.get(i["source"], 0) + 1
    print(f'{args.brand}：{len(items)} 件、'
          f'{sum(len(i["imgs"]) for i in items)} 張圖  {by_host}')
    for i in items[:8]:
        print(f'   {len(i["imgs"]):>2} 圖  {i["title"][:56]}')
    if args.dry_run:
        return

    store = {}
    if os.path.exists(STORES):
        with open(STORES) as f:
            store = json.load(f)
    store[args.key or args.brand] = items
    with open(STORES, "w") as f:
        json.dump(store, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
