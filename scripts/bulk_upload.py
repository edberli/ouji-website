#!/usr/bin/env python3
"""一次過將 POS 有貨、網店未上嘅貨上架 —— 唔使人睇住。

老闆 2026-08-28：「嗰啲上線產品，直接全部幫我上線啦⋯⋯你唔好再問我，
唔好再等啦。今晚幫我搞掂晒去啦。如果你冇辦法一次過做晒嘅，咁你整個
定時任務，或者整個 watch dog 又好。」

## 點夾
條碼喺公開網上查唔到（實測掃過四個 K-beauty 批發站，254 個 0 命中），
所以要用**產品名**去夾牌子官網。`bulk_sources.py` 已經爬好索引。

夾法保守：由 POS 名同官網名各自抽「訊號」——
  容量（50ml／100g／70片）、型號數字（No.3、423）、英文詞（≥3 個字母）
兩邊夾到先算數，而且**一定要夾到容量或者型號**先肯用，唔係淨靠英文詞。
夾唔到就跳過，寫落報告，唔會亂咁攞第一張圖當佢係。

## 安全掣
- 一次最多開 `--max` 件（預設 40）—— 夾錯嘅話唔會一鋪清袋
- 冇圖唔開（開咗都係白格）
- 已經有同條碼嘅唔開
- 每件都記低夾咗邊個來源 URL 落 tag，日後對得返
- 狀態寫 `/Volumes/core/ouji-ads/brandsrc/state.json`，斷咗續得返

  python3 bulk_upload.py                # 睇計劃
  python3 bulk_upload.py --apply        # 真係開
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa
from upload_files import upload, host as host_files  # noqa

SRC = Path("/Volumes/core/ouji-ads/brandsrc")
STATE = SRC / "state.json"
REPORT = SRC / "report.md"
POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")
BARCODES = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_barcodes_prince.csv")
LOCATION = "gid://shopify/Location/86449356958"
PUBS = ["gid://shopify/Publication/202340335774",
        "gid://shopify/Publication/202340466846",
        "gid://shopify/Publication/203168546974"]
DISCOUNT, FLOOR = 0.88, 0.15
TMP = Path("/Volumes/core/ouji-ads/brandsrc/img")

# POS 名開頭 → 索引檔名
BRAND_KEYS = {
    "aromatica": ["aromatica"],
    "numbuzin": ["numbuz", "numbuzin"],
    "menokin": ["menokin"],
    "nacific": ["nacific"],
    "roundlab": ["round lab", "roundlab"],
    "somebymi": ["somebymi", "some by mi"],
    "wellit": ["wellit"],
    "coringco": ["coringco"],
    "vitaminvillage": ["vitamin village"],
    "romand": ["rom&nd", "romand"],
    "torriden": ["torriden"],
}

# 容量：POS 寫「毫升／克」，韓國站寫「ml／g」—— 唔對齊就永遠夾唔到。
UNIT = {"毫升": "ml", "亳升": "ml", "ml": "ml", "克": "g", "g": "g", "kg": "kg",
        "片": "pcs", "매": "pcs", "개": "pcs", "pcs": "pcs", "정": "pcs",
        "包": "pcs", "條": "pcs", "支": "pcs", "入": "pcs", "枚": "pcs", "ea": "pcs"}
SIZE = re.compile(r"(\d+(?:\.\d+)?)\s*(毫升|亳升|ml|克|kg|g|片|개|매|pcs|정|ea|包|條|支|入|枚)", re.I)

# 中↔韓關鍵詞。夾名淨靠容量太易撞（一堆 100ml），要有詞義訊號。
LEX = {
    "迷迭香": "로즈마리", "茶樹": "티트리", "洗髮": "샴푸", "護髮素": "컨디셔너",
    "護髮油": "오일", "頭皮": "스칼프", "去角質": "스케일링", "增強": "인핸서",
    "安瓶": "앰플", "精華": "세럼", "面霜": "크림", "乳液": "로션", "爽膚水": "토너",
    "潔面": "클렌징", "面膜": "마스크", "防曬": "선", "棉片": "패드", "卸妝": "클렌징",
    "身體": "바디", "護手": "핸드", "唇": "립", "眼": "아이", "水潤": "수분",
    "維他命": "비타민", "膠原": "콜라겐", "積雪草": "시카", "魚腥草": "어성초",
    "煙酰胺": "나이아신", "透明質酸": "히알루론", "藜麥": "퀴노아", "薰衣草": "라벤더",
}
NUM = re.compile(r"(?<![\d.])(\d{1,4})(?![\d.])")
LATIN = re.compile(r"[a-z][a-z0-9\-']{2,}", re.I)

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


def signals(s):
    s = (s or "").lower()
    pairs = SIZE.findall(s)
    sizes = {f"{float(a):g}{UNIT.get(b.lower(), b.lower())}" for a, b in pairs}
    # ⚠️ 容量本身嗰個數字唔可以再當「型號數字」數多次。
    #    之前寫 `{n[:-2] for n in sizes}` 係錯 —— "30pcs"[:-2] = "30p"，
    #    減唔到，結果「30정」對「30條」被當成型號夾中，Vitamin village
    #    八件貨全部夾到同一個韓國保健品度。
    size_nums = {f"{float(a):g}" for a, _ in pairs}
    nums = set(NUM.findall(s)) - size_nums
    lat = {w.lower() for w in LATIN.findall(s)}
    return sizes, nums, lat


def lex_hits(pos_name, src_title):
    """POS 個中文名有幾多個詞，喺韓文名度搵得返對應嘅韓文。"""
    return sum(1 for zh, ko in LEX.items()
               if zh in (pos_name or "") and ko in (src_title or ""))


def lex_clash(pos_name, src_title):
    """韓文名有某個成分／劑型詞，但 POS 名講緊另一樣 —— 即係唔同貨。

    實測：「茶樹淨化洗髮水 180毫升」夾到「로즈마리(迷迭香) 샴푸 180ML」，
    容量啱、都係洗髮水，但一個茶樹一個迷迭香。冇呢個檢查就會落錯相。
    """
    n = 0
    for zh, ko in LEX.items():
        if ko in (src_title or "") and zh not in (pos_name or ""):
            # 只計「有對立面」嘅詞：POS 名入面有另一個同類詞
            n += 1
    return n


def score(pos_name, src_title):
    ps, pn, pl = signals(pos_name)
    ss, sn, sl = signals(src_title)
    size_hit = bool(ps & ss)
    num_hit = bool(pn & sn)
    lat_hit = pl & sl
    strong_lat = {w for w in lat_hit if len(w) >= 4}
    sc = 0.0
    if size_hit:
        sc += 0.5
    if num_hit:
        sc += 0.2
    sc += min(len(strong_lat), 3) * 0.15
    lx = lex_hits(pos_name, src_title)
    sc += min(lx, 3) * 0.2
    # 一定要夾到容量 —— 淨靠詞太易撞（個個都有「精華」「cream」）
    if not size_hit:
        return 0.0
    # 容量之外一定要有**詞義**訊號。型號數字唔算 —— 「30 條」對「30 정」
    # 呢種係容量重複，唔係第二個證據。
    if not (lx or strong_lat):
        return 0.0
    # 韓文名講緊另一樣成分／劑型 → 唔同貨，直接否決
    if lex_clash(pos_name, src_title) > lx:
        return 0.0
    # ⚠️ 一個詞義訊號唔夠。實測：
    #   「魚膠原蛋白維他命C」夾到「비타민K 칼슘 마그네슘…」（淨係「維他命」中）
    #   「Serene 身體乳液 薰衣草」夾到「바디워시 페퍼민트」（淨係「身體」中）
    #   兩件都係錯貨。個中韓詞表太細，捉唔到「薰衣草 vs 薄荷」呢類對立，
    #   所以唯有要求**至少兩個**詞義訊號夾到先肯用。
    if lx + len(strong_lat) < 2:
        return 0.0
    return round(sc, 2)


def load_pos():
    rows = []
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        b = (r.get("barcode") or "").strip()
        if b and float(r.get("stock_qty") or 0) > 0:
            rows.append(r)
    return rows


def web_barcodes():
    q = """query($c:String){products(first:100, after:$c){pageInfo{hasNextPage endCursor}
      nodes{variants(first:60){nodes{barcode}}}}}"""
    out, c = set(), None
    while True:
        d = gql(q, {"c": c})["products"]
        for p in d["nodes"]:
            for v in p["variants"]["nodes"]:
                if v["barcode"]:
                    out.add(v["barcode"].strip())
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    return out


def brand_of(name):
    low = (name or "").lower()
    for key, pats in BRAND_KEYS.items():
        if any(p in low for p in pats):
            return key
    return None


def fetch(url, dest):
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=40).read()
    if len(data) < 4000:
        raise ValueError("圖太細")
    dest.write_bytes(data)
    return dest


def priced(price, cost):
    after = price * DISCOUNT
    m = (after - cost) / after if after else 0
    if m < FLOOR:
        new = round(price / DISCOUNT)
        return new, True
    return price, False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--max", type=int, default=40)
    ap.add_argument("--min-score", type=float, default=0.65)
    a = ap.parse_args()

    TMP.mkdir(parents=True, exist_ok=True)
    state = json.loads(STATE.read_text()) if STATE.exists() else {"done": [], "skip": {}}
    idx = {}
    for f in SRC.glob("*.json"):
        if f.name in ("state.json",):
            continue
        try:
            idx[f.stem] = json.loads(f.read_text())
        except Exception:
            pass
    if not idx:
        print("✗ 未有牌子索引 —— 先跑 bulk_sources.py")
        return

    web = web_barcodes()
    plan, nohit = [], []
    for r in load_pos():
        bc = r["barcode"].strip()
        if bc in web or bc in state["done"]:
            continue
        b = brand_of(r["name"])
        if not b or b not in idx:
            continue
        best, bs = None, 0.0
        for cand in idx[b]:
            if bc and bc in (cand.get("barcodes") or []):
                best, bs = cand, 1.0
                break
            s = score(r["name"], cand["title"])
            if s > bs:
                best, bs = cand, s
        if best and bs >= a.min_score and best.get("imgs"):
            plan.append((r, b, best, bs))
        else:
            nohit.append((r, b, bs))

    plan.sort(key=lambda x: -x[3])
    # ⚠️ 一個來源產品只可以配一件貨。之前冇呢句，Vitamin village 八件
    #    全部指住同一個韓國保健品，八件貨落同一張相。
    used, uniq = set(), []
    for r, b, m, s2 in plan:
        key = (b, m["no"])
        if key in used:
            nohit.append((r, b, s2))
            continue
        used.add(key)
        uniq.append((r, b, m, s2))
    plan = uniq
    print(f"索引：{ {k: len(v) for k, v in idx.items()} }")
    print(f"夾到 {len(plan)} 件｜夾唔到 {len(nohit)} 件｜今次最多做 {a.max} 件\n")
    for r, b, m, s in plan[:a.max]:
        print(f"  {s:.2f} {r['name'][:40]:<42}→ {m['title'][:42]}")
    if not a.apply:
        print("\n加 --apply 先會真係開。")
        return

    made = 0
    for r, b, m, s in plan[:a.max]:
        bc = r["barcode"].strip()
        if gql(FIND, {"q": f"barcode:{bc}"})["products"]["nodes"]:
            state["done"].append(bc); continue
        price, bumped = priced(float(r["unit_price"]), float(r["unit_cost"] or 0))
        qty = max(int(float(r["stock_qty"] or 0)), 0)
        files = []
        for i, u in enumerate(m["imgs"][:8], 1):
            try:
                files.append(fetch(u, TMP / f"{bc}-{i:02d}.jpg"))
            except Exception:
                pass
        if not files:
            state["skip"][bc] = "圖下載唔到"; continue
        d = gql(CREATE, {"p": {
            "title": r["name"].strip(),
            "vendor": b.upper(),
            "productType": (r.get("category") or "").strip() or "護膚",
            "status": "DRAFT",
            "tags": ["K-Beauty", b, "自動上架", f"src:{m['no']}"],
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
                                                     "locationId": LOCATION, "quantity": qty}]}}),
                    "inventorySetQuantities")
        urls = [upload(str(f)) for f in files]
        gql(MEDIA, {"id": p["id"], "m": [{"originalSource": u, "mediaContentType": "IMAGE",
                                          "alt": r["name"].strip()} for u in urls]})
        strips = "".join(f'<img src="{u}" alt="" loading="lazy">'
                         for u in host_files([str(f) for f in files[:6]], alt=r["name"].strip()) if u)
        desc = (f"<p>{r['name'].strip()}</p>"
                f'<div class="product-detail-images">{strips}</div>')
        user_errors(gql(ACTIVATE, {"id": p["id"], "d": desc}), "productUpdate")
        user_errors(gql(PUBLISH, {"id": p["id"],
                                  "in": [{"publicationId": x} for x in PUBS]}), "publishablePublish")
        state["done"].append(bc)
        made += 1
        print(f"  ✓ {r['name'][:44]}  ${price:.0f}{'（加咗價）' if bumped else ''} 存{qty} 圖{len(files)}")
        STATE.write_text(json.dumps(state, ensure_ascii=False))

    STATE.write_text(json.dumps(state, ensure_ascii=False))
    REPORT.write_text(
        f"# 自動上架報告\n\n開咗 {made} 件｜仲有夾到未做 {max(0, len(plan)-a.max)} 件｜"
        f"夾唔到 {len(nohit)} 件\n\n## 夾唔到\n"
        + "".join(f"- {x[0]['name'][:52]}（{x[1]}，最高分 {x[2]:.2f}）\n" for x in nohit[:200]),
        encoding="utf-8")
    print(f"\n開咗 {made} 件。報告 → {REPORT}")


# ⚠️ 一定要包住個 guard。之前係一句裸嘅 main() —— 第二個 script
# `from bulk_upload import CREATE, ...` 攞常數嗰陣，成個上架流程會即刻
# 跟住跑，而且會食咗人哋嘅命令列參數。
if __name__ == "__main__":
    main()
