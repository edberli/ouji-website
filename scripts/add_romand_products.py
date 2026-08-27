#!/usr/bin/env python3
"""開返 rom&nd 幾條 POS 有貨、但網店未有嘅產品線。

## 色號點對出嚟（唔准靠位置估）
POS 個名淨係寫「Rom&nd Glasting Melting Balm 03 Glasting Melting B…」
咁樣截斷。所以逐條產品線去 romand.co.kr 揭返官方色號表對：

  655 글래스팅 멜팅 밤 #오리지널   01 코코 누드 / 02 러비 핑크 / 03 소르베 밤
                                / 06 카야 피그 / 07 모브 휩
  835 …#더스티온더누드            10 누 베이지 / 11 버피 코랄 / 13 스카치 누드
                                / 14 디어 애플 / 15 피칸 브루
  516 제로 매트 립스틱 #오리지널    02 올 댓 재즈 / 03 실루엣 / 13 레드 카펫 / 17 레드 히트
  625 누 제로 쿠션               01 포슬린17 / 03 내추럴21 / 05 샌드25  ← POS 叫「水感光澤
                                純素 CUSHION」，其實係 Nu Zero Cushion
  767 베어 레이어 팔레트          02 스트로베리 무드
  540 시스루 베일라이터           02 문 키스드 베일
  849 더 유니버스 리퀴드 글리터     05 러비 플레어

## 圖
跟網站現有做法：`gallery/` 入 product media，`detail/`（長圖）**唔做
media，係嵌入 descriptionHtml 嘅 .product-detail-images 入面** —— 呢個
係全站既有格式，唔好自己改。長圖一張都唔剔（老闆 2026-08-27）。

## 價
88 折後毛利低過 15% 就標價 ×1.2（老闆定）。

  python3 add_romand_products.py --apply
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa
from upload_files import upload, upload_all  # noqa

ROOT = Path(__file__).parent.parent
POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
LOCATION = "gid://shopify/Location/86449356958"
PUBLICATIONS = ["gid://shopify/Publication/202340335774",
                "gid://shopify/Publication/202340466846",
                "gid://shopify/Publication/203168546974"]
DISCOUNT, FLOOR = 0.88, 0.15
TAGS_LIP = ["K-Beauty", "lip", "makeup", "rom&nd", "唇妝", "彩妝"]
TAGS_EYE = ["K-Beauty", "eye", "eyeshadow", "makeup", "rom&nd", "眼妝", "彩妝"]

PRODUCTS = [
    {
        "handle": "romand-glasting-melting-balm",
        "title": "rom&nd Glasting Melting Balm 玻璃融唇膏",
        "type": "唇膏", "tags": TAGS_LIP,
        "img": ["romand-glasting-melting-balm", "romand-glasting-melting-balm-dusty"],
        "hook": "似唇彩咁亮，似潤唇膏咁潤。",
        "body": "膏狀質地一上唇就融，唔似唇彩咁黐，但光澤度一樣高。想要水光唇又怕黏笠嘅，"
                "由呢支入手。",
        "bullets": ["<strong>一上唇就融</strong>——唔使推，體溫已經化開。",
                    "<strong>亮但唔黐</strong>——唔會黐頭髮。",
                    "<strong>可單搽可疊</strong>——裸唇搽或者疊喺唇膏上做水光效果。"],
        "use": "直接搽於唇部；想更亮就集中點喺唇中央。",
        "shades": [("8809625246082", "01 Coco Nude"), ("8809625246099", "02 Lovely Pink"),
                   ("8809625246105", "03 Sorbet Balm"), ("8809625246136", "06 Kaya Fig"),
                   ("8809625246143", "07 Mauve Whip"), ("8809625248390", "10 Nu Beige"),
                   ("8809625248406", "11 Buffy Coral"), ("8809625248239", "13 Scotch Nude"),
                   ("8809625248413", "14 Dear Apple"), ("8809625248420", "15 Pecan Brew")],
    },
    {
        "handle": "romand-zero-matte-lipstick",
        "title": "rom&nd Zero Matte Lipstick 零負擔啞光唇膏",
        "type": "唇膏", "tags": TAGS_LIP,
        "img": ["romand-zero-matte-lipstick"],
        "hook": "啞光但唔乾。",
        "body": "rom&nd 嘅經典啞光唇膏。粉霧質地上色濃，但配方唔會拉乾唇紋 —— "
                "想要啞光妝感又頂唔順乾嘅，呢支係入門位。",
        "bullets": ["<strong>粉霧啞光</strong>——一塗就有霧面妝感。",
                    "<strong>顯色度高</strong>——薄薄一層已經夠色。",
                    "<strong>唔拉乾</strong>——啞光但唔會起唇紋。"],
        "use": "由唇中央向外搽；想邊緣更利落可以先用唇線筆。",
        "shades": [("8809625242077", "02 All That Jazz"), ("8809625242084", "03 Silhouette"),
                   ("8809625242091", "04 Before Sunset"), ("8809625242169", "11 Sunlight"),
                   ("8809625242183", "13 Red Carpet"), ("8809625242213", "16 Dazzle Red"),
                   ("8809625242220", "17 Red Heat")],
    },
    {
        "handle": "romand-nu-zero-cushion",
        "title": "rom&nd Nu Zero Cushion 零負擔氣墊粉底",
        "type": "氣墊", "tags": ["K-Beauty", "base", "cushion", "makeup", "rom&nd", "底妝", "彩妝"],
        "img": ["romand-nu-zero-cushion"],
        "hook": "薄到似冇上妝，但遮到。",
        "body": "水感氣墊，主打「裸」嘅妝感 —— 貼膚唔厚重，唔會有假面感。SPF38 PA++。",
        "bullets": ["<strong>水感薄透</strong>——一層已經勻，唔會結塊。",
                    "<strong>SPF38 PA++</strong>——日常出街夠用。",
                    "<strong>20g 容量</strong>——連粉撲。"],
        "use": "用粉撲蘸適量，由面部中央向外輕拍。",
        "shades": [("8809625246266", "01 Porcelain 17"), ("8809625246280", "03 Natural 21"),
                   ("8809625246303", "05 Sand 25")],
    },
    {
        "handle": "romand-bare-layer-palette",
        "title": "rom&nd Bare Layer Palette 裸感層次眼影盤",
        "type": "眼影", "tags": TAGS_EYE,
        "img": ["romand-bare-layer-palette"],
        "hook": "六色一盤，日常眼妝一盤搞掂。",
        "body": "裸色系六色眼影盤，啞光同珠光混搭，由打底到加深一盤齊。",
        "bullets": ["<strong>六色配搭</strong>——啞光 ＋ 珠光，唔使再夾第二盤。",
                    "<strong>裸色系</strong>——返工返學都用得。",
                    "<strong>粉質幼細</strong>——唔易飛粉。"],
        "use": "由淺色打底，再用深色收眼尾；珠光點喺眼皮中央提亮。",
        "shades": [("8809625246938", "01 Apricot Mood"), ("8809625246945", "02 Strawberry Mood")],
    },
    {
        "handle": "romand-see-through-veillighter",
        "title": "rom&nd See-through Veillighter 透光打亮",
        "type": "修容", "tags": ["K-Beauty", "highlight", "makeup", "rom&nd", "修容", "彩妝"],
        "img": ["romand-see-through-veillighter"],
        "hook": "打亮但唔想閃到似出汗。",
        "body": "細緻珠光打亮，光係「透」出嚟而唔係浮喺面上，唔會突顯毛孔同紋路。",
        "bullets": ["<strong>細珠光</strong>——唔會一粒粒閃。",
                    "<strong>貼膚</strong>——唔會浮粉。",
                    "<strong>可疊量</strong>——由自然到明顯自己控制。"],
        "use": "點喺顴骨、鼻樑、唇珠，用手指或者刷輕輕推開。",
        "shades": [("8809625242930", "02 Moonkissed Veil")],
    },
    {
        "handle": "romand-universe-liquid-glitter",
        "title": "rom&nd The Universe Liquid Glitter 宇宙亮片眼影液",
        "type": "眼影", "tags": TAGS_EYE,
        "img": ["romand-universe-liquid-glitter"],
        "hook": "一筆掃落去就有星塵。",
        "body": "液態亮片眼影，扁頭掃頭一掃就鋪勻，唔使用手指拍。乾得快，唔易掉閃粉。",
        "bullets": ["<strong>液態亮片</strong>——一掃鋪勻，唔使手指拍。",
                    "<strong>唔易掉粉</strong>——乾咗貼實。",
                    "<strong>疊喺眼影上</strong>——即刻由日常變派對妝。"],
        "use": "喺眼影之後，掃喺眼皮中央或者眼頭提亮。",
        "shades": [("8809625248659", "05 Lovey Flare")],
    },
]

FIND = 'query($h:String!){products(first:1, query:$h){nodes{id handle}}}'
CREATE = """mutation($p:ProductCreateInput!){
  productCreate(product:$p){product{id handle
    options{id name} variants(first:1){nodes{id inventoryItem{id}}}}
    userErrors{field message}}}"""
VBULK = """mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkCreate(productId:$pid, variants:$v, strategy:REMOVE_STANDALONE_VARIANT){
    productVariants{id title barcode inventoryItem{id}} userErrors{field message}}}"""
SET_QTY = """mutation($in:InventorySetQuantitiesInput!){
  inventorySetQuantities(input:$in){userErrors{field message}}}"""
ADD_MEDIA = """mutation($id:ID!,$m:[CreateMediaInput!]!){
  productCreateMedia(productId:$id, media:$m){media{... on MediaImage{id}}
    mediaUserErrors{field message}}}"""
PUBLISH = """mutation($id:ID!,$in:[PublicationInput!]!){
  publishablePublish(id:$id, input:$in){userErrors{field message}}}"""
ACTIVATE = """mutation($id:ID!,$d:String!){
  productUpdate(product:{id:$id,status:ACTIVE,descriptionHtml:$d}){
    product{status} userErrors{field message}}}"""


def pos_map():
    d = {}
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        b = (r.get("barcode") or "").strip()
        if b:
            d[b] = r
    return d


def priced(price, cost):
    """折後蝕本／冇錢賺嗰啲，加到「打完 88 折 = 原本個售價」。

    老闆 2026-08-27 改咗個做法：本來係一律 ×1.2，但咁樣打完折仲貴過
    原價（$69 → $83 → 折後 $73），會貴過香港對手。而家改成**加返個
    折扣返去**：新標價 = 原價 ÷ 0.88，打完折就變返原價。
      $69 → $78 → 折後 $68.64
      $89 → $101 → 折後 $88.88
    即係客畀嘅錢同以前一樣，我哋唔使再蝕個折扣。
    """
    after = price * DISCOUNT
    m = (after - cost) / after if after else 0
    if m < FLOOR:
        new = round(price / DISCOUNT)
        return new, True, (new * DISCOUNT - cost) / (new * DISCOUNT)
    return price, False, m


def files(prefixes, group):
    out = []
    for pre in prefixes:
        d = ROOT / "brands" / "romand" / group
        out += sorted(f for f in d.glob(f"{pre}-*") if f.is_file())
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    pos = pos_map()
    bumped = []

    for cfg in PRODUCTS:
        g = files(cfg["img"], "gallery")
        dt = files(cfg["img"], "detail")
        rows = []
        for bc, name in cfg["shades"]:
            r = pos.get(bc)
            if not r:
                print(f"  ✗ POS 冇 {bc} {name}"); continue
            price, was, m = priced(float(r["unit_price"]), float(r["unit_cost"] or 0))
            if was:
                bumped.append((cfg["title"], name, float(r["unit_price"]), price, m))
            rows.append((bc, name, price, float(r["unit_cost"] or 0),
                         max(int(float(r["stock_qty"] or 0)), 0), was, m))
        print(f"\n{cfg['title']}  gallery={len(g)} 長圖={len(dt)} 色號={len(rows)}")
        for bc, name, price, cost, qty, was, m in rows:
            print(f"   {name:<20}${price:<6.0f}{'（加咗價）' if was else '        '}"
                  f"存{qty:<4}折後毛利 {m*100:.0f}%")
        if not a.apply or not rows:
            continue
        if gql(FIND, {"h": f"handle:{cfg['handle']}"})["products"]["nodes"]:
            print("   ↷ 已經有，跳過"); continue

        d = gql(CREATE, {"p": {
            "handle": cfg["handle"], "title": cfg["title"],
            "vendor": "rom&nd", "productType": cfg["type"], "status": "DRAFT",
            "tags": cfg["tags"],
            "productOptions": [{"name": "色號",
                                "values": [{"name": n} for _, n, *_ in rows]}],
        }})
        user_errors(d, "productCreate")
        p = d["productCreate"]["product"]
        opt = p["options"][0]

        d = gql(VBULK, {"pid": p["id"], "v": [{
            "barcode": bc, "price": f"{price:.2f}",
            "optionValues": [{"optionId": opt["id"], "name": name}],
            "inventoryItem": {"sku": bc, "tracked": True, "cost": f"{cost:.2f}"},
        } for bc, name, price, cost, qty, was, m in rows]})
        user_errors(d, "productVariantsBulkCreate")
        by = {v["barcode"]: v for v in d["productVariantsBulkCreate"]["productVariants"]}
        q = [{"inventoryItemId": by[bc]["inventoryItem"]["id"], "locationId": LOCATION,
              "quantity": qty} for bc, n, pr, c, qty, w, m in rows if bc in by]
        if q:
            user_errors(gql(SET_QTY, {"in": {"name": "available", "reason": "correction",
                                             "ignoreCompareQuantity": True,
                                             "quantities": q}}), "inventorySetQuantities")

        urls = upload_all([str(f) for f in g])
        for i in range(0, len(urls), 10):
            user_errors_ = gql(ADD_MEDIA, {"id": p["id"], "m": [
                {"originalSource": u, "mediaContentType": "IMAGE",
                 "alt": cfg["title"]} for u in urls[i:i + 10]]})
            errs = user_errors_["productCreateMedia"]["mediaUserErrors"]
            if errs:
                print("   ✗ media", errs)

        strips = "".join(
            f'<img src="{u}" alt="{cfg["title"]} 產品介紹" loading="lazy">'
            for u in upload_all([str(f) for f in dt]))
        lis = "".join(f"<li>{b}</li>" for b in cfg["bullets"])
        desc = (f"<p><strong>{cfg['hook']}</strong></p><p>{cfg['body']}</p>"
                f"<ul>{lis}</ul><p><strong>用法</strong><br>{cfg['use']}</p>"
                f"<ul><li>產地：韓國 Made in Korea</li></ul>"
                f'<div class="product-detail-images">{strips}</div>')
        user_errors(gql(ACTIVATE, {"id": p["id"], "d": desc}), "productUpdate")
        user_errors(gql(PUBLISH, {"id": p["id"],
                                  "in": [{"publicationId": x} for x in PUBLICATIONS]}),
                    "publishablePublish")
        print(f"   ✓ 上架咗，{len(rows)} 個色號、{len(g)} 張圖、{len(dt)} 張長圖")

    if bumped:
        print(f"\n加咗價（88 折後毛利本來低過 {FLOOR*100:.0f}%）：")
        for t, n, old, new, m in bumped:
            print(f"  {t[:26]:<28}{n:<20}${old:.0f} → ${new:.0f}（折後毛利 {m*100:.0f}%）")
    if not a.apply:
        print("\n加 --apply 先會真係開。")


main()
