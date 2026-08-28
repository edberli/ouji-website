#!/usr/bin/env python3
"""照 lila_match.json 上架 —— 每一單都係人手睇過 contact sheet 先跑。

老闆 2026-08-28：「所有產品、所有設計，想發布之前，你要用視覺對一次。」
所以流程係：夾名 → 出 contact sheet → 我親眼逐張對 → 先至跑呢個。
夾名結果唔會直接上架。

  python3 add_from_lila.py --file <match.json> --apply
"""
import argparse, csv, json, sys, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa
from upload_files import host, upload  # noqa

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
TMP = Path("/Volumes/core/ouji-ads/brandsrc/lila")
LOCATION = "gid://shopify/Location/86449356958"
PUBS = ["gid://shopify/Publication/202340335774",
        "gid://shopify/Publication/202340466846",
        "gid://shopify/Publication/203168546974"]
DISCOUNT, FLOOR = 0.88, 0.15
FIND = 'query($q:String!){products(first:3, query:$q){nodes{id handle}}}'
CREATE = """mutation($p:ProductCreateInput!){productCreate(product:$p){
  product{id handle variants(first:1){nodes{id inventoryItem{id}}}} userErrors{field message}}}"""
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


def brand_of(n):
    n = (n or "").lower()
    for b in ["numbuzin", "numbuz:n", "aromatica", "menokin", "nacific", "round lab",
              "some by mi", "somebymi", "tocobo", "purito", "skin1004", "torriden",
              "anua", "cosrx", "abib", "fwee", "laka", "coringco", "frudia"]:
        if b in n:
            return b.replace("numbuz:n", "numbuzin").upper()
    return "K-BEAUTY"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    TMP.mkdir(parents=True, exist_ok=True)
    rows = json.loads(Path(a.file).read_text(encoding="utf-8"))
    pos = {}
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        b = (r.get("barcode") or "").strip()
        if b:
            pos[b] = r
    made = 0
    for x in rows:
        bc = x["bc"].strip()
        r = pos.get(bc)
        if not r:
            print(f"  ✗ POS 冇 {bc}"); continue
        if gql(FIND, {"q": f"barcode:{bc}"})["products"]["nodes"]:
            print(f"  ↷ 已經有 {r['name'][:34]}"); continue
        price, cost = float(r["unit_price"]), float(r["unit_cost"] or 0)
        after = price * DISCOUNT
        bumped = (after - cost) / after < FLOOR if after else False
        if bumped:
            price = round(price / DISCOUNT)
        print(f"  {r['name'][:40]:<42}${price:.0f}{'（加價）' if bumped else ''} 存{r['stock_qty']}")
        if not a.apply:
            continue
        files = []
        for i, u in enumerate(x["img"][:5], 1):
            try:
                data = urllib.request.urlopen(urllib.request.Request(
                    u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read()
                f = TMP / f"{bc}-{i:02d}.jpg"; f.write_bytes(data); files.append(f)
            except Exception:
                pass
        if not files:
            print("     ✗ 落唔到圖"); continue
        d = gql(CREATE, {"p": {
            "title": r["name"].strip(), "vendor": brand_of(r["name"]),
            "productType": (r.get("category") or "").strip() or "護膚",
            "status": "DRAFT",
            "tags": ["K-Beauty", brand_of(r["name"]), "護膚"]}})
        user_errors(d, "productCreate")
        p = d["productCreate"]["product"]; v = p["variants"]["nodes"][0]
        user_errors(gql(VUP, {"pid": p["id"], "v": [{
            "id": v["id"], "barcode": bc, "price": f"{price:.2f}",
            "inventoryItem": {"sku": bc, "tracked": True, "cost": f"{cost:.2f}"}}]}),
            "productVariantsBulkUpdate")
        user_errors(gql(QTY, {"in": {"name": "available", "reason": "correction",
            "ignoreCompareQuantity": True,
            "quantities": [{"inventoryItemId": v["inventoryItem"]["id"],
                            "locationId": LOCATION,
                            "quantity": int(float(r["stock_qty"]))}]}}), "inventorySetQuantities")
        urls = [upload(str(f)) for f in files]
        gql(MEDIA, {"id": p["id"], "m": [{"originalSource": u, "mediaContentType": "IMAGE",
                                          "alt": r["name"].strip()} for u in urls]})
        # 長圖：老闆企硬要有。要用 host() 攞永久 cdn.shopify.com URL——
        # upload() 出嚟嗰個係 staged URL，會過期，貼落 HTML 就變死圖。
        strips = []
        for i, u in enumerate(x.get("detail") or [], 1):
            try:
                data = urllib.request.urlopen(urllib.request.Request(
                    u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read()
                if len(data) < 4000:
                    continue
                f = TMP / f"{bc}-d{i:02d}.jpg"; f.write_bytes(data); strips.append(f)
            except Exception:
                pass
        strip_html = ""
        if strips:
            urls = [u for u in host([str(f) for f in strips], r["name"].strip()) if u]
            if urls:
                strip_html = ('<div class="product-detail-images">'
                              + "".join(f'<img src="{u}" alt="{r["name"].strip()}" loading="lazy">'
                                        for u in urls) + "</div>")
        desc = (f"<p><strong>{r['name'].strip()}</strong></p>"
                f"<ul><li>英文名：{x['title']}</li><li>產地：韓國 Made in Korea</li></ul>"
                + strip_html)
        user_errors(gql(ACTIVATE, {"id": p["id"], "d": desc}), "productUpdate")
        user_errors(gql(PUBLISH, {"id": p["id"],
                                  "in": [{"publicationId": y} for y in PUBS]}), "publishablePublish")
        made += 1
        print(f"     ✓ 上咗，圖 {len(files)} 張")
    print(f"\n上咗 {made} 件。")


main()
