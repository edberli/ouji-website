#!/usr/bin/env python3
"""88 折 promo 完之後，將加咗價嗰批調返落 POS 價。

## 點解要
全店 88 折期間，**折後毛利低過 15% 嗰啲產品線**嘅標價加咗做
`round(POS 價 ÷ 0.88)`，等打完折啱啱等於 POS 價（老闆 2026-08-27 定）。
Promo 一完，個折冇咗但標價仲係高咗 13% —— 就變成真係貴過香港對手。
所以 promo 最後一日之後一定要調返。

## 兩個模式
  restore_prices.py --snapshot   掃全店，將所有「網店價 > POS 價」嘅變體
                                 寫落 data/price-uplift.json
  restore_prices.py              睇計劃（唔改嘢）
  restore_prices.py --apply      照張表調返落 POS 價

⚠️ 調返嗰陣會**重新讀 POS**，唔係照抄快照入面嗰個舊價 —— 中間如果鋪頭
   改過價，要跟新價，唔可以拉返舊價。POS 價變咗會喺報告標出嚟。

⚠️ 呢個 script 只郁價錢。**個 88 折本身要另外喺 Shopify 熄** —— 兩樣
   嘢，唔好以為跑咗呢個就搞掂。
"""
import argparse
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
TABLE = Path(__file__).parent.parent / "data" / "price-uplift.json"

LIST = """query($c:String){products(first:100, after:$c){
  pageInfo{hasNextPage endCursor}
  nodes{id title variants(first:60){nodes{id title barcode price}}}}}"""
UPDATE = """mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$pid, variants:$v){
    productVariants{barcode price} userErrors{field message}}}"""


def pos_prices():
    d = {}
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        b = (r.get("barcode") or "").strip()
        if b:
            d[b] = float(r["unit_price"] or 0)
    return d


def snapshot():
    pos = pos_prices()
    rows, c = [], None
    while True:
        d = gql(LIST, {"c": c})["products"]
        for p in d["nodes"]:
            for v in p["variants"]["nodes"]:
                b = (v["barcode"] or "").strip()
                if not b or b not in pos or pos[b] <= 0:
                    continue
                if float(v["price"]) > pos[b] + 0.01:
                    rows.append({"barcode": b, "product": p["title"], "variant": v["title"],
                                 "uplifted": float(v["price"]), "pos_at_snapshot": pos[b]})
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    TABLE.parent.mkdir(parents=True, exist_ok=True)
    TABLE.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = {r["product"] for r in rows}
    print(f"寫好 {TABLE}：{len(rows)} 個變體、{len(lines)} 條產品線")


def restore(apply_):
    if not TABLE.exists():
        sys.exit("✗ 未有 data/price-uplift.json —— 先跑 --snapshot")
    table = json.loads(TABLE.read_text(encoding="utf-8"))
    pos = pos_prices()
    want = {}
    changed_pos = []
    for r in table:
        b = r["barcode"]
        now = pos.get(b)
        if not now:
            print(f"  ⚠️ POS 已經冇 {b}（{r['product'][:24]} {r['variant'][:16]}）—— 跳過")
            continue
        if abs(now - r["pos_at_snapshot"]) > 0.01:
            changed_pos.append((r, now))
        want[b] = now
    rows, c = [], None
    todo = {}
    while True:
        d = gql(LIST, {"c": c})["products"]
        for p in d["nodes"]:
            for v in p["variants"]["nodes"]:
                b = (v["barcode"] or "").strip()
                if b in want and abs(float(v["price"]) - want[b]) > 0.01:
                    todo.setdefault(p["id"], []).append(
                        (v, want[b], p["title"], float(v["price"])))
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    n = sum(len(x) for x in todo.values())
    print(f"要調返 {n} 個變體、{len(todo)} 條產品線")
    if changed_pos:
        print(f"\n⚠️ 中間 POS 改過價嘅 {len(changed_pos)} 個（跟新價，唔跟快照）：")
        for r, now in changed_pos[:20]:
            print(f"   {r['product'][:26]:<28}{r['variant'][:16]:<18}"
                  f"快照 ${r['pos_at_snapshot']:.0f} → 而家 ${now:.0f}")
    for pid, vs in todo.items():
        print(f"\n{vs[0][2][:44]}")
        for v, target, _t, cur in vs:
            print(f"   {v['title'][:24]:<26}${cur:.0f} → ${target:.0f}")
        if apply_:
            d = gql(UPDATE, {"pid": pid, "v": [
                {"id": v["id"], "price": f"{t:.2f}"} for v, t, _, _ in vs]})
            user_errors(d, "productVariantsBulkUpdate")
            print(f"   ✓ 調咗 {len(vs)} 個")
    if not apply_:
        print("\n加 --apply 先會真係改。")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", action="store_true")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    if a.snapshot:
        snapshot()
    else:
        restore(a.apply)


main()
