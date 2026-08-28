#!/usr/bin/env python3
"""上架 STUDIO 17 化妝掃／粉撲（39 件）。

圖源：**lilabeauty.com.au**（澳洲 K-beauty 零售，Shopify，
`/collections/studio17/products.json` 開放）—— 老闆 2026-08-28 揾到嘅。
我之前講「搵唔到」係查得太求其：官網封香港 IP、Olive Young 封住我哋，
我就用 Bing `site:stylekorean.com` 搜一次冇結果就當冇，冇再試第三個站。

⚠️ 呢度**唔用模糊夾名**。上一輪自動夾名將四件 Vitamin village 落咗
   同一張相，所以呢個表係逐件人手核對過嘅：英文名有掃頭型號
   （423／711／833…），同 POS 中文名一件一件對得返。夾唔到嘅寧願唔上。

  python3 add_studio17.py --apply
"""
import argparse
import csv
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa
from upload_files import upload  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
TMP = Path("/Volumes/core/ouji-ads/brandsrc/s17")
SRC = "https://lilabeauty.com.au/collections/studio17/products.json?limit=250"
LOCATION = "gid://shopify/Location/86449356958"
PUBS = ["gid://shopify/Publication/202340335774",
        "gid://shopify/Publication/202340466846",
        "gid://shopify/Publication/203168546974"]
DISCOUNT, FLOOR = 0.88, 0.15

# POS 條碼 → Lila 英文名（逐件核對過）
MAP = {
    "8809724701369": "Contouring Brush Set",
    "8809724700805": "Velvet Powder Brush 423",
    "8809724700812": "Velvet Powder Brush 423F",
    "8809724701338": "Glide Foundation Brush 411",
    "8809724700201": "Foundation Brush 823",
    "8809724700195": "Powder Brush 812",
    "8809724701239": "Pang Pang Big Puff",
    "8809724701383": "Pang Pang Triangle Puff",
    "8809724700218": "Blush Brush 833",
    "8809724700843": "Small Blush Brush 463",
    "8809724701222": "Chin Shading Brush 492",
    "8809724700874": "Angled Shading Brush 442",
    "8809724700867": "Nose Shading Brush 445",
    "8809724701208": "Concealer Brush 484",
    "8809724701215": "Spot Concealer Brush 474",
    "8809724701192": "Corrector & Concealer Brush 482",
    "8809724700904": "Eyebrow Brush 352",
    "8809724700911": "Screw Brush 365",
    "8809724700829": "Big Fan Brush 453",
    "8809724700836": "Small Fan Brush 463",
    "8809724700225": "Base Eyeshadow Brush 711",
    "8809724700232": "Blending Eye Brush 712",
    "8809724700881": "Small Blending Eye Brush 323",
    "8809724700256": "Detail Eye Defining Brush 721",
    "8809724700249": "Point Eye Smudge Brush 713",
    "8809724700898": "Small Smudge Brush 321",
    "8809724701277": "Portable Lip Brush 223 Round Type",
    "8809724701260": "Portable Lip Brush 211 Flat Type",
    "8809724701376": "Silicone Lip Brush",
    "8809724700386": "Makeup Spatula",
    "8809724700379": "Makeup Tweezer Duo",
    "8809724702151": "Brush-Fit Puff (5 pc)",
    "8809724701093": "Portable Makeup Brush Set (6pcs)",
    "8809724700300": "Eye Makeup Brush Set (5 pcs)",
    "8809724701604": "Skin Fit Base Makeup Kit (Puff 4pc + Foundation Brush 1pc)",
    "880SG00001532": "Brush & Puff Cleanser Pad",
}
# 冇對應嘅（Lila 冇上）：雙頭矽膠胭脂掃、化妝掃及粉撲清潔液

FIND = 'query($q:String!){products(first:3, query:$q){nodes{id handle}}}'
CREATE = """mutation($p:ProductCreateInput!){
  productCreate(product:$p){product{id handle variants(first:1){nodes{id inventoryItem{id}}}}
    userErrors{field message}}}"""
VUP = """mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$pid, variants:$v){userErrors{field message}}}"""
QTY = """mutation($in:InventorySetQuantitiesInput!){
  inventorySetQuantities(input:$in){userErrors{field message}}}"""
MEDIA = """mutation($id:ID!,$m:[CreateMediaInput!]!){
  productCreateMedia(productId:$id, media:$m){mediaUserErrors{field message}}}"""
PUBLISH = """mutation($id:ID!,$in:[PublicationInput!]!){
  publishablePublish(id:$id, input:$in){userErrors{field message}}}"""
