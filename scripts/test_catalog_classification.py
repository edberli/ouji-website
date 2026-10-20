#!/usr/bin/env python3
"""Offline contract tests for canonical classification-title snapshot data."""

import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest


SCRIPT_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "build_catalog_snapshot", SCRIPT_DIR / "build_catalog_snapshot.py"
)
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


def product_edge(product_id, display_title):
    return {
        "node": {
            "id": product_id,
            "handle": f"product-{product_id}",
            "title": display_title,
            "vendor": "Example vendor",
            "productType": "Skincare",
            "tags": ["example", "unchanged"],
            "createdAt": "2026-01-02T03:04:05Z",
            "priceRange": {"minVariantPrice": {"amount": "12.00", "currencyCode": "HKD"}},
            "images": {"edges": [{"node": {"url": "https://example.invalid/image.jpg", "altText": "Example"}}]},
            "totalInventory": 7,
            "variants": {"edges": [{"node": {"id": f"variant-{product_id}", "title": "Default", "price": {"amount": "12.00"}}}]},
            "options": [{"name": "Title", "optionValues": [{"name": "Default"}]}],
        }
    }


def page(edges, has_next=False, cursor=None):
    return {
        "edges": copy.deepcopy(edges),
        "pageInfo": {"hasNextPage": has_next, "endCursor": cursor},
    }


class MockStorefront:
    """Deterministic two-page Storefront responses; no network code is used."""

    def __init__(self, missing_canonical_id=None):
        self.calls = []
        self.missing_canonical_id = missing_canonical_id
        self.products = [
            product_edge("gid://shopify/Product/101", "English display title A"),
            product_edge("gid://shopify/Product/202", "English display title B"),
        ]
        # Deliberately return canonical records in a different order to prove the join is by ID.
        canonical = [
            {"node": {"id": "gid://shopify/Product/202", "title": "繁中標題乙"}},
            {"node": {"id": "gid://shopify/Product/101", "title": "繁中標題甲"}},
        ]
        if missing_canonical_id:
            canonical = [edge for edge in canonical if edge["node"]["id"] != missing_canonical_id]
        self.canonical = canonical

    def __call__(self, query, after):
        self.calls.append((query, after))
        if "GetCanonicalTitles" in query:
            edges = self.canonical
        elif "GetProducts" in query:
            edges = self.products
        else:
            raise AssertionError(f"Unexpected query: {query}")

        if after is None:
            return page(edges[:1], has_next=True, cursor="cursor-1")
        if after == "cursor-1":
            return page(edges[1:])
        raise AssertionError(f"Unexpected cursor: {after}")


class CatalogClassificationTests(unittest.TestCase):
    def setUp(self):
        # Keep generated test snapshots on the external SSD and remove them on exit.
        self.tempdir = tempfile.TemporaryDirectory(
            prefix=".catalog-classification-test-", dir=SCRIPT_DIR.parent
        )
        self.addCleanup(self.tempdir.cleanup)
        self.output = Path(self.tempdir.name) / "catalog-en.json"

    def test_english_snapshot_joins_current_zh_titles_by_id_across_pages(self):
        storefront = MockStorefront()
        original_nodes = [copy.deepcopy(edge["node"]) for edge in storefront.products]

        # A stale file must not be used as the canonical-title source.
        self.output.write_text(json.dumps({"v": [{"node": {"id": "stale"}}]}), encoding="utf-8")
        snapshot = builder.build_snapshot(
            "en", path=self.output, fetch_page=storefront, min_products=2, timestamp_ms=123
        )

        product_calls = [(query, cursor) for query, cursor in storefront.calls if "GetProducts" in query]
        canonical_calls = [(query, cursor) for query, cursor in storefront.calls if "GetCanonicalTitles" in query]
        self.assertEqual([cursor for _, cursor in product_calls], [None, "cursor-1"])
        self.assertEqual([cursor for _, cursor in canonical_calls], [None, "cursor-1"])
        self.assertTrue(all("@inContext(language: EN)" in query for query, _ in product_calls))
        self.assertTrue(all("@inContext(language: ZH_TW)" in query for query, _ in canonical_calls))
        for query, _ in canonical_calls:
            self.assertIn("edges { node { id title } }", query)
            self.assertNotIn("priceRange", query)
            self.assertNotIn("variants", query)
            self.assertNotIn("images", query)

        result_nodes = [edge["node"] for edge in snapshot["v"]]
        self.assertEqual(
            [(node["id"], node["classificationTitle"]) for node in result_nodes],
            [
                ("gid://shopify/Product/101", "繁中標題甲"),
                ("gid://shopify/Product/202", "繁中標題乙"),
            ],
        )
        for actual, original in zip(result_nodes, original_nodes):
            self.assertEqual({key: value for key, value in actual.items() if key != "classificationTitle"}, original)
        self.assertEqual(json.loads(self.output.read_text(encoding="utf-8")), snapshot)

    def test_missing_canonical_id_fails_before_writing_english_snapshot(self):
        storefront = MockStorefront(missing_canonical_id="gid://shopify/Product/202")
        sentinel = b"existing snapshot must remain intact"
        self.output.write_bytes(sentinel)

        with self.assertRaisesRegex(builder.MissingCanonicalTitlesError, "Product/202"):
            builder.build_snapshot(
                "en", path=self.output, fetch_page=storefront, min_products=2, timestamp_ms=123
            )

        self.assertEqual(self.output.read_bytes(), sentinel)
        self.assertFalse(Path(str(self.output) + ".tmp").exists())

    def test_zh_snapshot_uses_its_current_title_for_classification(self):
        storefront = MockStorefront()
        # Localize the product display titles returned by the mocked zh query.
        storefront.products = [
            product_edge("gid://shopify/Product/101", "繁中標題甲"),
            product_edge("gid://shopify/Product/202", "繁中標題乙"),
        ]

        snapshot = builder.build_snapshot(
            "zh", path=self.output, fetch_page=storefront, min_products=2, timestamp_ms=456
        )

        product_query = next(query for query, _ in storefront.calls if "GetProducts" in query)
        self.assertIn("@inContext(language: ZH_TW)", product_query)
        self.assertFalse(any("GetCanonicalTitles" in query for query, _ in storefront.calls))
        for edge in snapshot["v"]:
            self.assertEqual(edge["node"]["classificationTitle"], edge["node"]["title"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
