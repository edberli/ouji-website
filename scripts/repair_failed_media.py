#!/usr/bin/env python3
"""
Re-upload the product photos Shopify could not fetch.

Shopify pulls product media by URL, and 56 live products came out with
every image marked FAILED — a blank card on the shop, with nothing in the
publish log to say so, because productSet accepted the URL and only the
asynchronous fetch failed. StyleKorean's CloudFront and some Cafe24 hosts
refuse Shopify's fetcher.

The fix is to stop asking Shopify to fetch: download the bytes here, put
them through a staged upload the way the detail strips already go, and
attach those. Same picture, no third party in the middle.

    python3 scripts/repair_failed_media.py --dry-run
    python3 scripts/repair_failed_media.py
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402
from upload_files import upload  # noqa: E402

WORK = "/Volumes/core/ouji-media-repair"
STORES = "/tmp/skin/stores.json"
MATCHED = "/tmp/skin/matched.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

BROKEN = """
query($after: String) {
  products(first: 100, after: $after, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    edges { node { id handle title vendor
      variants(first: 1) { edges { node { barcode } } }
      media(first: 20) { edges { node { status ... on MediaImage { id } } } } } }
  }
}
"""

DELETE = """
mutation($pid: ID!, $ids: [ID!]!) {
  productDeleteMedia(productId: $pid, mediaIds: $ids) {
    deletedMediaIds userErrors { field message }
  }
}
"""

CREATE = """
mutation($pid: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $pid, media: $media) {
    media { status } mediaUserErrors { field message }
  }
}
"""


def broken_products():
    out, after = [], None
    while True:
        page = gql(BROKEN, {"after": after})["products"]
        for e in page["edges"]:
            n = e["node"]
            edges = n["media"]["edges"]
            if edges and all(m["node"]["status"] == "FAILED" for m in edges):
                out.append(n)
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]
    return out


def source_urls(barcode, matched, stores):
    """Wherever this product's imagery was matched from — a barcode can be
    matched under several keys (own store, stockist, exporter), so take
    the first list that actually has pictures."""
    for key, rows in matched.items():
        for r in rows:
            if r["barcode"] != barcode or r.get("index") is None:
                continue
            items = stores.get(key) or []
            if r["index"] < len(items):
                imgs = items[r["index"]].get("imgs") or []
                if imgs:
                    return imgs[:12]
    return []


def grab(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return path
    try:
        req = urllib.request.Request(urllib.parse.quote(url, safe=":/?=&%"),
                                     headers=UA)
        with urllib.request.urlopen(req, timeout=60) as h:
            blob = h.read()
    except Exception as e:
        print(f"      攞唔到: {e}")
        return None
    if len(blob) < 2000:
        return None
    with open(path, "wb") as f:
        f.write(blob)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.isdir("/Volumes/core"):
        raise SystemExit("/Volumes/core 未掛載")
    os.makedirs(WORK, exist_ok=True)

    matched = json.load(open(MATCHED))
    stores = json.load(open(STORES))
    todo = broken_products()
    print(f"{len(todo)} 件上架產品張相係壞嘅\n")

    fixed = stuck = 0
    for p in todo:
        barcode = (p["variants"]["edges"][0]["node"]["barcode"] or "").strip()
        urls = source_urls(barcode, matched, stores)
        if not urls:
            print(f'  ✗ {p["vendor"]:<14}{p["title"][:40]}  搵唔返來源')
            stuck += 1
            continue
        print(f'  {p["vendor"]:<14}{p["title"][:40]}  {len(urls)} 張')
        if args.dry_run:
            fixed += 1
            continue

        paths = []
        for i, u in enumerate(urls, 1):
            ext = os.path.splitext(u.split("?")[0])[1][:5] or ".jpg"
            got = grab(u, os.path.join(WORK, f'{p["handle"]}-{i:02d}{ext}'))
            if got:
                paths.append(got)
        if not paths:
            stuck += 1
            continue

        staged = [upload(x) for x in paths]
        staged = [s for s in staged if s]
        if not staged:
            stuck += 1
            continue
        old = [m["node"]["id"] for m in p["media"]["edges"] if m["node"].get("id")]
        if old:
            user_errors(gql(DELETE, {"pid": p["id"], "ids": old}),
                        "productDeleteMedia")
        out = gql(CREATE, {"pid": p["id"], "media": [
            {"originalSource": s, "mediaContentType": "IMAGE",
             "alt": p["title"]} for s in staged]})
        errs = out.get("productCreateMedia", {}).get("mediaUserErrors") or []
        if errs:
            print(f"      {json.dumps(errs, ensure_ascii=False)[:120]}")
            stuck += 1
            continue
        fixed += 1

    print(f"\n修好 {fixed} 件、{stuck} 件仲有問題"
          + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
