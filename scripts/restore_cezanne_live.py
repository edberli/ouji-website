#!/usr/bin/env python3
"""Restore CEZANNE status, Yau Tong inventory, and sales channels safely.

This intentionally does not call productSet, because productSet's asynchronous
follow-up processing can reset status and inventory after media changes.
"""

import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from publish import LOCATION, channels  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_YT_cezanne_ouji_yt.csv")
PRODUCTS = """
query($after: String) {
  products(first: 100, after: $after, query: "vendor:CEZANNE") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id handle status
      variants(first: 100) { nodes { id barcode inventoryItem { id } } }
    }
  }
}
"""
ACTIVATE = """
mutation($id: ID!) {
  productUpdate(product: {id: $id, status: ACTIVE}) {
    product { id status }
    userErrors { field message }
  }
}
"""
SET_QTY = """
mutation($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) { userErrors { field message } }
}
"""
PUBLISH = """
mutation($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}
"""


def main():
    quantities = {}
    for row in csv.DictReader(POS.open(encoding="utf-8-sig")):
        barcode = (row.get("barcode") or "").strip()
        if barcode:
            quantities[barcode] = max(0, int(float(row.get("stock_qty") or 0)))

    products = []
    after = None
    while True:
        page = gql(PRODUCTS, {"after": after})["products"]
        products.extend(page["nodes"])
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    inventory = []
    missing = []
    for product in products:
        for variant in product["variants"]["nodes"]:
            barcode = (variant.get("barcode") or "").strip()
            if barcode not in quantities:
                missing.append((product["handle"], barcode))
                continue
            inventory.append({
                "inventoryItemId": variant["inventoryItem"]["id"],
                "locationId": LOCATION,
                "quantity": quantities[barcode],
            })

    if missing:
        raise SystemExit(f"POS missing live variant barcodes: {missing}")

    # InventorySetQuantities accepts this range in one atomic correction.
    out = gql(SET_QTY, {"input": {
        "name": "available",
        "reason": "correction",
        "ignoreCompareQuantity": True,
        "quantities": inventory,
    }})
    user_errors(out, "inventorySetQuantities")

    pubs = [{"publicationId": publication_id} for publication_id in channels()]
    for product in products:
        out = gql(ACTIVATE, {"id": product["id"]})
        user_errors(out, "productUpdate")
        out = gql(PUBLISH, {"id": product["id"], "input": pubs})
        user_errors(out, "publishablePublish")

    print({
        "products_restored": len(products),
        "variants_restored": len(inventory),
        "inventory": sum(item["quantity"] for item in inventory),
        "channels": len(pubs),
    })


if __name__ == "__main__":
    main()
