#!/usr/bin/env python3
"""
Append a brand's mirrored detail strips to its Shopify descriptions.

The strips live in brands/<brand>/detail/<handle>-NN.jpg and are served
from oujikbeauty.com, so the description just hotlinks them inside a
.product-detail-images block, which product.html renders full-width
under the product info.

    python3 scripts/attach_detail_strips.py heartpercent

Re-running is safe: an existing block is replaced, not duplicated.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import ROOT, all_products, update_product  # noqa: E402

BASE = "https://oujikbeauty.com/brands"
BLOCK = re.compile(r'<div class="product-detail-images">.*?</div>', re.S)


def strips(brand, handle):
    d = os.path.join(ROOT, "brands", brand, "detail")
    if not os.path.isdir(d):
        return []
    names = sorted(n for n in os.listdir(d)
                   if re.fullmatch(re.escape(handle) + r"-\d+\.jpg", n))
    return [f"{BASE}/{brand}/detail/{n}" for n in names]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    products = {p["handle"]: p for p in all_products()}
    touched = 0
    for handle, p in sorted(products.items()):
        urls = strips(args.brand, handle)
        if not urls:
            continue
        block = ('<div class="product-detail-images">'
                 + "".join(f'<img src="{u}" alt="{p["title"]} 產品介紹" loading="lazy">'
                           for u in urls)
                 + "</div>")
        body = BLOCK.sub("", p["descriptionHtml"] or "").rstrip() + block
        if body == (p["descriptionHtml"] or ""):
            print(f"  unchanged  {handle}")
            continue
        print(f"  {len(urls):3d} strips  {handle}")
        if not args.dry_run:
            update_product(p["id"], descriptionHtml=body)
        touched += 1
    print(f"\n{touched} 個產品更新咗" + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
