#!/usr/bin/env python3
"""
Read a brand's catalogue from StyleKorean.

The stockists that publish an open Shopify catalogue carry only what sells
in their own market, so 146 products were left as drafts with no photo:
36 Skinfood, 16 Round Lab, 15 Some By Mi, and so on down. StyleKorean is a
Korean exporter rather than a local boutique — it lists 11,863 products,
including the sizes and variants the western stockists skip.

It is not Shopify, but it publishes a product sitemap and schema.org
Product JSON-LD on every page, which is the same shape the Cafe24 fetcher
already reads. Brand comes from the URL slug, so only that brand's pages
are fetched rather than the whole catalogue.

    python3 scripts/fetch_stylekorean.py Skinfood --slug skinfood
    python3 scripts/fetch_stylekorean.py "Round Lab" --slug round-lab --key "Round Lab SK"

Output lands in /tmp/skin/stores.json in the usual {title, handle, imgs}
shape.
"""
import argparse
import concurrent.futures as cf
import gzip
import html
import json
import os
import re
import urllib.parse
import urllib.request

STORES = "/tmp/skin/stores.json"
URLS = "/tmp/skin/sk_urls.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}


def fetch(url, limit=900_000):
    req = urllib.request.Request(urllib.parse.quote(url, safe=":/?=&%"), headers=UA)
    with urllib.request.urlopen(req, timeout=40) as h:
        blob = h.read(limit)
    if blob[:2] == b"\x1f\x8b":
        blob = gzip.decompress(blob)
    return blob.decode("utf8", "ignore")


def all_urls():
    """The product sitemap, cached — it is 12k URLs and does not move."""
    if os.path.exists(URLS):
        with open(URLS) as f:
            return json.load(f)
    out = []
    for i in (1, 2):
        page = fetch(f"https://www.stylekorean.com/sitemap-products-{i}.xml",
                     4_000_000)
        out += re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", page)
    with open(URLS, "w") as f:
        json.dump(out, f)
    return out


def read_product(url):
    try:
        page = fetch(url)
    except Exception:
        return None
    block = re.search(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',
                      page, re.S)
    if not block:
        return None
    try:
        d = json.loads(block.group(1).strip())
    except ValueError:
        return None
    if isinstance(d, list):
        d = next((x for x in d if x.get("@type") == "Product"), {})
    name = html.unescape((d.get("name") or "").strip())
    raw = d.get("image") or []
    imgs = [raw] if isinstance(raw, str) else list(raw)
    imgs = [u for u in dict.fromkeys(imgs) if str(u).startswith("http")]
    if not name or not imgs:
        return None
    return {"title": name, "handle": url.rstrip("/").rsplit("/", 1)[-1],
            "imgs": imgs, "url": url}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("--slug", required=True, help="URL slug, e.g. round-lab")
    ap.add_argument("--key", help="stores.json key, if not the brand name")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    slug = args.slug.lower()
    mine = [u for u in all_urls()
            if f"/product/{slug}" in u.lower() or f"-{slug}-" in u.lower()]
    print(f"{args.brand}: sitemap 有 {len(mine)} 個產品頁")
    if not mine:
        raise SystemExit("StyleKorean 冇呢個牌")
    if args.dry_run:
        for u in mine[:10]:
            print("   ", u)
        return

    items = []
    with cf.ThreadPoolExecutor(args.workers) as ex:
        for got in ex.map(read_product, mine):
            if got:
                items.append(got)
    items.sort(key=lambda x: x["title"])
    print(f'{args.brand}: 讀到 {len(items)} 件，'
          f'{sum(len(i["imgs"]) for i in items)} 張圖')

    store = {}
    if os.path.exists(STORES):
        with open(STORES) as f:
            store = json.load(f)
    store[args.key or args.brand] = items
    with open(STORES, "w") as f:
        json.dump(store, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
