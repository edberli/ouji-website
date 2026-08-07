#!/usr/bin/env python3
"""
Write the name-matching task for one brand, ready to hand to the offload.

Our sheet names products in Chinese; the brands' own stores name them in
Korean or English. Nothing joins the two — the sheet has barcodes, the
storefronts do not publish them — so the join is by name, done once per
brand and cached in /tmp/skin/matched.json.

    python3 scripts/make_match_input.py "Some By Mi" > /tmp/skin/in/some-by-mi.txt

The matcher returns indices into the store list, so this file and the store
list must be generated from the same snapshot. Re-fetch the store, and the
indices from an older run point at the wrong products.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from skincare_data import by_vendor, load  # noqa: E402

STORES = "/tmp/skin/stores.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("--key", help="stores.json key, if not the brand name")
    args = ap.parse_args()

    rows = by_vendor(load(args.brand)).get(args.brand, [])
    store = json.load(open(STORES)).get(args.key or args.brand, [])
    if not rows or not store:
        raise SystemExit(f"{args.brand}: 庫存 {len(rows)} 件、官網 {len(store)} 件，做唔到")

    out = [f"# 品牌：{args.brand}", "", "## 我哋庫存（每件都要出一行）"]
    for r in rows:
        out.append(f'- barcode={r["barcode"]} | size={r["size"] or "—"} | {r["title"]}')
    out += ["", "## 品牌官網清單"]
    for i, s in enumerate(store):
        out.append(f'- i={i} | {s["title"]}')
    print("\n".join(out))


if __name__ == "__main__":
    main()
