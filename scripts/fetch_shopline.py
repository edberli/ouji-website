#!/usr/bin/env python3
"""
Read a brand's Hong Kong SHOPLINE store.

Bring Green was the one brand nothing could supply: its Korean site is
gone, no stockist with an open catalogue carries it, StyleKorean does not
list it, and Olive Young — the only other place — has blocked this
address. Eighteen products sat as drafts because of it.

It turns out the brand runs its own Hong Kong store on SHOPLINE, which is
better than any of the sources above: the names are already in Chinese
and the pictures are the ones Hong Kong customers have seen.

    python3 scripts/fetch_shopline.py "Bring Green" www.bringgreen.hk

SHOPLINE publishes a per-locale sitemap and puts the gallery in the page
as img.shoplineapp.com URLs. Output lands in /tmp/skin/stores.json in the
usual {title, handle, imgs} shape.
"""
import argparse
import concurrent.futures as cf
import html
import json
import os
import re
import urllib.parse
import urllib.request

STORES = "/tmp/skin/stores.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

# Storefront furniture served from the same CDN: the logo, payment icons,
# the banner carousel. None of it belongs in a product gallery.
SKIP = ("logo", "icon", "banner", "payment", "favicon", "placeholder")


def fetch(url, limit=2_000_000):
    req = urllib.request.Request(urllib.parse.quote(url, safe=":/?=&%"), headers=UA)
    with urllib.request.urlopen(req, timeout=40) as h:
        return h.read(limit).decode("utf8", "ignore")


def product_urls(host, locale="zh-hant"):
    try:
        page = fetch(f"https://{host}/sitemap.xml?locale={locale}", 4_000_000)
    except Exception:
        return []
    return [l for l in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", page)
            if "/products/" in l]


def read_product(url):
    try:
        page = fetch(url)
    except Exception:
        return None
    title = re.search(r'<meta property="og:title" content="([^"]*)"', page)
    cover = re.search(r'<meta property="og:image" content="([^"]*)"', page)
    if not title:
        return None
    name = html.unescape(title.group(1)).strip()

    # The cover is named in og:image; the rest of the gallery is whatever
    # else the page loads from the media CDN, in document order.
    imgs = []
    if cover:
        imgs.append(cover.group(1).split("?")[0])
    for u in re.findall(r'https://img\.shoplineapp\.com/media/[^"\'\s\\]+?'
                        r'\.(?:jpe?g|png|webp)', page):
        u = u.split("?")[0]
        if any(s in u.lower() for s in SKIP) or u in imgs:
            continue
        imgs.append(u)
    if not name or not imgs:
        return None
    return {"title": name, "handle": url.rstrip("/").rsplit("/", 1)[-1],
            "imgs": imgs[:12], "url": url}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("host")
    ap.add_argument("--key", help="stores.json key, if not the brand name")
    ap.add_argument("--locale", default="zh-hant")
    ap.add_argument("--workers", type=int, default=5)
    args = ap.parse_args()

    urls = product_urls(args.host, args.locale)
    print(f"{args.brand}: sitemap 有 {len(urls)} 個產品頁")
    if not urls:
        raise SystemExit("攞唔到產品清單")

    items = []
    with cf.ThreadPoolExecutor(args.workers) as ex:
        for got in ex.map(read_product, urls):
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
