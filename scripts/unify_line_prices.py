#!/usr/bin/env python3
"""同一條產品線，所有色號劃一個價。

老闆 2026-08-27：「同一款產品但係唔同色號，所以你一改，就要成個產品線
一齊改。如果唔係，你就會一啲產品平啲、一啲產品貴啲。」

## 個窿係點嚟
加價規矩本來係**逐個色號**睇成本 —— 成本高嘅色號先加。結果同一支唇膏
3 個色號 $78、7 個色號 $69。實測掃全店，11 條產品線中招，而且**每一條
線嘅 POS 價本身都係同一個價**，即係話啲差價全部係我哋自己加出嚟嘅。

## 做法
一條線只要有**任何一個**色號喺 88 折之後毛利低過 15%，成條線一齊調到
  標價 = round(POS 價 ÷ 0.88)
咁樣每個色號打完折都係 POS 價，成條線同價。

⚠️ 順手修埋舊版「×1.2」留低嘅過高價：WAKEMAKE 粉底液 $213、Maybelline
眼線筆 $108、花知曉 手持鏡 $96 —— 呢啲打完折仲貴過 POS 價，老闆講過
會貴過香港對手。

  python3 unify_line_prices.py --apply
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
DISCOUNT, FLOOR = 0.88, 0.15

LIST = """query($c:String){products(first:100, after:$c, query:"status:ACTIVE"){
  pageInfo{hasNextPage endCursor}
  nodes{id title variants(first:60){nodes{id title barcode price
    inventoryItem{unitCost{amount}}}}}}}"""
UPDATE = """mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$pid, variants:$v){
    productVariants{barcode price} userErrors{field message}}}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    pos = {}
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        b = (r.get("barcode") or "").strip()
        if b:
            pos[b] = r

    c, hits, n_var = None, [], 0
    while True:
        d = gql(LIST, {"c": c})["products"]
        for p in d["nodes"]:
            vs = [v for v in p["variants"]["nodes"] if (v["barcode"] or "").strip() in pos]
            if len(vs) < 2:
                continue
            base = {float(pos[v["barcode"].strip()]["unit_price"] or 0) for v in vs}
            if len(base) != 1:
                continue                      # POS 本身唔同價，唔關加價事，唔郁
            base = base.pop()
            costs = [float((v["inventoryItem"]["unitCost"] or {}).get("amount") or 0) for v in vs]
            thin = any((base * DISCOUNT - c2) / (base * DISCOUNT) < FLOOR
                       for c2 in costs if base)
            target = round(base / DISCOUNT) if thin else base
            if all(abs(float(v["price"]) - target) < 0.01 for v in vs):
                continue
            hits.append((p, vs, base, target))
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]

    for p, vs, base, target in hits:
        print(f"\n{p['title'][:44]}")
        print(f"   POS ${base:.0f} → 全線標價 ${target:.0f}，打完 88 折 ${target*DISCOUNT:.2f}")
        todo = []
        for v in sorted(vs, key=lambda x: x["title"]):
            cost = float((v["inventoryItem"]["unitCost"] or {}).get("amount") or 0)
            cur = float(v["price"])
            m = (target * DISCOUNT - cost) / (target * DISCOUNT) * 100
            mark = f"${cur:.0f} → ${target:.0f}" if abs(cur - target) >= 0.01 else "冇變"
            print(f"   {v['title'][:24]:<26}成本 ${cost:>7.2f}  折後毛利 {m:>3.0f}%   {mark}")
            if abs(cur - target) >= 0.01:
                todo.append({"id": v["id"], "price": f"{target:.2f}"})
        n_var += len(todo)
        if todo and a.apply:
            d = gql(UPDATE, {"pid": p["id"], "v": todo})
            user_errors(d, "productVariantsBulkUpdate")
            print(f"   ✓ 改咗 {len(todo)} 個")
    print(f"\n{len(hits)} 條產品線、{n_var} 個色號要改。")
    if not a.apply:
        print("加 --apply 先會真係改。")


main()
