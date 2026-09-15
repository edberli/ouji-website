#!/usr/bin/env python3
"""Allowlist CEZANNE variant media after exact official shade matching."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_cezanne_yt import load_products  # noqa: E402
from shopify_admin import gql  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "verified_variant_images.json"
QUERY = """
query($handle: String!) {
  productByIdentifier(identifier: {handle: $handle}) {
    variants(first: 100) { nodes { id barcode image { url } } }
  }
}
"""


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    products, _ = load_products()
    added = 0
    missing = []
    for product in products:
        expected = {s["barcode"]: s for s in product["shades"] if s.get("image")}
        if not expected:
            continue
        remote = gql(QUERY, {"handle": product["handle"]}).get("productByIdentifier")
        if not remote:
            missing.extend(expected)
            continue
        for variant in remote["variants"]["nodes"]:
            shade = expected.get(variant.get("barcode"))
            image = variant.get("image") or {}
            if not shade or not image.get("url"):
                if shade:
                    missing.append(variant.get("barcode"))
                continue
            manifest[variant["id"]] = {
                "imageUrl": image["url"],
                "presentation": "product-shade",
                "evidence": (
                    "Official CEZANNE shade asset matched to the exact POS colour code "
                    f"and barcode {variant['barcode']}"
                ),
            }
            added += 1
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"allowlisted": added, "missing": missing}, ensure_ascii=False))


if __name__ == "__main__":
    main()
