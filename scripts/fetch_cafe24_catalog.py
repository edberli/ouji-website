#!/usr/bin/env python3
"""
Read a Cafe24 brand's whole catalogue, without a hand-written product map.

fetch_cafe24.py needs a {slug: product_no} table typed out per brand, which
is fine for a four-product lipstick line and unusable for a skincare house
with sixty SKUs. Cafe24 publishes a sitemap and puts schema.org Product
JSON-LD on every product page, so the catalogue can be read the way the
brand itself describes it: the official name, and the gallery images in the
order the brand chose.

    python3 scripts/fetch_cafe24_catalog.py "Some By Mi" somebymi.com

Output goes into /tmp/skin/stores.json under the brand key, in the same
{title, handle, imgs} shape the Shopify-sourced brands use, so
build_match_data / build_skincare need no special case for it.

Only the product gallery is taken (/web/product/big and extra/big). The
tall marketing strips inside #prdDetail are a different job — see
fetch_cafe24.py — and mixing them into the gallery is what produced the
swatch-chart covers the makeup range had to be cleaned of.
"""
import argparse
import concurrent.futures as cf
import json
import os
import re
import sys
import urllib.parse
import urllib.request

STORES = "/tmp/skin/stores.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 "
                     "Safari/537.36")}

# Cafe24 stores keep non-products in /product/ too: payment landing pages,
# shipping-fee line items, gift wrapping. They have no gallery, so they fall
# out on their own, but naming them keeps the fetch count honest.
NOT_A_PRODUCT = re.compile(r"payment-page|배송비|추가금|적립금", re.I)


def fetch(url, limit=900_000):
    safe = urllib.parse.quote(url, safe=":/?=&%")
    req = urllib.request.Request(safe, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as h:
        return h.read(limit).decode("utf8", "ignore")


def product_urls(host):
    """Every /product/ URL the store lists in its own sitemap."""
    seen, out = set(), []
    todo = [f"https://{host}/sitemap.xml"]
    while todo:
        try:
            body = fetch(todo.pop(0), 4_000_000)
        except Exception:
            continue
        for loc in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", body):
            if loc.endswith(".xml") and loc not in seen:
                seen.add(loc)
                todo.append(loc)
            elif "/product/" in loc and loc not in seen:
                seen.add(loc)
                if not NOT_A_PRODUCT.search(loc):
                    out.append(loc)
    return out


def read_product(url):
    """Name and gallery from the page's own schema.org block."""
    try:
        page = fetch(url)
    except Exception:
        return None
    blocks = re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',
                        page, re.S)
    name, imgs = None, []
    for b in blocks:
        try:
            d = json.loads(b.strip())
        except ValueError:
            continue
        if isinstance(d, list):
            d = next((x for x in d if x.get("@type") == "Product"), {})
        if d.get("@type") != "Product":
            continue
        name = (d.get("name") or "").strip()
        raw = d.get("image") or []
        imgs = [raw] if isinstance(raw, str) else list(raw)
        break

    # Some pages carry no JSON-LD; fall back to the markup, which uses the
    # same /web/product/ paths.
    if not imgs:
        imgs = re.findall(r'(?:src|data-src)="([^"]+/web/product/'
                          r'(?:big|extra/big)/[^"]+)"', page)
    if not name:
        m = re.search(r"<title>(.*?)</title>", page, re.S)
        name = m.group(1).strip() if m else ""

    # /web/product/big is the gallery; medium and small are the same photos
    # downscaled, and shipping them would put a 200px cover on the card.
    # Cafe24 serves these three ways: absolute, protocol-relative, and
    # root-relative. Shopify fetches media by URL and rejects anything it
    # cannot resolve, so normalise here rather than at publish time.
    # Needly's own JSON-LD emits "https:https://cafe24img.poxo.com/…" — the
    # store built the URL by prefixing a scheme onto one that already had
    # one. Shopify rejects it as invalid, so repair it here.
    def absolute(u):
        u = re.sub(r"^https?:(?=https?://)", "", u.strip())
        if u.startswith("//"):
            return "https:" + u
        if u.startswith("/"):
            return f"https://{host}{u}"
        return u

    host = urllib.parse.urlparse(url).netloc
    imgs = [absolute(u) for u in imgs]
    imgs = [u for u in dict.fromkeys(imgs) if "/web/product/" in u
            and u.startswith("https://") and u.count("https://") == 1
            and "/medium/" not in u and "/small/" not in u and "/tiny/" not in u]
    if not name or not imgs:
        return None
    no = re.search(r"/(\d+)/?$", url)
    return {"title": name, "handle": no.group(1) if no else url, "imgs": imgs}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("host")
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()

    urls = product_urls(args.host)
    print(f"{args.brand}: sitemap 有 {len(urls)} 個產品頁")
    if not urls:
        raise SystemExit("sitemap 攞唔到嘢，要改用 /product/list.html 爬")

    items = []
    with cf.ThreadPoolExecutor(args.workers) as ex:
        for got in ex.map(read_product, urls):
            if got:
                items.append(got)
    items.sort(key=lambda x: x["title"])
    print(f"{args.brand}: 讀到 {len(items)} 件，"
          f"合共 {sum(len(i['imgs']) for i in items)} 張圖")

    os.makedirs(os.path.dirname(STORES), exist_ok=True)
    store = {}
    if os.path.exists(STORES):
        with open(STORES) as f:
            store = json.load(f)
    store[args.brand] = items
    with open(STORES, "w") as f:
        json.dump(store, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
