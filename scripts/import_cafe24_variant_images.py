#!/usr/bin/env python3
"""Import official Cafe24 shade images and attach them to OUJI variants.

The official page must expose a non-empty ``link_image`` on a shade option.
Both sides must start with the same complete shade code.  There is no fuzzy
product-title or image-position matching.

    python3 scripts/import_cafe24_variant_images.py          # audit only
    python3 scripts/import_cafe24_variant_images.py --apply  # write Shopify
"""
import argparse
import concurrent.futures
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_cafe24 import BRANDS  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402

BACKUP = Path("/Volumes/core/ouji-backup/products.json")
REPORT = Path("data/cafe24_variant_image_report.json")
UA = {"User-Agent": "Mozilla/5.0 Chrome/120 Safari/537.36"}

CREATE_FILES = """
mutation CreateShadeFiles($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id fileStatus alt }
    userErrors { field message }
  }
}
"""
FILE_STATUS = """
query ShadeFileStatus($ids: [ID!]!) {
  nodes(ids: $ids) { ... on MediaImage { id fileStatus } }
}
"""
REFERENCE_FILES = """
mutation ReferenceShadeFiles($files: [FileUpdateInput!]!) {
  fileUpdate(files: $files) { files { id } userErrors { field message } }
}
"""
ASSIGN = """
mutation AssignVariantMedia($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id media(first: 3) { nodes { id } } }
    userErrors { field message }
  }
}
"""


def shade_code(value):
    match = re.match(
        r"[#\s(]*(\d{1,3}(?:\.\d+)?[A-Za-z]{0,2}|[A-Za-z]{1,3}\d{1,3}[A-Za-z]?)(?!\w)",
        html.unescape(value).strip(),
    )
    return match.group(1).lower() if match else None


def fetch_page(task, products):
    brand, host, handle, number = task
    product = products.get(handle)
    if not product:
        return []
    page_url = f"{host}/product/detail.html?product_no={number}"
    try:
        request = urllib.request.Request(page_url, headers=UA)
        source = urllib.request.urlopen(request, timeout=35).read().decode("utf-8", "ignore")
    except Exception as exc:
        print(f"! {handle}: {type(exc).__name__}")
        return []

    options = re.findall(
        r'<option value="(?!\*|\*\*)([^"]+)"[^>]*link_image="([^"]+)"', source
    )
    options += re.findall(
        r'<li[^>]*option_value="([^"]+)"[^>]*link_image="([^"]+)"', source
    )
    official = {}
    for name, image in options:
        code = shade_code(name)
        if code and image:
            official.setdefault(code, set()).add(image)

    rows = []
    for edge in product.get("variants", {}).get("edges", []):
        variant = edge["node"]
        if variant.get("image"):
            continue
        code = shade_code(variant.get("title", ""))
        matches = official.get(code, set()) if code else set()
        if len(matches) != 1:
            continue
        image = next(iter(matches))
        image = "https:" + image if image.startswith("//") else urllib.parse.urljoin(host, image)
        rows.append({
            "brand": brand,
            "productId": product["id"],
            "handle": handle,
            "variantId": variant["id"],
            "variantTitle": variant["title"],
            "barcode": variant.get("barcode"),
            "shadeCode": code,
            "imageUrl": image,
            "sourcePage": page_url,
            "method": "official-cafe24-explicit-option-link-image",
        })
    return rows


def discover(products):
    tasks = [
        (brand, config["host"], handle, number)
        for brand, config in BRANDS.items()
        for handle, number in config["products"].items()
    ]
    rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        for found in executor.map(lambda task: fetch_page(task, products), tasks):
            rows.extend(found)
    return rows


def wait_ready(ids):
    pending = set(ids)
    for _ in range(30):
        nodes = gql(FILE_STATUS, {"ids": list(pending)})["nodes"]
        failed = [node["id"] for node in nodes if node and node.get("fileStatus") == "FAILED"]
        if failed:
            raise RuntimeError(f"Shopify file processing failed: {failed}")
        ready = {node["id"] for node in nodes if node and node.get("fileStatus") == "READY"}
        pending -= ready
        if not pending:
            return
        time.sleep(2)
    raise RuntimeError(f"Timed out waiting for {len(pending)} Shopify files")


def apply(rows):
    # Create in small batches so one bad remote URL cannot obscure a whole run.
    for start in range(0, len(rows), 20):
        group = rows[start:start + 20]
        inputs = [
            {"originalSource": row["imageUrl"], "contentType": "IMAGE",
             "alt": f"{row['handle']} {row['variantTitle']} 色號"}
            for row in group
        ]
        data = gql(CREATE_FILES, {"files": inputs})
        user_errors(data, "fileCreate")
        files = data["fileCreate"]["files"]
        if len(files) != len(group):
            raise RuntimeError("Shopify returned a different number of files")
        for row, file in zip(group, files):
            row["mediaId"] = file["id"]
        wait_ready([row["mediaId"] for row in group])

    references = [
        {"id": row["mediaId"], "referencesToAdd": [row["productId"]]}
        for row in rows
    ]
    for start in range(0, len(references), 50):
        data = gql(REFERENCE_FILES, {"files": references[start:start + 50]})
        user_errors(data, "fileUpdate")

    grouped = {}
    for row in rows:
        grouped.setdefault(row["productId"], []).append(row)
    for product_id, group in grouped.items():
        variants = [{"id": row["variantId"], "mediaId": row["mediaId"]} for row in group]
        data = gql(ASSIGN, {"productId": product_id, "variants": variants})
        user_errors(data, "productVariantsBulkUpdate")
        print(f"✓ {group[0]['handle']}: {len(group)} 個官方色號圖")


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
    report = {"mode": "apply" if args.apply else "dry-run", "count": len(rows), "rows": rows}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{'已套用' if args.apply else '發現'}：{len(rows)} 個官網明確色號圖")
    print(f"報告：{args.report}")


if __name__ == "__main__":
    main()
