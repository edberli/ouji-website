#!/usr/bin/env python3
"""
Read a brand's catalogue off ohmyglow.co, for the brands whose own site
we cannot reach.

Why this shop: LINDSAY publishes no sitemap and so'natural's Korean site
does not answer from here at all, so `fetch_cafe24_catalog.py` comes back
empty for both. ohmyglow is a Hong Kong K-beauty retailer on WooCommerce —
it carries the same lines, its product pages hold the brand's own gallery
and the tall Korean strips, and its titles are already Traditional Chinese,
which is the language our sheet is in. That last part matters: matching a
Chinese sheet line against an English store is where the makeup range kept
mis-joining, and it disappears here.

Output goes into /tmp/skin/stores.json under the brand key, same
{title, handle, imgs, detail, url} shape as the Cafe24 fetcher, so
build_match_data / build_skincare / attach_skincare_detail need no special
case for it.

    python3 scripts/fetch_ohmyglow.py LINDSAY lindsay
    python3 scripts/fetch_ohmyglow.py "SO Natural" so-natural

The second argument is the brand's slug in /b/<slug>/.
"""
import argparse
import concurrent.futures as cf
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request

STORES = "/tmp/skin/stores.json"
HOST = "https://www.ohmyglow.co"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/126 Safari/537.36")}

# WooCommerce serves the same upload in a dozen sizes. Only the original
# is wanted — a -300x300 thumbnail on a product page is a downgrade on
# what the brand shipped.
SIZED = re.compile(r"-\d{2,4}x\d{2,4}(?=\.(?:jpg|jpeg|png|webp)$)", re.I)


def fetch(url, limit=4_000_000):
    safe = urllib.parse.quote(url, safe=":/?=&%#")
    with urllib.request.urlopen(urllib.request.Request(safe, headers=UA),
                                timeout=30) as h:
        return h.read(limit).decode("utf8", "ignore")


def brand_products(slug):
    """Every product URL on /b/<slug>/, following its pagination."""
    seen, out, page = set(), [], 1
    while page <= 25:
        url = f"{HOST}/b/{slug}/" if page == 1 else f"{HOST}/b/{slug}/page/{page}/"
        try:
            body = fetch(url)
        except Exception:
            break
        found = re.findall(r'href="(https://www\.ohmyglow\.co/product/[^"#?]+/)"', body)
        fresh = [u for u in found if u not in seen]
        if not fresh:
            break
        for u in fresh:
            seen.add(u)
            out.append(u)
        page += 1
    return out


def full_size(u):
    return SIZED.sub("", u)


def read_product(url):
    try:
        body = fetch(url)
    except Exception:
        return None

    t = re.search(r'<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>(.*?)</h1>', body, re.S)
    if not t:
        t = re.search(r"<title>(.*?)</title>", body, re.S)
    title = html.unescape(re.sub(r"<[^>]+>", "", t.group(1))).strip() if t else ""
    title = re.split(r"\s*[–—|]\s*ohmyglow", title, 1)[0].strip()
    if not title:
        return None

    # The gallery sits in .woocommerce-product-gallery; everything below is
    # the description, which is where the tall Korean strips live. Keeping
    # the two apart is the whole point — mixing strips into the gallery is
    # what gave the makeup range its swatch-chart covers.
    # Flatsome names it `product-gallery col large-6`, not WooCommerce's
    # own `woocommerce-product-gallery`. Cut from there to the info column.
    gal = re.search(r'class="[^"]*product-gallery[^"]*".*?(?=class="[^"]*product-info)',
                    body, re.S)
    desc = re.search(r'class="[^"]*woocommerce-Tabs-panel--description.*?</div>\s*</div>',
                     body, re.S) or re.search(r'id="tab-description".*?</div>\s*</div>', body, re.S)

    def imgs_in(seg):
        if not seg:
            return []
        raw = re.findall(r'(?:data-large_image|data-src|src)="'
                         r'(https://www\.ohmyglow\.co/wp-content/uploads/[^"]+?'
                         r'\.(?:jpg|jpeg|png|webp))"', seg)
        out, seen = [], set()
        for u in raw:
            u = full_size(u)
            if u not in seen:
                seen.add(u)
                out.append(u)
        return out

    return {
        "title": title,
        "handle": url.rstrip("/").rsplit("/", 1)[-1],
        "imgs": imgs_in(gal.group(0) if gal else ""),
        "detail": imgs_in(desc.group(0) if desc else ""),
        "url": url,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("slug")
    ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()

    urls = brand_products(a.slug)
    print(f"{a.brand}: /b/{a.slug}/ 有 {len(urls)} 個產品頁")
    if not urls:
        print("攞唔到，睇下個 slug 啱唔啱（/b/<slug>/）")
        return 1

    got = []
    with cf.ThreadPoolExecutor(max_workers=a.workers) as pool:
        for r in pool.map(read_product, urls):
            if r and (r["imgs"] or r["detail"]):
                got.append(r)

    store = {}
    if os.path.exists(STORES):
        store = json.load(open(STORES))
    store[a.brand] = got
    os.makedirs(os.path.dirname(STORES), exist_ok=True)
    json.dump(store, open(STORES, "w"), ensure_ascii=False)
    g = sum(len(x["imgs"]) for x in got)
    d = sum(len(x["detail"]) for x in got)
    print(f"{a.brand}: 讀到 {len(got)} 件，{g} 張產品相、{d} 張長圖")
    return 0


if __name__ == "__main__":
    sys.exit(main())
