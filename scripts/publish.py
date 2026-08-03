#!/usr/bin/env python3
"""
Create or update a product with all its shades and imagery in one call.

Replaces the CSV import dance: the importer refuses to overwrite an
existing handle, so a correction meant deleting the products and
re-importing by hand. productSet is idempotent on the handle, so a brand
can be rebuilt as many times as its copy needs.

Used by the per-brand build scripts (build_clio.py and friends).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402

LOCATION = "gid://shopify/Location/86449356958"   # 商店地點 — the only one

PRODUCT_SET = """
mutation($input: ProductSetInput!) {
  productSet(synchronous: true, input: $input) {
    product { id handle title
      variants(first: 100) { edges { node { id title } } }
      media(first: 100) { edges { node { ... on MediaImage { id } } } }
    }
    userErrors { field message code }
  }
}
"""


def build_input(p):
    """p: {handle,title,descriptionHtml,vendor,productType,tags,status,
           option_name,shades:[{name,barcode,qty,price,image}],images:[url]}"""
    images = list(dict.fromkeys(p["images"]))
    files = [{"originalSource": u, "contentType": "IMAGE", "alt": p["title"]} for u in images]

    variants = []
    for s in p["shades"]:
        v = {
            "optionValues": [{"optionName": p["option_name"], "name": s["name"]}],
            "price": str(s.get("price", p.get("price"))),
            "barcode": s["barcode"],
            "sku": s["barcode"],
            "inventoryItem": {"tracked": True},
            "inventoryQuantities": [{
                "locationId": LOCATION,
                "name": "available",
                "quantity": int(s.get("qty", 0)),
            }],
            "inventoryPolicy": "DENY" if int(s.get("qty", 0)) == 0 else "CONTINUE",
        }
        if s.get("image") and s["image"] in images:
            v["file"] = {"originalSource": s["image"], "contentType": "IMAGE", "alt": s["name"]}
        variants.append(v)

    return {
        "handle": p["handle"],
        "title": p["title"],
        "descriptionHtml": p["descriptionHtml"],
        "vendor": p["vendor"],
        "productType": p["productType"],
        "tags": p["tags"],
        "status": p.get("status", "ACTIVE"),
        "productOptions": [{
            "name": p["option_name"],
            "values": [{"name": s["name"]} for s in p["shades"]],
        }],
        "variants": variants,
        "files": files,
    }


def publish(p):
    data = gql(PRODUCT_SET, {"input": build_input(p)})
    user_errors(data, "productSet")
    prod = data["productSet"]["product"]
    return {
        "handle": prod["handle"],
        "variants": len(prod["variants"]["edges"]),
        "media": len(prod["media"]["edges"]),
    }
