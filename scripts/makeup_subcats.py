#!/usr/bin/env python3
"""
彩妝子分類：由產品名分，唔可以信 tag。

Shopify 入面啲 tag 係亂嘅 —— 實測有高光被標成「頰彩」、胭脂被標成
「修容」。用 tag 分出嚟嘅數係頰彩 39／修容 39，兩格都係錯；用名分
先係頰彩 16／修容 12。

所以：只讀產品名，一件貨只可以入一格，順序由最 specific 行到最闊
（唇 → 眼 → 底妝 → 修容 → 頰彩）。「唇頰彩妝」呢種兩用貨會歸唇妝，
因為個名以唇行先 —— 呢個係有意嘅，唔係 bug。

出嚟嘅 JSON 畀分類頁頂嗰啲 tile、同埋設計原型用，確保「眼妝」下面
唔會出到一支唇膏（呢個錯真係發生過，因為當時順住 index 配相）。

    python3 scripts/makeup_subcats.py            # 印出嚟睇
    python3 scripts/makeup_subcats.py --json out.json
"""
import argparse
import json
import re
import urllib.request

API = "https://5rerjn-mt.myshopify.com/api/2025-07/graphql.json"
TOKEN = "795e2f7cb13da1d3776449eba5802377"   # Storefront public token，公開嘅

# 順序即係優先次序：行到邊個 match 就歸邊個，唔會再試下面嘅。
RULES = [
    ("唇妝", r"唇膏|唇釉|唇彩|唇蜜|唇泥|唇霜|唇部|唇線|唇筆|唇頰|唇膜|唇凍|\btint\b|lip"),
    ("眼妝", r"眼影|眼線|睫毛|眉筆|眉粉|染眉|眼彩|臥蠶|閃粉|eyeshadow|eyeliner|mascara|\bbrow\b"),
    ("底妝", r"粉底|氣墊|遮瑕|妝前|飾底|蜜粉|定妝|素顏霜|底霜|cushion|foundation|concealer|primer"),
    ("修容", r"修容|高光|打亮|陰影|水光棒|contour|highlight|shading"),
    ("頰彩", r"胭脂|腮紅|頰彩|多用彩膏|多用膏|blush|cheek"),
]
ORDER = ["底妝", "眼妝", "唇妝", "頰彩", "修容"]
LIP_CARE = re.compile(r"潤唇膏|護唇膏|唇部精華|唇膜|lip\s*(?:balm|care|mask|serum)", re.I)

QUERY = """query($c:String){products(first:250,after:$c){
  pageInfo{hasNextPage endCursor}
  edges{node{handle title vendor totalInventory
    priceRange{minVariantPrice{amount}}
    images(first:1){edges{node{url}}}}}}}"""


def fetch_all():
    cur, out = None, []
    while True:
        req = urllib.request.Request(
            API, data=json.dumps({"query": QUERY, "variables": {"c": cur}}).encode(),
            headers={"Content-Type": "application/json",
                     "X-Shopify-Storefront-Access-Token": TOKEN})
        page = json.load(urllib.request.urlopen(req))["data"]["products"]
        out += [e["node"] for e in page["edges"]]
        if not page["pageInfo"]["hasNextPage"]:
            return out
        cur = page["pageInfo"]["endCursor"]


def bucket_of(title):
    # 護理貨個名一樣會包含「唇膏」／lip；要先截走，唔可以計入唇妝。
    if LIP_CARE.search(title):
        return None
    for label, pat in RULES:
        if re.search(pat, title, re.I):
            return label
    return None


# 相入錯咗嘅貨（Shopify 後台問題，唔係呢個 script 嘅 bug）。
# 呢啲貨照計入件數，但唔會攞嚟做 tile／原型嘅示範相 —— 因為老闆係憑
# demo 判斷，示範相出錯比 code 出錯更嚴重。
# 修好咗（喺 Shopify 換返張相）就由呢度剷走。
BAD_IMAGE = {
    # 檔名係 clio-kill-lash-superproof-mascara-01.jpg，名啱，
    # 但張圖本身係支唇釉。2026-08-18 發現。
    "CLIO 極緻捲翹超防水睫毛膏",
}


def build():
    live = fetch_all()
    buckets = {label: [] for label, _ in RULES}
    for p in live:
        # 冇貨嘅唔計入件數，冇相嘅做唔到 tile
        if (p.get("totalInventory") or 0) <= 0 or not p["images"]["edges"]:
            continue
        b = bucket_of(p["title"])
        if b:
            buckets[b].append(p)
    return [{
        "label": label,
        "n": len(buckets[label]),
        "picks": [{
            "t": p["title"],
            "v": p["vendor"],
            "img": p["images"]["edges"][0]["node"]["url"],
            "price": int(float(p["priceRange"]["minVariantPrice"]["amount"])),
        } for p in buckets[label] if p["title"] not in BAD_IMAGE][:4],
    } for label in ORDER]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="寫落邊個檔（唔寫就淨係印出嚟）")
    a = ap.parse_args()
    data = build()
    for c in data:
        print(f'{c["label"]:<5}{c["n"]:>4} 件')
        for p in c["picks"][:2]:
            print(f'        {p["t"][:52]}')
    if a.json:
        json.dump(data, open(a.json, "w"), ensure_ascii=False, indent=1)
        print(f"\n寫咗 {a.json}")


if __name__ == "__main__":
    main()
