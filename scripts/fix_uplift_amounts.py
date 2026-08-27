#!/usr/bin/env python3
"""將所有加咗價嘅變體，校準到「打完 88 折 = POS 價」。

老闆 2026-08-27：「之前加咗價嗰啲，你幫我改到減價之後等於原價。」

實測 134 個加咗價嘅變體入面：
  102 個已經啱（折後 = POS 價）
   10 個加多咗 —— 折後**貴過** POS，即係貴過香港對手（最誇張 Torriden
      面霜孖裝 POS $220、標 $268、折後 $235.84）
   22 個加唔夠 —— 折後仲平過 POS，即係我哋自己食緊個折扣

一律校準做 round(POS 價 ÷ 0.88)。

  python3 fix_uplift_amounts.py --apply
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
DISCOUNT = 0.88
LIST = """query($c:String){products(first:100, after:$c){
  pageInfo{hasNextPage endCursor}
  nodes{id title variants(first:60){nodes{id title barcode price}}}}}"""
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
            pos[b] = float(r["unit_price"] or 0)

    c, todo, up, down = None, {}, 0, 0
    while True:
        d = gql(LIST, {"c": c})["products"]
        for p in d["nodes"]:
            for v in p["variants"]["nodes"]:
                b = (v["barcode"] or "").strip()
                base = pos.get(b, 0)
                cur = float(v["price"])
                if not base or cur <= base + 0.01:
                    continue                       # 冇加過價嘅唔郁
                want = round(base / DISCOUNT)
                if abs(cur - want) < 0.51:
                    continue
                todo.setdefault((p["id"], p["title"]), []).append((v, cur, want, base))
                if want > cur:
                    up += 1
                else:
                    down += 1
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]

    n = sum(len(x) for x in todo.values())
    print(f"要校準 {n} 個變體（調高 {up}、調低 {down}）\n")
    for (pid, title), vs in todo.items():
        print(f"{title[:44]}")
        for v, cur, want, base in vs:
            print(f"   {v['title'][:18]:<20}POS ${base:>5.0f}   ${cur:>5.0f} → ${want:>5.0f}"
                  f"   折後 ${want*DISCOUNT:>7.2f}")
        if a.apply:
            d = gql(UPDATE, {"pid": pid, "v": [
                {"id": v["id"], "price": f"{w:.2f}"} for v, c2, w, b2 in vs]})
            user_errors(d, "productVariantsBulkUpdate")
            print(f"   ✓ 改咗 {len(vs)} 個")
    if not a.apply:
        print("\n加 --apply 先會真係改。")


main()
