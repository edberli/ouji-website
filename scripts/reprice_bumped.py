#!/usr/bin/env python3
"""將已經加咗價嗰批改返做「打完 88 折 = 原本個售價」。

老闆 2026-08-27：「折咗會蝕本或者冇錢賺嗰啲，你就加價，折完之後就等於
而家原本個售價⋯⋯69 蚊，可能加到去 78 蚊，再打八八折，咁就變返 69 蚊。
因為我擔心而家你 72、73 嘅話，係貴過其他 HK 對手嘅價錢。」

即係：新標價 = POS 價 ÷ 0.88（四捨五入），唔係之前嗰個 ×1.2。

  python3 reprice_bumped.py --apply
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
DISCOUNT = 0.88
TARGETS = ["8809625241100", "8809625248406", "8809625248239", "8809625248420"]

FIND = """query($q:String!){products(first:20, query:$q){nodes{id title
  variants(first:60){nodes{id barcode title price inventoryQuantity}}}}}"""
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
        if b in TARGETS:
            pos[b] = r

    q = " OR ".join(f"barcode:{b}" for b in TARGETS)
    print(f"{'產品':<50}{'POS 價':>8}{'而家':>7}{'改做':>7}{'折後':>9}{'成本':>8}{'折後毛利':>9}")
    print("-" * 100)
    for p in gql(FIND, {"q": q})["products"]["nodes"]:
        todo = []
        for v in p["variants"]["nodes"]:
            b = (v["barcode"] or "").strip()
            if b not in pos:
                continue
            r = pos[b]
            base, cost = float(r["unit_price"]), float(r["unit_cost"])
            new = round(base / DISCOUNT)
            after = new * DISCOUNT
            name = f"{p['title'][:26]} {v['title'][:20]}"
            print(f"{name:<50}${base:>7.0f}${float(v['price']):>6.0f}${new:>6.0f}"
                  f"${after:>8.2f}${cost:>7.2f}{(after-cost)/after*100:>8.0f}%")
            todo.append({"id": v["id"], "price": f"{new:.2f}"})
        if todo and a.apply:
            d = gql(UPDATE, {"pid": p["id"], "v": todo})
            user_errors(d, "productVariantsBulkUpdate")
            print(f"   ✓ 改咗 {len(todo)} 個")
    if not a.apply:
        print("\n加 --apply 先會真係改。")


main()
