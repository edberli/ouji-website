#!/usr/bin/env python3
"""Attach exact, one-product-per-shade images from dasique's official store."""
import argparse
import json
from pathlib import Path

import build_dasique as dasique
from import_cafe24_variant_images import apply

BACKUP = Path("/Volumes/core/ouji-backup/products.json")
REPORT = Path("data/dasique_variant_image_report.json")


def discover(products):
    store = dasique.store_products()
    rows = []
    for _, handle, _, _, _, line_titles, _ in dasique.LINES:
        product = products.get(handle)
        if not product or not line_titles:
            continue
        for edge in product.get("variants", {}).get("edges", []):
            variant = edge["node"]
            if variant.get("image"):
                continue
            number = dasique.shade_no(variant.get("title", ""))
            image = dasique.variant_image_for(store, line_titles, number)
            if not image:
                continue
            rows.append({
                "brand": "dasique",
                "productId": product["id"],
                "handle": handle,
                "variantId": variant["id"],
                "variantTitle": variant["title"],
                "barcode": variant.get("barcode"),
                "shadeCode": str(number),
                "imageUrl": image,
                "sourcePage": "https://dasique.com",
                "method": "official-shopify-single-variant-shade-product",
            })
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path, default=BACKUP)
    parser.add_argument("--report", type=Path, default=REPORT)
    args = parser.parse_args()
    products = {p["handle"]: p for p in json.loads(args.backup.read_text(encoding="utf-8"))}
    rows = discover(products)
    if args.apply and rows:
        apply(rows)
    args.report.write_text(json.dumps({
        "mode": "apply" if args.apply else "dry-run", "count": len(rows), "rows": rows,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{'已套用' if args.apply else '發現'}：{len(rows)} 個 dasique 官方色號圖")


if __name__ == "__main__":
    main()
