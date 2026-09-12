#!/usr/bin/env python3
"""Audit and safely attach shade-specific media to existing Shopify variants.

This repair deliberately refuses fuzzy matches.  A media item is eligible only
when the variant starts with a real alphanumeric shade code (for example 17C,
M101 or S202) and exactly one image on the same product contains that complete
code in its filename.  Existing variant media is never replaced.

    python3 scripts/repair_variant_images.py
    python3 scripts/repair_variant_images.py --apply

The JSON report is the audit trail for every proposed/applied association.
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402

DEFAULT_BACKUP = Path("/Volumes/core/ouji-backup/products.json")
DEFAULT_REPORT = Path("data/variant_image_repair_report.json")
MAKEUP_TYPES = {
    "唇釉", "氣墊粉底", "眼影", "胭脂", "底妝", "唇膏", "眼線", "高光",
    "唇線筆", "眉筆", "唇彩", "睫毛膏", "修容", "唇蜜", "多用彩妝",
}
GENERIC_COLOUR_WORDS = {
    "color", "colour", "black", "brown", "pink", "red", "beige", "ivory",
    "natural", "clear", "shade", "gloss", "glow", "matte", "deep", "light",
    "cool", "warm", "coral",
}

UPDATE = """
mutation AssignVariantMedia($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id media(first: 3) { nodes { id } } }
    userErrors { field message }
  }
}
"""


def media_nodes(product):
    out = []
    for edge in product.get("media", {}).get("edges", []):
        node = edge["node"]
        image = node.get("image") or {}
        if image.get("url"):
            out.append((node["id"], urllib.parse.unquote(image["url"]).lower()))
    return out


def shade_code(title):
    # Pure numbers are excluded: foo-01.jpg is commonly an image position,
    # not evidence that the file depicts shade 01.
    match = re.match(
        r"[#\s(]*([A-Za-z]{1,3}\d{1,3}[A-Za-z]?|\d{1,3}[A-Za-z]{1,2})(?!\w)",
        title.strip(),
    )
    return match.group(1).lower() if match else None


def distinctive_words(title):
    return [
        word.lower() for word in re.findall(r"[A-Za-z]{4,}", title)
        if word.lower() not in GENERIC_COLOUR_WORDS
    ]


def proposals(products):
    found = []
    for product in products:
        if product.get("status") != "ACTIVE" or product.get("productType") not in MAKEUP_TYPES:
            continue
        if not any(option.get("name") == "色號" for option in product.get("options", [])):
            continue
        media = media_nodes(product)
        for edge in product.get("variants", {}).get("edges", []):
            variant = edge["node"]
            if variant.get("image"):
                continue
            title = variant.get("title", "")
            code = shade_code(title)
            matches = []
            method = None
            if code:
                pattern = re.compile(rf"(?<![a-z0-9]){re.escape(code)}(?![a-z0-9])")
                matches = [(media_id, url) for media_id, url in media if pattern.search(url)]
                method = "exact-shade-code-in-existing-media-filename"
            if len(matches) != 1:
                # Some official files carry the shade name but not its code.
                # Generic colour words alone are too weak; every remaining
                # distinctive English word must occur as a complete filename token.
                words = distinctive_words(title)
                if words:
                    matches = []
                    for media_id, url in media:
                        tokens = re.sub(r"[^a-z0-9]+", " ", url)
                        if all(re.search(rf"\b{re.escape(word)}\b", tokens) for word in words):
                            matches.append((media_id, url))
                    method = "exact-distinctive-shade-name-in-existing-media-filename"
            if len(matches) != 1:
                continue
            media_id, url = matches[0]
            found.append({
                "productId": product["id"],
                "handle": product["handle"],
                "variantId": variant["id"],
                "variantTitle": variant["title"],
                "barcode": variant.get("barcode"),
                "shadeCode": code,
                "mediaId": media_id,
                "imageUrl": url,
                "method": method,
            })
    return found


def apply(rows):
    grouped = {}
    for row in rows:
        grouped.setdefault(row["productId"], []).append(row)
    updated = []
    for product_id, group in grouped.items():
        variants = [{"id": row["variantId"], "mediaId": row["mediaId"]} for row in group]
        data = gql(UPDATE, {"productId": product_id, "variants": variants})
        user_errors(data, "productVariantsBulkUpdate")
        returned = data["productVariantsBulkUpdate"]["productVariants"]
        attached = {v["id"]: {n["id"] for n in v["media"]["nodes"]} for v in returned}
        for row in group:
            if row["mediaId"] not in attached.get(row["variantId"], set()):
                raise RuntimeError(f"Shopify did not attach media for {row['handle']} {row['variantTitle']}")
            updated.append(row)
        print(f"✓ {group[0]['handle']}: {len(group)} 個色號")
    return updated


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup", type=Path, default=DEFAULT_BACKUP)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    products = json.loads(args.backup.read_text(encoding="utf-8"))
    rows = proposals(products)
    applied = apply(rows) if args.apply else []
    report = {
        "mode": "apply" if args.apply else "dry-run",
        "backup": str(args.backup),
        "proposed": len(rows),
        "applied": len(applied),
        "rows": rows,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{'已套用' if args.apply else '可安全套用'}：{len(applied) if args.apply else len(rows)} 個色號")
    print(f"報告：{args.report}")


if __name__ == "__main__":
    main()
