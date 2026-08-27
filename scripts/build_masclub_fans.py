#!/usr/bin/env python3
"""上架觀塘店嗰批日本 Masclub 便攜風扇。

資料源：觀塘 POS（`Ouji_KT_skus_prince.csv` ＋ `Ouji_KT_desc_kwantong.csv`）。
唔係人手抄 —— 條碼、價錢、存貨全部由 CSV 讀返嚟，改咗 POS 再跑一次就跟得上。

⚠️ 三件都冇相。POS 冇圖，`name2` 寫住「//淘」即係淘寶入貨，官網圖唔一定
   係同一件貨（老闆規矩：認貨要靠條碼，唔係靠個名夾），所以唔准夾硬用
   官網相。開成 DRAFT ＋ 掛「待補相」標籤，補咗相撕走標籤就會自己上架。

   ⚠️⚠️ 個標籤唔係做樣 —— `sync_shopify_stock.py` 見到 DRAFT ＋ 有存貨
   就會第二朝自動 ACTIVE。冇呢個標籤，呢三件會冇聲冇氣上咗架，客見到
   三格白色冇相嘅產品。

  python3 build_masclub_fans.py            # 睇計劃
  python3 build_masclub_fans.py --apply    # 真係建立
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
LOCATION = "gid://shopify/Location/86449356958"
HOLD_TAG = "待補相"

# 條碼係身份證。標題、賣點喺呢度寫死，數字（價錢、存貨）一律由 POS 攞。
FANS = [
    {
        "barcode": "4580718566112",
        "handle": "masclub-handheld-fan-phone-stand",
        "title": "Masclub 手持風扇（可放手機）",
        "hook": "手拎住吹，放低就變手機座。",
        "body": "日本 Masclub 便攜風扇。手拎住吹得，放喺枱面又可以夾住部手機 —— "
                "煲劇、睇片唔使一直托住。",
        "bullets": ["<strong>手持／座枱兩用</strong>——出街手拎，返到屋企放低照吹。",
                    "<strong>機身可以放手機</strong>——當手機座用，唔使再買多件嘢。",
                    "<strong>細部輕便</strong>——袋袋得，返工返學都帶得走。"],
    },
    {
        "barcode": "4580718566099",
        "handle": "masclub-cooling-handheld-fan",
        "title": "Masclub 制冷手拎風扇",
        "hook": "唔止吹風，仲有製冷片。",
        "body": "日本 Masclub 便攜風扇，機身有製冷片 —— 除咗吹風，貼住頸或者手腕仲有"
                "實體嘅冰涼感，香港嘅濕熱天先至頂用。",
        "bullets": ["<strong>製冷片</strong>——貼住皮膚係真係涼，唔淨係吹風。",
                    "<strong>手拎式</strong>——等車、行街隨時攞出嚟。",
                    "<strong>三件之中最大風</strong>——貴嗰啲錢係買呢舊嘢。"],
    },
    {
        "barcode": "4580718567126",
        "handle": "masclub-neck-fan",
        "title": "Masclub 頸掛式風扇",
        "hook": "掛住個頸，兩隻手騰空。",
        "body": "日本 Masclub 頸掛式風扇。掛喺頸上面自己吹，唔使揸住 —— "
                "推 BB 車、拎住袋、行山影相嗰陣最實際。",
        "bullets": ["<strong>唔使揸住</strong>——兩隻手做返自己嘅嘢。",
                    "<strong>掛頸設計</strong>——風口對住面同頸。",
                    "<strong>三件之中最平</strong>——想試下頸掛式由呢款入手。"],
    },
]

NOTE = ('<p><strong>顏色：</strong>多色隨機出貨。想指定顏色可以喺落單時備註，'
        '我哋會盡量配合，但唔保證一定有貨。</p>'
        '<p><strong>現貨：</strong>觀塘店。詳細規格以實物包裝為準。</p>')

CREATE = """
mutation($p:ProductCreateInput!){
  productCreate(product:$p){
    product{id handle title status
      variants(first:1){nodes{id inventoryItem{id}}}}
    userErrors{field message}}}"""

VUPDATE = """
mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$pid, variants:$v){
    productVariants{id sku barcode price}
    userErrors{field message}}}"""

SET_QTY = """
mutation($in:InventorySetQuantitiesInput!){
  inventorySetQuantities(input:$in){userErrors{field message}}}"""

FIND = """query($q:String!){products(first:5, query:$q){nodes{id handle title status}}}"""

# 🔴 productCreate 開出嚟嘅貨，一個銷售管道都唔會 publish
#    （resourcePublicationsCount = 0）。即係話就算 status ACTIVE，
#    個網站（ouji Headless）用 Storefront API 都攞唔到，等於冇上架。
#    實測就係咁：三件貨 ACTIVE 咗，oujikbeauty.com 一件都見唔到。
PUBLICATIONS = [
    "gid://shopify/Publication/202340335774",   # Online Store
    "gid://shopify/Publication/202340466846",   # ouji Headless ← 網站靠呢個
    "gid://shopify/Publication/203168546974",   # Shop
]

PUBLISH = """
mutation($id:ID!,$in:[PublicationInput!]!){
  publishablePublish(id:$id, input:$in){userErrors{field message}}}"""


def load_pos():
    d = {}
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        bc = (r.get("barcode") or "").strip()
        if bc:
            d[bc] = r
    return d


def desc(f):
    lis = "".join(f"<li>{b}</li>" for b in f["bullets"])
    return (f"<p><strong>{f['hook']}</strong></p><p>{f['body']}</p>"
            f"<ul>{lis}</ul>{NOTE}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    pos = load_pos()

    plan = []
    for f in FANS:
        r = pos.get(f["barcode"])
        if not r:
            print(f"✗ POS 冇 {f['barcode']}（{f['title']}）—— 唔建立")
            continue
        exists = gql(FIND, {"q": f"barcode:{f['barcode']}"})["products"]["nodes"]
        if exists:
            print(f"↷ 已經有：{exists[0]['handle']}（{exists[0]['status']}）—— 跳過")
            continue
        plan.append((f, r))

    print(f"\n準備建立 {len(plan)} 件（全部 DRAFT ＋「{HOLD_TAG}」）：")
    for f, r in plan:
        cost = float(r["unit_cost"] or 0)
        price = float(r["unit_price"] or 0)
        margin = (price - cost) / price * 100 if price else 0
        print(f"  {f['title']:<26} ${price:<6.0f} 存{r['stock_qty']:>3}  "
              f"成本 ${cost:<6.2f} 毛利 {margin:.1f}%  "
              f"88折後 ${price*0.88:.2f}（毛利 {(price*0.88-cost)/(price*0.88)*100:.1f}%）")
    if not a.apply:
        print("\n加 --apply 先會真係建立。")
        return

    for f, r in plan:
        d = gql(CREATE, {"p": {
            "handle": f["handle"],
            "title": f["title"],
            "descriptionHtml": desc(f),
            "vendor": "Masclub",
            "productType": "便攜風扇",
            "status": "DRAFT",
            "tags": ["Masclub", "lifestyle", "生活風格", "風扇", "季節性",
                     "日本", HOLD_TAG],
        }})
        user_errors(d, "productCreate")
        p = d["productCreate"]["product"]
        v = p["variants"]["nodes"][0]

        d = gql(VUPDATE, {"pid": p["id"], "v": [{
            "id": v["id"],
            "barcode": f["barcode"],
            "price": str(float(r["unit_price"])),
            "inventoryItem": {"sku": f["barcode"], "tracked": True,
                              "cost": str(float(r["unit_cost"] or 0))},
        }]})
        user_errors(d, "productVariantsBulkUpdate")

        qty = max(int(float(r["stock_qty"] or 0)), 0)
        d = gql(SET_QTY, {"in": {
            "name": "available", "reason": "correction", "ignoreCompareQuantity": True,
            "quantities": [{"inventoryItemId": v["inventoryItem"]["id"],
                            "locationId": LOCATION, "quantity": qty}],
        }})
        user_errors(d, "inventorySetQuantities")

        d = gql(PUBLISH, {"id": p["id"],
                          "in": [{"publicationId": x} for x in PUBLICATIONS]})
        user_errors(d, "publishablePublish")
        print(f"✓ {p['handle']}  ${float(r['unit_price']):.0f}  存 {qty}  [{p['status']}]")


main()
