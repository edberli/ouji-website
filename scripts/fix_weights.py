#!/usr/bin/env python3
"""Fix the eight Glint variants whose weight unit is kilograms.

A highlighter stick is 7 grams. The store says 7 kilograms — the unit
came in wrong from the original CSV import, and it is the same value on
every affected row, so this is a unit mistake, not eight typos.

Nothing charges by weight today, which is why it has gone unnoticed;
the day weight-based shipping is switched on, these eight would quote a
courier price for a 7 kg parcel.

Only touches variants that are (a) already in KILOGRAMS and (b) under
10 — a real 10 kg product would be left alone.

    python3 scripts/fix_weights.py --dry-run
    python3 scripts/fix_weights.py
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql  # noqa: E402

FIND = """
query($cursor: String) {
  products(first: 25, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges { node { title
      variants(first: 60) { edges { node { id title
        inventoryItem { id measurement { weight { value unit } } } } } } } }
  }
}
"""

SET = """
mutation($id: ID!, $input: InventoryItemInput!) {
  inventoryItemUpdate(id: $id, input: $input) {
    inventoryItem { id measurement { weight { value unit } } }
    userErrors { field message }
  }
}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    todo, cursor = [], None
    while True:
        d = gql(FIND, {"cursor": cursor})["products"]
        for e in d["edges"]:
            p = e["node"]
            for ve in p["variants"]["edges"]:
                v = ve["node"]
                inv = v.get("inventoryItem") or {}
                w = ((inv.get("measurement") or {}).get("weight")) or {}
                if w.get("unit") == "KILOGRAMS" and 0 < (w.get("value") or 0) < 10:
                    todo.append((p["title"], v["title"], inv["id"], w["value"]))
        if not d["pageInfo"]["hasNextPage"]:
            break
        cursor = d["pageInfo"]["endCursor"]

    if not todo:
        print("冇嘢要改。")
        return
    for title, vt, _, val in todo:
        print(f"  {title[:34]:<36}{vt[:26]:<28}{val} kg → {val} g")
    if args.dry_run:
        print(f"\n{len(todo)} 個變體（dry run）")
        return

    for title, vt, iid, val in todo:
        out = gql(SET, {"id": iid,
                        "input": {"measurement": {"weight": {"value": val,
                                                             "unit": "GRAMS"}}}})
        errs = out["inventoryItemUpdate"]["userErrors"]
        if errs:
            print(f"  ✗ {title} / {vt}: {errs}")
    print(f"\n改咗 {len(todo)} 個變體")


if __name__ == "__main__":
    main()
