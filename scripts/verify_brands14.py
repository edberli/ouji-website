#!/usr/bin/env python3
"""
Read a published brand back the way a shopper's browser sees it.

The Admin API will happily tell you a product looks fine when the
storefront cannot see it at all — wrong channel, no image, price on a
variant the customer never gets offered. So the check is done through the
**Storefront** token that shop.oujikbeauty.com itself uses.

It also does the one check that matters most on this range: that the
buying price we paid is nowhere a customer can read it. Every storefront
field that carries text is searched for the cost from the sheet.

    python3 scripts/verify_brands14.py SOLEP
    python3 scripts/verify_brands14.py --all
"""
import argparse
import json
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brands14_data import by_vendor, load  # noqa: E402

DOMAIN = "5rerjn-mt.myshopify.com"
TOKEN = "795e2f7cb13da1d3776449eba5802377"     # public storefront token
API = f"https://{DOMAIN}/api/2024-01/graphql.json"

QUERY = """
query($q: String!) {
  products(first: 60, query: $q) {
    edges { node {
      handle title vendor productType tags description descriptionHtml
      availableForSale
      images(first: 10) { edges { node { url } } }
      variants(first: 10) { edges { node {
        barcode sku quantityAvailable availableForSale
        price { amount }
      } } }
    } }
  }
}
"""


def storefront(query, variables):
    req = urllib.request.Request(
        API, data=json.dumps({"query": query, "variables": variables}).encode(),
        headers={"Content-Type": "application/json",
                 "X-Shopify-Storefront-Access-Token": TOKEN})
    out = json.load(urllib.request.urlopen(req, timeout=60))
    if out.get("errors"):
        raise RuntimeError(json.dumps(out["errors"], ensure_ascii=False))
    return out["data"]


def check(brand, rows):
    got = storefront(QUERY, {"q": f'vendor:"{brand}"'})["products"]["edges"]
    live = {}
    for e in got:
        for v in e["node"]["variants"]["edges"]:
            bar = (v["node"]["barcode"] or "").strip()
            if bar:
                live[bar] = (e["node"], v["node"])

    bad = 0
    for r in sorted(rows, key=lambda x: x["title"]):
        pair = live.get(r["barcode"])
        if not pair:
            print(f'  ✗ 前台睇唔到：{r["barcode"]}  {r["title"][:44]}')
            bad += 1
            continue
        p, v = pair
        errs = []
        if p["title"] != r["title"]:
            errs.append(f'標題 {p["title"]!r} ≠ {r["title"]!r}')
        if abs(float(v["price"]["amount"]) - r["price"]) > 0.005:
            errs.append(f'價錢 {v["price"]["amount"]} ≠ {r["price"]}')
        if v["quantityAvailable"] != r["qty"]:
            errs.append(f'庫存 {v["quantityAvailable"]} ≠ {r["qty"]}')
        if p["vendor"] != brand:
            errs.append(f'品牌 {p["vendor"]}')
        if not p["description"].strip():
            errs.append("冇描述")
        # the whole point: cost must not be readable anywhere out front
        blob = " ".join([p["title"], p["descriptionHtml"], p["handle"],
                         p["productType"], " ".join(p["tags"]),
                         v["sku"] or "", str(v["price"]["amount"])])
        if r["cost"] is not None:
            for form in {f'{r["cost"]:.2f}', f'{r["cost"]:g}',
                         str(int(r["cost"])) if r["cost"] == int(r["cost"]) else None}:
                if form and re.search(rf'(?<!\d){re.escape(form)}(?!\d)', blob):
                    errs.append(f"⚠️ 成本價 {form} 出現喺前台！")
        nimg = len(p["images"]["edges"])
        flag = "" if nimg else "  ← 冇圖"
        if errs:
            bad += 1
            print(f'  ✗ {r["barcode"]}  {r["title"][:40]}')
            for e2 in errs:
                print(f'       {e2}')
        else:
            print(f'  ✓ {nimg} 圖  ${v["price"]["amount"]:>7}  '
                  f'庫{v["quantityAvailable"]:>3}  {p["productType"]:<5}'
                  f'{r["title"][:40]}{flag}')
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand", nargs="?")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    groups = by_vendor(load())
    wanted = sorted(groups, key=lambda b: len(groups[b])) if args.all \
        else [args.brand]
    total = 0
    for b in wanted:
        print(f"\n=== {b} ===")
        total += check(b, groups[b])
    print(f'\n{"全部啱" if not total else f"{total} 件有問題"}')
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
