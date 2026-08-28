#!/usr/bin/env python3
"""執一執今晚上嘅貨：牌子名同長圖入面嘅細碎圖。

兩個問題都係 add_from_lila.py 出嚟嘅：
  1. brand_of() 只認得幾個大牌，第二啲一律變 "K-BEAUTY"，
     品牌頁就分唔到組。
  2. 長圖抓返嚟嗰疊會夾雜牌子 logo、badge 呢類細圖（實測有張 92×100
     嘅 PNG），拉到成行闊度就會好核突。
"""
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

Q = """query($c:String){products(first:100, after:$c, query:"created_at:>2026-08-28"){
  pageInfo{hasNextPage endCursor} nodes{id title vendor descriptionHtml}}}"""
UP = """mutation($id:ID!,$v:String,$d:String){productUpdate(product:{id:$id,vendor:$v,descriptionHtml:$d}){
  userErrors{field message}}}"""

BRANDS = ["BOTO", "Treecell", "DANONGWON", "MOEV", "Furriky", "FRUDIA", "AROMATICA",
          "Pyunkang yul", "MENOKIN", "numbuzin", "NACIFIC", "SKIN1004", "STUDIO 17",
          "Anua", "plu"]
MIN_PX = 300


def brand_of(title):
    low = title.lower()
    for b in BRANDS:
        if b.lower() in low:
            return b.upper()
    if "馬達加斯加積雪草" in title:
        return "SKIN1004"
    return None


def px(url):
    """只讀頭幾 KB 就夠攞到尺寸，唔使成張圖落。"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=25).read(65536)
        from io import BytesIO
        from PIL import Image
        return Image.open(BytesIO(data)).size
    except Exception:
        return (9999, 9999)          # 讀唔到就當佢冇問題，唔好誤刪


def main():
    apply = "--apply" in sys.argv
    c, n_v, n_d = None, 0, 0
    while True:
        d = gql(Q, {"c": c})["products"]
        for p in d["nodes"]:
            v = brand_of(p["title"])
            html = p["descriptionHtml"] or ""
            new_html = html
            for m in re.finditer(r'<img src="([^"]+)"[^>]*>', html):
                w, h = px(m.group(1))
                if min(w, h) < MIN_PX:
                    new_html = new_html.replace(m.group(0), "")
            changed_v = v and v != p["vendor"]
            changed_d = new_html != html
            if not (changed_v or changed_d):
                continue
            print(f"  {p['title'][:40]:<42}"
                  f"{'牌子→'+v if changed_v else '':<16}{'去咗細圖' if changed_d else ''}")
            n_v += changed_v; n_d += changed_d
            if apply:
                user_errors(gql(UP, {"id": p["id"], "v": v or p["vendor"],
                                     "d": new_html}), "productUpdate")
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    print(f"\n改牌子 {n_v}｜清長圖 {n_d}{'' if apply else '（未落，加 --apply）'}")


if __name__ == "__main__":
    main()
