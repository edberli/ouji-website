#!/usr/bin/env python3
"""
Collect what each product's own maker says about it.

Skincare shipped with copy written from its category: every toner got the
same paragraph about toner. That is fine as a fallback and useless as a
product page — a shopper cannot tell a rice toner from a centella one, and
nothing on the page says what is in it or how to use it.

The source stores do carry that text. This pulls it, unchanged, into
/tmp/skin/copy.json keyed by barcode, ready to be turned into Chinese by
the offload step. Nothing here writes to Shopify and nothing here
paraphrases — inventing a benefit is worse than having none.

    python3 scripts/fetch_source_copy.py            # 全部品牌
    python3 scripts/fetch_source_copy.py Purito
"""
import html
import json
import os
import re
import sys
import urllib.request

STORES = "/tmp/skin/stores.json"
MATCHED = "/tmp/skin/matched.json"
HOSTS = "/tmp/skin/hosts.json"
OUT = "/tmp/skin/copy.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

# Where each brand's imagery came from, and therefore where its words are.
RETAILERS = ["nudieglow", "hikoco", "kbeautyworld", "seoulmills"]


def text_of(body_html):
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", body_html or "", flags=re.S | re.I)
    t = re.sub(r"<br\s*/?>|</p>|</li>|</div>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t.strip()


def shopify_bodies(host):
    """Every product on a brand's own Shopify store, keyed by handle."""
    slug = re.sub(r"\W+", "_", host)
    cache = f"/tmp/skin/body_{slug}.json"
    if os.path.exists(cache):
        with open(cache) as f:
            return json.load(f)
    out, page = {}, 1
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
        for p in got:
            out[p["handle"]] = text_of(p.get("body_html"))
        page += 1
    with open(cache, "w") as f:
        json.dump(out, f, ensure_ascii=False)
    return out


def retailer_bodies():
    """The stockists' listings, keyed by handle. They write the fullest
    English copy of anyone — description, ingredients, how to use."""
    out = {}
    for name in RETAILERS:
        path = f"/tmp/skin/ret_{name}.json"
        if not os.path.exists(path):
            continue
        with open(path) as f:
            for p in json.load(f):
                out.setdefault(p["handle"], text_of(p.get("body_html")))
    return out


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    stores = json.load(open(STORES))
    matched = json.load(open(MATCHED))
    hosts = json.load(open(HOSTS)) if os.path.exists(HOSTS) else {}
    retail = retailer_bodies()

    copy = {}
    if os.path.exists(OUT):
        with open(OUT) as f:
            copy = json.load(f)

    for brand, rows in matched.items():
        if only and brand not in (only, f"{only} RET"):
            continue
        store = stores.get(brand, [])
        # "<Brand> RET" is a stockist list matched purely for its words —
        # the Cafe24 brands tell their whole story in images, so their own
        # pages carry no text at all to translate.
        base = brand[:-4] if brand.endswith(" RET") else brand
        bodies = shopify_bodies(hosts[base]) if base in hosts else {}
        got = 0
        for m in rows:
            if m.get("index") is None:
                continue
            src = store[m["index"]]
            handle = src.get("handle", "")
            body = bodies.get(handle) or retail.get(handle) or ""
            if len(body) < 120:
                continue
            # A brand's own words beat a stockist's, so the RET pass fills
            # gaps rather than overwriting what the maker wrote.
            if brand.endswith(" RET") and m["barcode"] in copy:
                continue
            copy[m["barcode"]] = {"brand": base, "source": src["title"],
                                  "text": body[:4000]}
            got += 1
        print(f"{brand:<20} {got:>3}/{len(rows)} 件搵到原文")

    with open(OUT, "w") as f:
        json.dump(copy, f, ensure_ascii=False)
    print(f"\n合共 {len(copy)} 件有原文 → {OUT}")


if __name__ == "__main__":
    main()
