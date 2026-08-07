#!/usr/bin/env python3
"""
Let every product be ordered past its stock, and say so at the basket.

Blocking the order was the wrong end to solve this at. Someone who wants
fifty boxes and can only have two on Friday still wants the fifty — they
just need to be told which is which before they pay. Refusing the order
sends them somewhere else and tells them nothing.

So: inventoryPolicy CONTINUE everywhere. Stock counts stay accurate and
still drive what the basket says; they no longer decide whether a sale is
allowed to happen.

    python3 scripts/allow_backorder.py --dry-run
    python3 scripts/allow_backorder.py
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402

PAGE = """
query($after: String) {
  products(first: 60, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges { node { id title
      variants(first: 100) { edges { node { id inventoryPolicy } } } } }
  }
}
"""

BULK = """
mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id } userErrors { field message }
  }
}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    after, products = None, []
    while True:
        page = gql(PAGE, {"after": after})["products"]
        products += [e["node"] for e in page["edges"]]
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    touched = variants = 0
    for p in products:
        deny = [e["node"]["id"] for e in p["variants"]["edges"]
                if e["node"]["inventoryPolicy"] == "DENY"]
        if not deny:
            continue
        touched += 1
        variants += len(deny)
        print(f'  {len(deny):>3} 個變體  {p["title"][:50]}')
        if args.dry_run:
            continue
        # 100 at a time is the mutation's own limit.
        for i in range(0, len(deny), 100):
            out = gql(BULK, {"productId": p["id"], "variants": [
                {"id": v, "inventoryPolicy": "CONTINUE"} for v in deny[i:i + 100]]})
            user_errors(out, "productVariantsBulkUpdate")

    print(f'\n{len(products)} 件產品，改咗 {touched} 件、{variants} 個變體'
          + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
