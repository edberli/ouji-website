#!/usr/bin/env python3
"""
每個「想搵咩？」煩惱格嘅代表色 —— 由嗰格真正有嘅貨張相度抽返嚟。

點解要有呢個 script：首頁嗰八格改咗做色卡（見 styles.css 嘅 .concern-chip）。
色卡冇相，得一浸色，所以浸色一定要有出處，唔可以我自己執靚就算。

做法：
  1. 攞晒 Storefront 全部貨（同 makeup_subcats.py 同一條 query）
  2. 用 shopify.js 入面同一套 CONCERNS regex 分格，同一樣淨係計護膚品
     （唔隔嘅話「水潤透亮胭脂液」會跌入「乾燥・缺水」）
  3. 每格攞頭 N 件有貨有相嘅，每張相抽最鮮嗰批像素（唔係成張平均
     —— 平均會被影樓白底拉到一片灰），再喺格入面取中位數

出嚟嘅 hex 要貼返落 shopify.js 嘅 CONCERNS。**唔好自己執色。**
如果覺得某格個色唔啱睇，正確做法係去睇下嗰格嘅貨係咪分錯咗。

    python3 scripts/concern_colors.py            # 印出嚟
    python3 scripts/concern_colors.py --json out.json
"""
import argparse
import colorsys
import io
import json
import re
import statistics
import urllib.request

from PIL import Image

API = "https://5rerjn-mt.myshopify.com/api/2025-07/graphql.json"
TOKEN = "795e2f7cb13da1d3776449eba5802377"   # Storefront public token，公開嘅
SAMPLE = 14                                  # 每格抽幾多件貨嚟夾個色

QUERY = """query($c:String){products(first:250,after:$c){
  pageInfo{hasNextPage endCursor}
  edges{node{handle title tags totalInventory
    images(first:1){edges{node{url}}}}}}}"""

# 同 shopify.js 嘅 CONCERNS 一字不改。改咗其中一邊就會兩邊唔同步。
CONCERNS = [
    ("acne", "暗瘡・粉刺",
     r"暗瘡|痘痘|痘印|粉刺|acne|blemish|spot patch|水楊酸|salicylic|茶樹|tea tree"),
    ("pore", "毛孔粗大",
     r"毛孔|收毛孔|pore|黑頭|blackhead|去角質|peeling|scrub|\bbha\b|\bpha\b"),
    ("sensitive", "泛紅・敏感",
     r"敏感|泛紅|鎮靜|舒緩|修護|calming|soothing|sensitive|redness|cica|centella|積雪草|panthenol|泛醇"),
    ("dry", "乾燥・缺水",
     r"保濕|補水|乾燥|水潤|鎖水|hydra|moist|hyaluron|玻尿酸|透明質酸|ceramide|神經醯胺|barrier|屏障"),
    ("dull", "暗沉・色斑",
     r"美白|亮白|提亮|暗沉|色斑|斑印|透亮|煥白|bright|whitening|glow|tone.?up|glutathione|穀胱甘肽|"
     r"vitamin ?c|維他命 ?c|niacinamide|煙酰胺|煙醯胺|arbutin|tranexamic|傳明酸"),
    ("aging", "細紋・鬆弛",
     r"抗皺|細紋|皺紋|緊緻|提拉|彈力|抗老|逆齡|lifting|firming|wrinkle|anti.?aging|collagen|膠原|"
     r"retinol|視黃醇|retinal|peptide|胜肽|多肽|pdrn"),
    ("oily", "油光・出油",
     r"控油|油光|出油|清爽|sebum|oil ?control|matte|啞光|no.?sebum|powder wash"),
    ("sun", "防曬",
     r"防曬|spf|sun ?(cream|stick|serum|essence|cushion|lotion|screen)|uv|선크림"),
]


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


def is_skincare(p):
    tags = [t.lower() for t in (p.get("tags") or [])]
    if "makeup" in tags or "彩妝" in tags:
        return False
    return "skincare" in tags or "護膚" in tags


def pigment(url):
    """張相入面最鮮嗰批像素嘅平均 —— 即係件貨本身嘅顏色，唔係影樓白底。"""
    raw = urllib.request.urlopen(
        urllib.request.Request(url + ("&" if "?" in url else "?") + "width=200",
                               headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read()
    im = Image.open(io.BytesIO(raw)).convert("RGB").resize((70, 70))
    px = [p for p in im.getdata() if 26 < sum(p) / 3 < 238]
    if not px:
        return None
    px.sort(key=lambda p: colorsys.rgb_to_hsv(*[v / 255 for v in p])[1], reverse=True)
    top = px[:max(1, len(px) // 12)]
    return tuple(sum(p[i] for p in top) // len(top) for i in range(3))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json")
    a = ap.parse_args()

    live = [p for p in fetch_all()
            if (p.get("totalInventory") or 0) > 0 and p["images"]["edges"] and is_skincare(p)]
    print(f"護膚現貨 {len(live)} 件\n")

    out = {}
    for cid, label, pat in CONCERNS:
        hits = [p for p in live if re.search(pat, p["title"], re.I)]
        cols = []
        for p in hits[:SAMPLE]:
            try:
                c = pigment(p["images"]["edges"][0]["node"]["url"])
                if c:
                    cols.append(c)
            except Exception:
                pass
        if not cols:
            print(f"{label:<8} {len(hits):>4} 件   （抽唔到色）")
            continue
        # 取中位數，唔取平均 —— 一件深色包裝就唔會拉歪成格
        hexv = "#%02x%02x%02x" % tuple(
            int(statistics.median(c[i] for c in cols)) for i in range(3))
        out[cid] = hexv
        print(f"{label:<8} {len(hits):>4} 件   {hexv}   （夾咗 {len(cols)} 張相）")

    if a.json:
        json.dump(out, open(a.json, "w"), ensure_ascii=False, indent=1)
        print(f"\n寫咗 {a.json}")


if __name__ == "__main__":
    main()
