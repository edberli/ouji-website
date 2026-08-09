#!/usr/bin/env python3
"""Repair the 42 product titles whose middle character came through as `?`.

Somewhere on the way into Shopify the titles passed through an encoding
that could not hold 肽, 啫, 醯/酰 or 蔘, and each of those became a literal
question mark. Customers have been reading 「COSRX 煙?胺 15% 精華」 on the
live site.

The replacement is not guessed from the shape of the hole. Each corrupted
title is decided from **that product's own description**, which was never
corrupted — so 「煙?胺」 is resolved by reading what the same product's
copy calls the ingredient, not by picking whichever spelling looks right.

That check overturned the obvious answer: the store writes **煙酰胺** in
67 descriptions and 煙醯胺 in only 12, and every corrupted product whose
own copy mentions the ingredient says 煙酰胺.

Handles are never touched — they carry every existing link, the SEO, and
the join key for ingredients.json / match-data.json / data/reviews.

    python3 scripts/fix_title_mojibake.py --dry-run
    python3 scripts/fix_title_mojibake.py
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql  # noqa: E402

# 每條規則：壞咗嗰段 → 應該係乜。全部由產品自己嘅描述考證返嚟。
RULES = [
    ("煙?胺", "煙酰胺"),      # niacinamide —— 描述用 煙酰胺（67 件）
    ("穀胱甘?", "穀胱甘肽"),   # glutathione
    ("谷胱甘?", "谷胱甘肽"),   # 同上，但保留佢原本用「谷」定「穀」
    ("胜?", "胜肽"),          # peptide
    ("?喱", "啫喱"),          # gel
    ("潔?哩", "潔啫喱"),       # 同上，另一種寫法
    ("人?深層", "人蔘深層"),   # ginseng
]

# 兩件唔跟規律，要對返官方英文名先定到。
SPECIAL = {
    # COSRX Advanced Snail Peptide Eye Cream —— 缺嗰個字係「肽」
    "cosrx-cosrx-25ml-1070":
        "COSRX 高級蝸牛肽眼霜25ml",
    # SOME BY MI Yuja Niacin 30 Days Miracle —— 佢自己描述通篇用「煙酰胺」，
    # 跟返描述，順便同上面 12 件對齊（呢件改咗三個字，唔止一個）
    "some-by-mi-somebymi-30-3078":
        "SOMEBYMI 柚子煙酰胺30天奇蹟美白精華",
}

FIND = """
query($cursor: String) {
  products(first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges { node { id handle title } }
  }
}
"""

RENAME = """
mutation($input: ProductInput!) {
  productUpdate(input: $input) { product { id title } userErrors { field message } }
}
"""


def fixed_title(handle, title):
    if handle in SPECIAL:
        return SPECIAL[handle]
    out = title
    for bad, good in RULES:
        out = out.replace(bad, good)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    broken, cursor = [], None
    while True:
        d = gql(FIND, {"cursor": cursor})["products"]
        broken += [e["node"] for e in d["edges"] if "?" in e["node"]["title"]]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cursor = d["pageInfo"]["endCursor"]

    todo, stuck = [], []
    for p in broken:
        new = fixed_title(p["handle"], p["title"])
        (stuck if "?" in new or new == p["title"] else todo).append((p, new))

    for p, new in todo:
        print(f"  {p['title']}\n→ {new}\n")
    if stuck:
        print("⚠️  以下改唔到，規律唔covered：")
        for p, _ in stuck:
            print(f"  {p['handle']}  {p['title']}")

    print(f"{len(broken)} 件壞咗 · {len(todo)} 件改得 · {len(stuck)} 件要人手睇")
    if args.dry_run:
        print("（dry run，冇改過任何嘢）")
        return

    ok = 0
    for p, new in todo:
        out = gql(RENAME, {"input": {"id": p["id"], "title": new}})
        errs = out["productUpdate"]["userErrors"]
        if errs:
            print(f"  ✗ {p['handle']}: {errs}")
        else:
            ok += 1
    print(f"\n改好 {ok} 件")


if __name__ == "__main__":
    main()
