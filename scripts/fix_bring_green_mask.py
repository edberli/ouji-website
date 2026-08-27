#!/usr/bin/env python3
"""補上 Bring Green 癒肌修復紓敏精華面膜(5片)，兼修好一碼兩貨。

## 個窿
觀塘 POS 有兩件 5 片裝面膜共用同一個「主條碼」880984980470040
（15 位，唔係 EAN-13，係 POS 內部碼）：

  000000000026249  深層補濕精華面膜(5片)      存 2
  000000000026250  癒肌修復紓敏精華面膜(5片)   存 11   ← 網店一直冇

兩件都有貨，所以同步 script 嗰條「有存貨嗰個先係真」規則judge唔到，
而網店嗰件「深層補濕」掛住呢個共用碼 —— 即係話存貨數有機會寫錯，
而 11 件嘅癒肌修復根本上唔到架。

## 真身份（由「每件貨所有條碼」對照表挖返出嚟）
兩件貨各自都有一個**真 EAN-13 副條碼**，檢查碼都過：

  8809849804761 → 深層補濕（外部核實：akwg.com.tw 同 myprincessyoyo.com
                  都掛住呢個碼，係 Hyal Jet 嗰款）
  8809849804792 → 癒肌修復（外部核實：Q-depot 批發站掛住呢個碼，
                  英文名 Bring Green Cera Healer Deep Moisturizing
                  Serum Mask 20g*5ea；Cera Healer = 癒肌修復）

所以：網店嗰件改用 …4761，新開嗰件用 …4792，一碼兩貨自然解開。

  python3 fix_bring_green_mask.py --apply
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa
from upload_files import upload  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
LOCATION = "gid://shopify/Location/86449356958"
PUBLICATIONS = ["gid://shopify/Publication/202340335774",
                "gid://shopify/Publication/202340466846",
                "gid://shopify/Publication/203168546974"]
IMG = Path(__file__).parent.parent / "brands" / "bring-green" / "cera-healer-mask-5-01.jpg"

OLD_SHARED = "880984980470040"
HYALJET = "8809849804761"
CERA = "8809849804792"

DESC = """<p><strong>Cera Healer 系列，補水同時顧住屏障。</strong></p>
<p>Bring Green Cera Healer 精華面膜，配方主打神經醯胺 NP（Ceramide NP）同 Ectoin，
針對乾燥、容易繃緊嘅肌膚急速補濕。微纖維面膜布服貼，一盒 5 片。</p>
<h3>優點</h3><ul>
<li>神經醯胺 NP —— 針對屏障脆弱、乾燥嘅肌膚</li>
<li>Ectoin 補濕成分</li>
<li>微纖維面膜布，敷落服貼唔易跌</li>
<li>單片 23g，一盒 5 片</li></ul>
<h3>用法</h3><p>潔面爽膚之後敷上面膜，停留 15-20 分鐘，撕走面膜後將餘下精華輕輕拍打至吸收。</p>
<ul><li>品牌：Bring Green</li>
<li>包裝標示：CERA HEALER DEEP MOISTURIZING SERUM MASK</li></ul>"""

FIND_BC = 'query($q:String!){products(first:5, query:$q){nodes{id handle title status ' \
          'variants(first:10){nodes{id barcode}}}}}'
VUPDATE = """mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$pid, variants:$v){
    productVariants{id barcode} userErrors{field message}}}"""
CREATE = """mutation($p:ProductCreateInput!){
  productCreate(product:$p){product{id handle status
    variants(first:1){nodes{id inventoryItem{id}}}} userErrors{field message}}}"""
SET_QTY = """mutation($in:InventorySetQuantitiesInput!){
  inventorySetQuantities(input:$in){userErrors{field message}}}"""
ADD_MEDIA = """mutation($id:ID!,$m:[CreateMediaInput!]!){
  productCreateMedia(productId:$id, media:$m){media{... on MediaImage{id}}
    mediaUserErrors{field message}}}"""
PUBLISH = """mutation($id:ID!,$in:[PublicationInput!]!){
  publishablePublish(id:$id, input:$in){userErrors{field message}}}"""


def pos_row(barcode_or_name):
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        if (r["name"] or "").strip() == barcode_or_name:
            return r
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    row = pos_row("Bring Green-癒肌修復紓敏精華面膜(5片)")
    if not row:
        sys.exit("✗ POS 揾唔到癒肌修復紓敏精華面膜(5片)")
    price, qty = float(row["unit_price"]), max(int(float(row["stock_qty"] or 0)), 0)
    cost = float(row["unit_cost"] or 0)
    print(f"POS：${price:.0f}｜存 {qty}｜成本 ${cost:.2f}｜毛利 {(price-cost)/price*100:.1f}%")

    old = gql(FIND_BC, {"q": f"barcode:{OLD_SHARED}"})["products"]["nodes"]
    print(f"掛住舊共用碼嘅網店產品：{[(p['handle'], p['title']) for p in old]}")
    dup = gql(FIND_BC, {"q": f"barcode:{CERA}"})["products"]["nodes"]
    if dup:
        print(f"↷ 已經有 {dup[0]['handle']}，唔使再開")
    if not a.apply:
        print("\n加 --apply 先會真係改。")
        return

    # 1) 舊嗰件改用佢自己嘅真 EAN-13
    for p in old:
        v = [x for x in p["variants"]["nodes"] if (x["barcode"] or "").strip() == OLD_SHARED]
        d = gql(VUPDATE, {"pid": p["id"],
                          "v": [{"id": x["id"], "barcode": HYALJET} for x in v]})
        user_errors(d, "productVariantsBulkUpdate")
        print(f"✓ {p['handle']} 條碼 {OLD_SHARED} → {HYALJET}")

    if dup:
        return
    # 2) 開返癒肌修復嗰件
    d = gql(CREATE, {"p": {
        "handle": "bring-green-cera-healer-serum-mask-5",
        "title": "Bring Green 癒肌修復紓敏精華面膜 (5片)",
        "descriptionHtml": DESC,
        "vendor": "Bring Green",
        "productType": "面膜",
        "status": "DRAFT",
        "tags": ["Bring Green", "K-Beauty", "mask", "skincare", "護膚", "面膜"],
    }})
    user_errors(d, "productCreate")
    p = d["productCreate"]["product"]
    v = p["variants"]["nodes"][0]

    d = gql(VUPDATE, {"pid": p["id"], "v": [{
        "id": v["id"], "barcode": CERA,
        "price": f"{price:.2f}",
        "inventoryItem": {"sku": CERA, "tracked": True, "cost": f"{cost:.2f}"},
    }]})
    user_errors(d, "productVariantsBulkUpdate")

    d = gql(SET_QTY, {"in": {"name": "available", "reason": "correction",
                             "ignoreCompareQuantity": True,
                             "quantities": [{"inventoryItemId": v["inventoryItem"]["id"],
                                             "locationId": LOCATION, "quantity": qty}]}})
    user_errors(d, "inventorySetQuantities")

    d = gql(ADD_MEDIA, {"id": p["id"], "m": [{
        "originalSource": upload(str(IMG)), "mediaContentType": "IMAGE",
        "alt": "Bring Green 癒肌修復紓敏精華面膜 5片"}]})
    errs = d["productCreateMedia"]["mediaUserErrors"]
    if errs:
        print("✗ 相", errs)

    d = gql(PUBLISH, {"id": p["id"],
                      "in": [{"publicationId": x} for x in PUBLICATIONS]})
    user_errors(d, "publishablePublish")
    d = gql("""mutation($id:ID!){productUpdate(product:{id:$id,status:ACTIVE}){
      product{status} userErrors{field message}}}""", {"id": p["id"]})
    user_errors(d, "productUpdate")
    print(f"✓ 開咗 {p['handle']}｜${price:.0f}｜存 {qty}｜已上架")


main()
