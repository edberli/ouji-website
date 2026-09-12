#!/usr/bin/env python3
"""Verify every approved shade image against the live Shopify variant.

This is deliberately strict: an entry is valid only when the exact CDN asset
is attached to the exact variant, the JSON has no duplicate keys or reused
assets, and one product does not mix presentation semantics.
"""

import argparse
import json
import re
import sys
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql  # noqa: E402


DEFAULT_MANIFEST = Path("data/verified_variant_images.json")
VALID_PRESENTATIONS = {
    "arm-swatch",
    "cheek-swatch",
    "complexion-swatch",
    "eye-swatch",
    "lip-swatch",
    "palette-shade",
    "product-shade",
}

QUERY = """
query VariantShadeMedia($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      title
      product { id handle }
      media(first: 20) {
        nodes { id ... on MediaImage { image { url } } }
      }
    }
  }
}
"""


def canonical_url(url):
    parsed = urllib.parse.urlsplit(url or "")
    return (parsed.netloc + parsed.path).lower()


def audit(path):
    raw = path.read_text(encoding="utf-8")
    manifest = json.loads(raw)
    raw_keys = re.findall(
        r'^\s*"(gid://shopify/ProductVariant/\d+)"\s*:', raw, re.MULTILINE
    )
    duplicate_keys = sorted(key for key, count in Counter(raw_keys).items() if count > 1)

    variants = {}
    ids = list(manifest)
    for start in range(0, len(ids), 100):
        for node in gql(QUERY, {"ids": ids[start : start + 100]})["nodes"]:
            if node:
                variants[node["id"]] = node

    missing_variants = []
    media_mismatches = []
    urls = defaultdict(list)
    product_presentations = defaultdict(set)
    invalid_presentations = {}

    for variant_id, approved in manifest.items():
        presentation = approved.get("presentation")
        if presentation not in VALID_PRESENTATIONS:
            invalid_presentations[variant_id] = presentation

        target_url = canonical_url(approved.get("imageUrl"))
        urls[target_url].append(variant_id)
        variant = variants.get(variant_id)
        if not variant:
            missing_variants.append(variant_id)
            continue

        product_presentations[variant["product"]["id"]].add(presentation)
        attached = {
            canonical_url((node.get("image") or {}).get("url"))
            for node in variant["media"]["nodes"]
        }
        if target_url not in attached:
            media_mismatches.append(
                {
                    "variantId": variant_id,
                    "handle": variant["product"]["handle"],
                    "title": variant["title"],
                    "expected": approved.get("imageUrl"),
                }
            )

    report = {
        "manifest": len(manifest),
        "matched": len(manifest) - len(missing_variants) - len(media_mismatches),
        "duplicateKeys": duplicate_keys,
        "missingVariants": missing_variants,
        "mediaMismatches": media_mismatches,
        "duplicateImageUrls": {
            url: variant_ids for url, variant_ids in urls.items() if len(variant_ids) > 1
        },
        "mixedProductPresentations": {
            product_id: sorted(presentations)
            for product_id, presentations in product_presentations.items()
            if len(presentations) > 1
        },
        "invalidPresentations": invalid_presentations,
    }
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    args = parser.parse_args()
    report = audit(args.manifest)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    failures = [value for key, value in report.items() if key not in {"manifest", "matched"}]
    raise SystemExit(1 if any(failures) or report["manifest"] != report["matched"] else 0)


if __name__ == "__main__":
    main()
