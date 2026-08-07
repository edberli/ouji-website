#!/usr/bin/env python3
"""
Re-run the product-type rules over the skincare range already on the shop.

The rules in build_skincare.py started narrow, so 42 products fell through
to the catch-all "護膚": every 修護霜, every 泥膜, the scalp line, the
starter kits. A generic type is not a cosmetic problem — the brand sections
order themselves by where a product sits in a routine, and an unrecognised
type sorts to the bottom of the brand with no category page to appear on.

    python3 scripts/retype_skincare.py --dry-run
    python3 scripts/retype_skincare.py

Only productType and the category tags are touched. Titles, imagery, price,
stock and cost are left exactly as they are.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_skincare import TAGS_BY_KIND, kind_of  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402

PAGE = """
query($after: String) {
  products(first: 100, after: $after, query: "tag:護膚") {
    pageInfo { hasNextPage endCursor }
    edges { node { id title vendor productType tags } }
  }
}
"""

UPDATE = """
mutation($input: ProductInput!) {
  productUpdate(input: $input) { product { id } userErrors { field message } }
}
"""

# the tags the type rules own; anything else on the product is left alone
OWNED = {t.strip() for v in TAGS_BY_KIND.values() for t in v.split(",")}


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

    changed = 0
    for p in products:
        kind = kind_of(p["title"])
        if kind == "護膚" or kind == p["productType"]:
            continue
        wanted = {t.strip() for t in TAGS_BY_KIND.get(kind, "").split(",") if t.strip()}
        tags = sorted((set(p["tags"]) - OWNED) | wanted)
        print(f'  {p["productType"] or "—":<5} → {kind:<5} {p["title"][:46]}')
        changed += 1
        if args.dry_run:
            continue
        out = gql(UPDATE, {"input": {"id": p["id"], "productType": kind, "tags": tags}})
        user_errors(out, "productUpdate")

    print(f'\n睇咗 {len(products)} 件，改咗 {changed} 件'
          + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
