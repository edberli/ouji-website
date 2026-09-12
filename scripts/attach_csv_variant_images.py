#!/usr/bin/env python3
"""Attach shade images that were stranded in the Shopify import gallery.

The original import CSV puts the variant barcode, shade title and its image on
the same row, but leaves Shopify's ``Variant Image`` column empty.  Shopify
therefore imported the pictures into the product gallery without associating
them with variants.  This repair joins by product handle *and* barcode, then
requires the row image to already exist exactly once on that same product.
It never guesses by image position or product title.

    python3 scripts/attach_csv_variant_images.py
    python3 scripts/attach_csv_variant_images.py --apply
"""
import argparse
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402

BACKUP = Path("/Volumes/core/ouji-backup/products.json")
SOURCE = Path("/Volumes/core/ouji-backup/shopify-import.csv")
REPORT = Path("data/csv_variant_image_report.json")
MAKEUP_TYPES = {
    "唇釉", "氣墊粉底", "眼影", "胭脂", "底妝", "唇膏", "眼線", "高光",
    "唇線筆", "眉筆", "唇彩", "睫毛膏", "修容", "唇蜜", "多用彩妝",
}

UPDATE = """
mutation AssignVariantMedia($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id media(first: 3) { nodes { id } } }
    userErrors { field message }
  }
}
"""


def clean_url(value):
    """Shopify changes only the cache-busting query when it rehosts a file."""
    parts = urlsplit((value or "").strip())
    return f"{parts.scheme}://{parts.netloc}{parts.path}" if parts.netloc else ""


def image_carries_shade_code(image_url, variant_title):
    """Protect an existing exact shade asset from a weaker gallery-row match."""
    match = re.search(r"\b(?=[A-Z0-9-]*\d)[A-Z0-9-]{2,}\b", variant_title or "", re.I)
    if not match or not image_url:
        return False
    normalise = lambda value: re.sub(r"[^a-z0-9]", "", value.lower())
    filename = Path(urlsplit(image_url).path).name
    return normalise(match.group(0)) in normalise(filename)


def source_rows(path):
    rows = defaultdict(list)
    with path.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            handle = (row.get("Handle") or "").strip()
            barcode = (row.get("Variant Barcode") or row.get("Variant SKU") or "").strip()
            image = clean_url(row.get("Image Src"))
            if handle and barcode and image:
                rows[(handle, barcode)].append({
                    "shade": (row.get("Option1 Value") or "").strip(),
                    "imageUrl": image,
                    "sourceLine": row,
                })
    return rows


def discover(products, csv_rows):
    found = []
    rejected = Counter()
    for product in products:
        if product.get("status") != "ACTIVE" or product.get("productType") not in MAKEUP_TYPES:
            continue
        if not any(option.get("name") == "色號" for option in product.get("options", [])):
            continue
        media = defaultdict(list)
        for edge in product.get("media", {}).get("edges", []):
            node = edge["node"]
            url = clean_url((node.get("image") or {}).get("url"))
            if url:
                media[url].append(node["id"])

        for edge in product.get("variants", {}).get("edges", []):
            variant = edge["node"]
            barcode = str(variant.get("barcode") or variant.get("sku") or "").strip()
            candidates = csv_rows.get((product.get("handle", ""), barcode), [])
            if len(candidates) != 1:
                rejected["csv-row-not-unique"] += 1
                continue
            candidate = candidates[0]
            # The shade written beside the barcode must still be the same shade.
            if candidate["shade"] and candidate["shade"] != variant.get("title", ""):
                rejected["shade-title-mismatch"] += 1
                continue
            media_ids = media.get(candidate["imageUrl"], [])
            if len(media_ids) != 1:
                rejected["product-media-not-unique"] += 1
                continue
            current_url = clean_url((variant.get("image") or {}).get("url"))
            if current_url == candidate["imageUrl"]:
                rejected["already-correct"] += 1
                continue
            if image_carries_shade_code(current_url, variant.get("title", "")):
                rejected["protected-exact-shade-code-image"] += 1
                continue
            found.append({
                "productId": product["id"],
                "handle": product["handle"],
                "vendor": product.get("vendor"),
                "variantId": variant["id"],
                "variantTitle": variant["title"],
                "barcode": barcode,
                "mediaId": media_ids[0],
                "imageUrl": candidate["imageUrl"],
                "previousImageUrl": current_url or None,
                "method": "exact-handle-barcode-shade-row-and-existing-media-url",
            })
    return found, rejected


def apply(rows):
    groups = defaultdict(list)
    for row in rows:
        groups[row["productId"]].append(row)
    done = []
    for product_id, group in groups.items():
        payload = [{"id": row["variantId"], "mediaId": row["mediaId"]} for row in group]
        data = gql(UPDATE, {"productId": product_id, "variants": payload})
        user_errors(data, "productVariantsBulkUpdate")
        returned = data["productVariantsBulkUpdate"]["productVariants"]
        attached = {v["id"]: {n["id"] for n in v["media"]["nodes"]} for v in returned}
        for row in group:
            if row["mediaId"] not in attached.get(row["variantId"], set()):
                raise RuntimeError(f"Shopify did not attach {row['handle']} {row['variantTitle']}")
            done.append(row)
        print(f"✓ {group[0]['handle']}: {len(group)} 個色號")
    return done


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path, default=BACKUP)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--report", type=Path, default=REPORT)
    args = parser.parse_args()

    products = json.loads(args.backup.read_text(encoding="utf-8"))
    rows, rejected = discover(products, source_rows(args.source))
    done = apply(rows) if args.apply else []
    report = {
        "mode": "apply" if args.apply else "dry-run",
        "source": str(args.source),
        "proposed": len(rows),
        "applied": len(done),
        "rejected": dict(rejected),
        "rows": rows,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{'已綁定' if args.apply else '可安全綁定'}：{len(done) if args.apply else len(rows)} 個色號")
    print(f"報告：{args.report}")


if __name__ == "__main__":
    main()
