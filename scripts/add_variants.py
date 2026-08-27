#!/usr/bin/env python3
"""將 POS 有貨、但網店現有產品未有嘅色號，加返做變體。

價錢規矩（老闆 2026-08-27 定）：
  「折咗之後蝕本嘅⋯⋯加 20% 嘅售價。」
  → 88 折之後毛利低過 15% 就將標價 ×1.2，其餘照跟 POS 價。
  （88 折係全店 promo，做到 9 月 15 日）

  python3 add_variants.py --apply
"""
import argparse
import csv
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
LOCATION = "gid://shopify/Location/86449356958"
DISCOUNT = 0.88
FLOOR = 0.15          # 折後毛利低過呢個數就加價
BUMP = 1.20

# handle → [(barcode, 色號名)]
PLAN = {
    "romand-juicy-lasting-tint": [
        ("8800258080142", "#09 Mulled Peach"),
        ("8800258080654", "#19 Summer Scent"),
    ],
    "romand-better-than-palette": [
        ("8809625243098", "#01 Pampas Garden"),
    ],
    "romand-glasting-color-gloss": [
        ("8809625248796", "01 Peony Ballet"),
        ("8809625248802", "02 Nutty Vague"),
        ("8809625248833", "05 Dim Mauve"),
        ("8809625248840", "06 Deepen Moor"),
    ],
    "romand-blur-fudge-tint": [
        ("8809625244453", "#01 Pomeloco"),
    ],
    "romand-better-than-eyes-music": [
        ("8809625241100", "M02 Dry Buckwheat Flower"),
    ],
}

FIND = """query($h:String!){products(first:1, query:$h){nodes{id handle title
  options{id name} variants(first:60){nodes{barcode}}}}}"""
CREATE = """mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkCreate(productId:$pid, variants:$v){
    productVariants{id title barcode price inventoryItem{id}}
    userErrors{field message}}}"""
SET_QTY = """mutation($in:InventorySetQuantitiesInput!){
  inventorySetQuantities(input:$in){userErrors{field message}}}"""


def load_pos():
    d = {}
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        b = (r.get("barcode") or "").strip()
        if b:
            d[b] = r
    return d


def priced(price, cost):
    """回傳 (標價, 有冇加過價, 折後毛利%)"""
    after = price * DISCOUNT
    m = (after - cost) / after if after else 0
    if m < FLOOR:
        new = math.ceil(price * BUMP)
        return new, True, (new * DISCOUNT - cost) / (new * DISCOUNT)
    return price, False, m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    pos = load_pos()
    bumped = []

    for handle, shades in PLAN.items():
        p = gql(FIND, {"h": f"handle:{handle}"})["products"]["nodes"]
        if not p:
            print(f"✗ 揾唔到 {handle}"); continue
        p = p[0]
        have = {(v["barcode"] or "").strip() for v in p["variants"]["nodes"]}
        opt = p["options"][0]
        todo = []
        for bc, name in shades:
            if bc in have:
                print(f"  ↷ {handle} 已經有 {name}"); continue
            r = pos.get(bc)
            if not r:
                print(f"  ✗ POS 冇 {bc}（{name}）"); continue
            price, was, m = priced(float(r["unit_price"]), float(r["unit_cost"] or 0))
            if was:
                bumped.append((name, float(r["unit_price"]), price, m))
            todo.append((bc, name, price, float(r["unit_cost"] or 0),
                         max(int(float(r["stock_qty"] or 0)), 0), was, m))
        if not todo:
            continue
        print(f"\n{p['title'][:38]}（{handle}）")
        for bc, name, price, cost, qty, was, m in todo:
            print(f"  + {name:<22}${price:<6.0f}{'（加咗價）' if was else '        '}"
                  f"存{qty:<4}折後毛利 {m*100:.0f}%")
        if not a.apply:
            continue
        d = gql(CREATE, {"pid": p["id"], "v": [{
            "barcode": bc,
            "price": f"{price:.2f}",
            "optionValues": [{"optionId": opt["id"], "name": name}],
            "inventoryItem": {"sku": bc, "tracked": True, "cost": f"{cost:.2f}"},
        } for bc, name, price, cost, qty, was, m in todo]})
        user_errors(d, "productVariantsBulkCreate")
        made = d["productVariantsBulkCreate"]["productVariants"]
        by_bc = {v["barcode"]: v for v in made}
        q = [{"inventoryItemId": by_bc[bc]["inventoryItem"]["id"],
              "locationId": LOCATION, "quantity": qty}
             for bc, name, price, cost, qty, was, m in todo if bc in by_bc]
        if q:
            d = gql(SET_QTY, {"in": {"name": "available", "reason": "correction",
                                     "ignoreCompareQuantity": True, "quantities": q}})
            user_errors(d, "inventorySetQuantities")
        print(f"  ✓ 加咗 {len(made)} 個色號")

    if bumped:
        print(f"\n加咗價嘅（88 折後毛利本來低過 {FLOOR*100:.0f}%）：")
        for n, old, new, m in bumped:
            print(f"  {n:<24}${old:.0f} → ${new:.0f}（折後毛利變 {m*100:.0f}%）")
    if not a.apply:
        print("\n加 --apply 先會真係寫落 Shopify。")


main()