ACTIVATE = """mutation($id:ID!,$d:String!){
  productUpdate(product:{id:$id,status:ACTIVE,descriptionHtml:$d}){userErrors{field message}}}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    TMP.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(SRC, headers={"User-Agent": "Mozilla/5.0"})
    lila = {p["title"]: p for p in json.load(urllib.request.urlopen(req, timeout=60))["products"]}
    pos = {}
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        b = (r.get("barcode") or "").strip()
        if b:
            pos[b] = r

    todo = []
    for bc, title in MAP.items():
        r, src = pos.get(bc), lila.get(title)
        if not r:
            print(f"  ✗ POS 冇 {bc}"); continue
        if not src or not src.get("images"):
            print(f"  ✗ Lila 冇「{title}」或者冇圖"); continue
        if float(r.get("stock_qty") or 0) <= 0:
            continue
        price, cost = float(r["unit_price"]), float(r["unit_cost"] or 0)
        after = price * DISCOUNT
        bumped = (after - cost) / after < FLOOR if after else False
        if bumped:
            price = round(price / DISCOUNT)
        todo.append((bc, r, src, price, bumped))

    print(f"\n準備上 {len(todo)} 件：")
    for bc, r, src, price, bumped in todo:
        m = (price * DISCOUNT - float(r["unit_cost"] or 0)) / (price * DISCOUNT) * 100
        print(f"  {r['name'][:34]:<36}${price:<5.0f}{'（加價）' if bumped else '      '}"
              f"存{r['stock_qty']:>3}  折後毛利 {m:.0f}%  ← {src['title'][:34]}")
    if not a.apply:
        print("\n加 --apply 先會真係上。")
        return

    made = 0
    for bc, r, src, price, bumped in todo:
        if gql(FIND, {"q": f"barcode:{bc}"})["products"]["nodes"]:
            print(f"  ↷ 已經有 {r['name'][:30]}"); continue
        files = []
        for i, im in enumerate(src["images"][:5], 1):
            try:
                data = urllib.request.urlopen(urllib.request.Request(
                    im["src"], headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read()
                f = TMP / f"{bc}-{i:02d}.jpg"
                f.write_bytes(data)
                files.append(f)
            except Exception:
                pass
        if not files:
            print(f"  ✗ 落唔到圖 {r['name'][:30]}"); continue

        d = gql(CREATE, {"p": {
            "title": r["name"].strip(),
            "vendor": "STUDIO 17",
            "productType": "化妝工具",
            "status": "DRAFT",
            "tags": ["STUDIO 17", "K-Beauty", "brush", "makeup", "化妝工具", "彩妝", "工具"],
        }})
        user_errors(d, "productCreate")
        p = d["productCreate"]["product"]
        v = p["variants"]["nodes"][0]
        user_errors(gql(VUP, {"pid": p["id"], "v": [{
            "id": v["id"], "barcode": bc, "price": f"{price:.2f}",
            "inventoryItem": {"sku": bc, "tracked": True,
                              "cost": f"{float(r['unit_cost'] or 0):.2f}"}}]}),
            "productVariantsBulkUpdate")
        user_errors(gql(QTY, {"in": {"name": "available", "reason": "correction",
                                     "ignoreCompareQuantity": True,
                                     "quantities": [{"inventoryItemId": v["inventoryItem"]["id"],
                                                     "locationId": LOCATION,
                                                     "quantity": int(float(r["stock_qty"]))}]}}),
                    "inventorySetQuantities")
        urls = [upload(str(f)) for f in files]
        gql(MEDIA, {"id": p["id"], "m": [{"originalSource": u, "mediaContentType": "IMAGE",
                                          "alt": r["name"].strip()} for u in urls]})
        desc = (f"<p><strong>{r['name'].strip()}</strong></p>"
                f"<p>STUDIO 17 化妝工具，韓國製。</p>"
                f"<ul><li>型號／英文名：{src['title']}</li>"
                f"<li>品牌：STUDIO 17</li></ul>")
        user_errors(gql(ACTIVATE, {"id": p["id"], "d": desc}), "productUpdate")
        user_errors(gql(PUBLISH, {"id": p["id"],
                                  "in": [{"publicationId": x} for x in PUBS]}), "publishablePublish")
        made += 1
        print(f"  ✓ {r['name'][:34]:<36}${price:.0f} 存{r['stock_qty']} 圖{len(files)}")
    print(f"\n上咗 {made} 件。")


main()
