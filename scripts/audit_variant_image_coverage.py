#!/usr/bin/env python3
"""Fail when an active multi-shade Shopify product lacks a verified image."""

import argparse
import json
from pathlib import Path

from shopify_admin import gql


QUERY = """
query ActiveShadeProducts($after: String) {
  products(first: 100, after: $after, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      handle
      options { name }
      variants(first: 250) {
        nodes { id title availableForSale inventoryQuantity }
      }
    }
  }
}
"""


def active_products():
    after = None
    while True:
        connection = gql(QUERY, {"after": after})["products"]
        yield from connection["nodes"]
        if not connection["pageInfo"]["hasNextPage"]:
            return
        after = connection["pageInfo"]["endCursor"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("data/verified_variant_images.json"),
    )
    args = parser.parse_args()
    verified = json.loads(args.manifest.read_text(encoding="utf-8"))

    shade_products = []
    variants = []
    missing = []
    for product in active_products():
        product_variants = product["variants"]["nodes"]
        first_option = product["options"][0]["name"] if product["options"] else ""
        if first_option != "色號" or len(product_variants) < 2:
            continue
        shade_products.append(product["id"])
        for variant in product_variants:
            variants.append(variant["id"])
            if variant["id"] not in verified:
                missing.append({
                    "handle": product["handle"],
                    "variantId": variant["id"],
                    "title": variant["title"],
                    "availableForSale": variant["availableForSale"],
                    "inventoryQuantity": variant["inventoryQuantity"],
                })

    result = {
        "activeMultiShadeProducts": len(shade_products),
        "activeMultiShadeVariants": len(variants),
        "verified": len(variants) - len(missing),
        "missing": missing,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if missing else 0)


if __name__ == "__main__":
    main()
