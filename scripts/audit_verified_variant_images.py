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
    # Hostnames are case-insensitive; Shopify CDN object paths are not.
    return parsed.netloc.lower() + urllib.parse.unquote(parsed.path)


def evidence_contradiction(presentation, evidence):
    """Reject explicit evidence that describes a different visual semantic.

    This is intentionally conservative.  It does not try to prove an image from
    prose, but it prevents a known arm-only result from being labelled as a lip,
    eye, cheek or product-only image merely to make a product look consistent.
    """
    text = (evidence or "").lower()
    has_arm = bool(re.search(r"\barm\b|手臂|手背", text))
    has_lip = any(term in text for term in (
        "lip result", "lip-result", "human lip", "real-person lip",
        "lip close-up", "lip application", "lip and arm", "arm/lip",
        "applied lip", "lip-colour", "唇妝",
    ))
    has_eye = any(term in text for term in (
        "eye result", "eye application", "single eye", "human eye", "眼妝",
    ))
    has_cheek = any(term in text for term in (
        "cheek result", "cheek application", "human cheek", "real-cheek", "胭脂效果",
    ))

    if presentation == "lip-swatch" and has_arm and not has_lip:
        return "arm-only evidence labelled lip-swatch"
    if presentation == "eye-swatch" and has_arm and not has_eye:
        return "arm-only evidence labelled eye-swatch"
    if presentation == "cheek-swatch" and has_arm and not has_cheek:
        return "arm-only evidence labelled cheek-swatch"
    if presentation == "product-shade" and (has_arm or has_lip or has_eye or has_cheek):
        return "applied-result evidence labelled product-shade"
    return None


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
    semantic_contradictions = {}

    for variant_id, approved in manifest.items():
        presentation = approved.get("presentation")
        if presentation not in VALID_PRESENTATIONS:
            invalid_presentations[variant_id] = presentation
        contradiction = evidence_contradiction(presentation, approved.get("evidence"))
        if contradiction:
            semantic_contradictions[variant_id] = contradiction

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
        "semanticContradictions": semantic_contradictions,
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
