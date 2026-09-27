#!/usr/bin/env python3
"""Build a published-product search index from the exact-ID naming audit.

Usage: python3 scripts/build_search_aliases.py /path/to/product-title-working-audit.csv
Only product IDs present in data/catalog.json are exported. Aliases are search
references, not claims that a market name is official or text for display.
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "data/catalog.json"
CATALOG_EN = ROOT / "data/catalog-en.json"
OUTPUT = ROOT / "data/search-aliases.json"
NAME_FIELDS = (
    "Current Product Title", "Primary Chinese Name", "Official English Name",
    "Existing English / Market Name", "Alternate Names",
    "Original Korean/Japanese Name",
)


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: build_search_aliases.py PRODUCT_AUDIT.csv")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))["v"]
    published = {edge["node"]["id"]: edge["node"] for edge in catalog}
    english = {edge["node"]["id"]: edge["node"]
               for edge in json.loads(CATALOG_EN.read_text(encoding="utf-8"))["v"]}
    if len(published) != len(catalog) or len(published) < 100:
        raise SystemExit("Catalog IDs are duplicated or incomplete")
    if set(english) != set(published):
        raise SystemExit("English and Chinese public catalogs have different Product IDs")
    rows = {}
    with open(sys.argv[1], encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            pid = row.get("Product ID", "")
            if pid in published:
                if pid in rows:
                    raise SystemExit(f"Duplicate audit Product ID: {pid}")
                rows[pid] = row
    if set(rows) != set(published):
        raise SystemExit(f"Audit missing {len(set(published) - set(rows))} published IDs")

    index = {}
    for pid, product in published.items():
        row = rows[pid]
        brand = (row.get("Brand") or product.get("vendor") or "").strip()
        current = product["title"].strip()
        aliases, seen = [], {current.casefold()}

        def add(value):
            value = str(value or "").strip()
            if not value or value.casefold() in seen:
                return
            seen.add(value.casefold())
            aliases.append(value)

        add(english[pid].get("title"))

        for field in NAME_FIELDS:
            value = row.get(field, "")
            parts = value.replace("；", ";").split(";") if field == "Alternate Names" else [value]
            for part in parts:
                part = part.strip()
                if part:
                    add(part)
                    if brand and not part.casefold().startswith(brand.casefold()):
                        add(f"{brand} {part}")

        identifiers = set()
        for variant in json.loads(row.get("Variants (JSON)") or "[]"):
            shade = str(variant.get("title") or "").strip()
            if shade and shade.casefold() not in {"default title", "default"}:
                add(f"{current} {shade}")
                for name in (row.get("Existing English / Market Name"), row.get("Primary Chinese Name")):
                    if name:
                        add(f"{brand} {name} {shade}")
            code = str(variant.get("barcode") or "").strip()
            if code and len(code) >= 5:
                identifiers.add(code)

        index[pid] = {"a": aliases, "i": sorted(identifiers)}

    OUTPUT.write_text(json.dumps({"v": 1, "products": index}, ensure_ascii=False,
                                 separators=(",", ":")), encoding="utf-8")
    print(f"{len(index)} published products; {sum(len(x['a']) for x in index.values())} aliases; "
          f"{sum(len(x['i']) for x in index.values())} identifiers; {OUTPUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
