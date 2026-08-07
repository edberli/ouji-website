#!/usr/bin/env python3
"""
Give the skincare range its 長圖 — the tall Korean product story.

The makeup brands each got their detail strips mirrored and hotlinked
under the product info. Skincare went up without them: 396 of 403 live
products had nothing below the description but a spec list. On a Korean
product page that strip *is* the copy — ingredients, before/after, how to
use, clinical numbers — so a page without it reads like a stub.

    python3 scripts/attach_skincare_detail.py "Some By Mi" --dry-run
    python3 scripts/attach_skincare_detail.py "Some By Mi"

Sources are whatever fetch_cafe24_catalog.py recorded under "detail" for
the brand. Strips are downloaded to the external disk (a brand's worth
runs to hundreds of MB), resized to a sane width, uploaded to Shopify's
Files library, and hotlinked from the description.

Re-running is safe: an existing block is replaced, not appended to.
"""
import argparse
import json
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, update_product  # noqa: E402
from upload_files import host as cdn_host  # noqa: E402

WORK = "/Volumes/core/ouji-skincare-strips"
STORES = "/tmp/skin/stores.json"
MATCHED = "/tmp/skin/matched.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

BLOCK = re.compile(r'<div class="product-detail-images">.*?</div>', re.S)

# Cafe24 strips arrive at whatever width the brand exported. 900px is wider
# than the column the site renders them in, and keeps a 10,000px-tall strip
# under a couple of MB.
MAX_W = 900

PRODUCTS = """
query($after: String, $q: String!) {
  products(first: 100, after: $after, query: $q) {
    pageInfo { hasNextPage endCursor }
    edges { node { id handle title vendor descriptionHtml
      variants(first: 1) { edges { node { barcode } } } } }
  }
}
"""


def live_products(vendor):
    out, after = [], None
    while True:
        page = gql(PRODUCTS, {"after": after,
                              "q": f'vendor:"{vendor}" status:active'})["products"]
        out += [e["node"] for e in page["edges"]]
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]
    return out


def download(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                    timeout=90) as h:
            blob = h.read()
    except Exception as e:
        print(f"      攞唔到 {url[-40:]}: {e}")
        return None
    if len(blob) < 2000:                      # a spacer gif, not a strip
        return None
    with open(path, "wb") as f:
        f.write(blob)
    return path


def shrink(path):
    """Down to MAX_W, and stripped of its alpha so a PNG with transparency
    does not land on the page as a black rectangle."""
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    try:
        im = Image.open(path)
    except Exception:
        return None
    # A strip is tall. Anything close to square is a badge or an icon that
    # slipped past the container filter, not part of the story.
    if im.height < im.width * 1.2:
        return None
    if im.mode in ("RGBA", "LA", "P"):
        flat = Image.new("RGB", im.size, "white")
        im = im.convert("RGBA")
        flat.paste(im, mask=im.split()[-1])
        im = flat
    else:
        im = im.convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    out = os.path.splitext(path)[0] + ".jpg"
    im.save(out, "JPEG", quality=82, optimize=True)
    if out != path:
        os.remove(path)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    # Several brands sell abroad on Shopify and at home on Cafe24. The
    # Shopify store gave us the gallery and the English names we matched
    # against; only the Korean store carries the long strip. So the source
    # of the strips can be a different catalogue from the vendor name.
    ap.add_argument("--source", help="stores.json key, if not the vendor")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    source = args.source or args.brand

    if not os.path.isdir("/Volumes/core"):
        raise SystemExit("/Volumes/core 未掛載 —— 長圖唔可以寫落內置 SSD")

    store = json.load(open(STORES)).get(source, [])
    matched = {m["barcode"]: m for m in json.load(open(MATCHED)).get(source, [])}
    if not store:
        raise SystemExit(f"{source}: /tmp/skin/stores.json 冇呢個品牌")

    work = os.path.join(WORK, re.sub(r"\W+", "-", source.lower()))
    os.makedirs(work, exist_ok=True)

    done = skipped = 0
    for p in sorted(live_products(args.brand), key=lambda x: x["handle"]):
        barcode = (p["variants"]["edges"][0]["node"]["barcode"] or "").strip()
        m = matched.get(barcode) or {}
        src = store[m["index"]] if m.get("index") is not None else None
        urls = (src or {}).get("detail") or []
        if not urls:
            skipped += 1
            continue

        print(f'{p["handle"][:48]:<50} {len(urls)} 張')
        if args.dry_run:
            done += 1
            continue

        paths = []
        for i, u in enumerate(urls, 1):
            ext = os.path.splitext(u.split("?")[0])[1] or ".jpg"
            raw = os.path.join(work, f'{p["handle"]}-{i:02d}{ext}')
            got = download(u, raw)
            if got:
                small = shrink(got)
                if small:
                    paths.append(small)
        if not paths:
            skipped += 1
            continue

        urls_cdn = [u for u in cdn_host(paths, alt=f'{p["title"]} 產品介紹') if u]
        if not urls_cdn:
            skipped += 1
            continue
        imgs = "".join(f'<img src="{u}" alt="{p["title"]} 產品介紹" loading="lazy">'
                       for u in urls_cdn)
        block = f'<div class="product-detail-images">\n{imgs}\n</div>'
        body = BLOCK.sub("", p["descriptionHtml"] or "") + block
        update_product(p["id"], descriptionHtml=body)
        done += 1

    print(f'\n{args.brand}：{done} 件加咗長圖、{skipped} 件冇來源'
          + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
