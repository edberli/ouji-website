#!/usr/bin/env python3
"""
Build the matcher's data file, and mirror it into Shopify metafields.

The site reads a static JSON rather than querying metafields at runtime:
208 products is a 60KB file, it loads in one request with no API round
trip, and the quiz keeps working if Shopify is slow. The metafields exist
so the attributes are editable in the Shopify admin — edit there, re-run
this, and the edit wins over the derived value.

    python3 scripts/build_match_data.py --dry-run
    python3 scripts/build_match_data.py            # writes match-data.json
    python3 scripts/build_match_data.py --push     # ...and the metafields
"""
import argparse
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from match_attrs import LOOKS, derive  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "match-data.json")
NS = "ouji_match"

PRODUCTS = """
query($cursor: String) {
  products(first: 60, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id handle title vendor productType tags status descriptionHtml
      priceRangeV2 { minVariantPrice { amount } }
      featuredImage { url }
      variants(first: 60) { edges { node { title availableForSale } } }
      metafields(first: 20, namespace: "ouji_match") { edges { node { key value } } }
    } }
  }
}
"""

SET = """
mutation($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { key }
    userErrors { field message }
  }
}
"""


def products():
    cursor, out = None, []
    while True:
        d = gql(PRODUCTS, {"cursor": cursor})["products"]
        out += [e["node"] for e in d["edges"]]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cursor = d["pageInfo"]["endCursor"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--push", action="store_true",
                    help="also write the derived values back as metafields")
    args = ap.parse_args()

    rows, pushes = [], []
    spread = Counter()
    for p in products():
        if p["status"] != "ACTIVE":
            continue
        shades = [e["node"]["title"] for e in p["variants"]["edges"]]
        attrs = derive({**p, "shades": shades})

        # An edit made in the Shopify admin beats the derived value.
        manual = {e["node"]["key"]: e["node"]["value"]
                  for e in p["metafields"]["edges"]}
        for key, raw in manual.items():
            if key in attrs and raw not in ("", None):
                try:
                    attrs[key] = json.loads(raw)
                except ValueError:
                    attrs[key] = raw

        in_stock = any(e["node"]["availableForSale"] for e in p["variants"]["edges"])
        rows.append({
            "handle": p["handle"], "title": p["title"], "vendor": p["vendor"],
            "type": p["productType"],
            "price": float(p["priceRangeV2"]["minVariantPrice"]["amount"]),
            "image": (p.get("featuredImage") or {}).get("url"),
            "shades": shades[:40], "inStock": in_stock,
            **attrs,
        })
        spread[attrs["finish"]] += 1
        for k in attrs["looks"]:
            spread[f"look:{k}"] += 1
        if attrs["gentle"]:
            spread["gentle"] += 1

        if args.push:
            pushes.append({"ownerId": p["id"], "namespace": NS, "key": "derived",
                           "type": "json", "value": json.dumps(attrs, ensure_ascii=False)})

    data = {"looks": {k: {"label": v["label"], "desc": v["desc"]}
                      for k, v in LOOKS.items()},
            "products": rows}

    print(f"{len(rows)} 件產品")
    for k, v in spread.most_common():
        print(f"  {k:<18}{v}")
    unmatched = [r["handle"] for r in rows if not r["looks"]]
    print(f"\n冇歸到任何妝感：{len(unmatched)}")
    for h in unmatched[:12]:
        print("   ", h)

    if args.dry_run:
        return
    with open(OUT, "w") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"\n寫咗 {OUT}  ({os.path.getsize(OUT) // 1024} KB)")

    for chunk in [pushes[i:i + 25] for i in range(0, len(pushes), 25)]:
        out = gql(SET, {"metafields": chunk})
        user_errors(out, "metafieldsSet")
        print(f"    metafields 寫咗 {len(chunk)}")


if __name__ == "__main__":
    main()
