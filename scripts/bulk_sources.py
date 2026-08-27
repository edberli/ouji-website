#!/usr/bin/env python3
"""爬牌子官網，砌一個「產品名 → 圖」嘅索引，畀 bulk_upload.py 夾。

點解要：POS 有貨但網店未上嗰 250 幾件，**條碼喺公開網上完全查唔到**
（實測掃過四個 K-beauty 批發站，254 個條碼 0 命中）。所以唯一可行嘅
係去牌子自己個官網，用產品名夾。

支援兩種站：
  cafe24  —— 韓國牌子最常見。/product/list.html 攞 product_no，
             再入 detail 頁攞 og:title、圖庫、長圖。
  shopify —— /products.json，有 barcode 就用條碼夾（最準）。

索引寫落 /Volumes/core/ouji-ads/brandsrc/<brand>.json，行過就唔使再爬。

  python3 bulk_sources.py            # 爬全部未爬過嘅
  python3 bulk_sources.py numbuzin   # 淨係爬一個
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path("/Volumes/core/ouji-ads/brandsrc")
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

SOURCES = {
    "aromatica":  ("cafe24", "aromatica.co.kr"),
    "numbuzin":   ("cafe24", "numbuzin.com"),
    "menokin":    ("cafe24", "menokin.co.kr"),
    "nacific":    ("cafe24", "nacific.co.kr"),
    "roundlab":   ("cafe24", "roundlab.co.kr"),
    "somebymi":   ("cafe24", "somebymi.com"),
    "wellit":     ("cafe24", "wellit.co.kr"),
    "coringco":   ("cafe24", "coringco.co.kr"),
    "vitaminvillage": ("cafe24", "vitaminvillage.co.kr"),
    "romand":     ("cafe24", "romand.co.kr"),
    "torriden":   ("shopify", "torriden.hk"),
}

SKIP_IMG = ("logo", "icon", "banner", "payment", "favicon", "placeholder",
            "btn_", "common/", "shipping", "sns")


def get(url, timeout=30):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=timeout).read()


def text(url, timeout=30):
    return get(url, timeout).decode("utf8", "ignore")


def cafe24_list(host):
    """由**列表頁**收 (product_no, 韓文名, 縮圖)。

    ⚠️ 唔可以行 detail 頁攞 og:title —— 好多 Cafe24 主題（aromatica 就係）
    嘅 detail 頁係 client-side render，server HTML 得個站名，爬到 224 件
    全部叫「AROMATICA | 아로마티카」，完全冇用。列表頁反而係 server-side，
    每件貨嘅名同縮圖都喺 <img alt> 度。
    """
    seen = {}
    for cate in list(range(1, 61)):
        try:
            h = text(f"https://{host}/product/list.html?cate_no={cate}", 20)
        except Exception:
            continue
        # ⚠️ 每個 Cafe24 主題嘅 markup 都唔同，寫死標籤次序就會得 0 件
        # （實測 numbuzin／nacific／roundlab／somebymi 全部 0）。改成：
        # 揾到 product_no 之後，喺**後面一段 HTML** 入面搵最近嗰個
        # <img src alt>，容忍中間夾幾多層都得。
        for m in re.finditer(r'product_no=(\d+)', h):
            no = m.group(1)
            if no in seen:
                continue
            chunk = h[m.end():m.end() + 1600]
            im = re.search(r'<img[^>]+src="([^"]+)"[^>]*alt="([^"]{3,90})"', chunk) \
                or re.search(r'<img[^>]+alt="([^"]{3,90})"[^>]*src="([^"]+)"', chunk)
            if not im:
                continue
            g = im.groups()
            img, name = (g[0], g[1]) if g[0].startswith(('http', '/', '//')) else (g[1], g[0])
            name = name.strip()
            if no in seen or any(k in name for k in ("장바구니", "관심상품", "이미지 보기")):
                continue
            if img.startswith("//"):
                img = "https:" + img
            elif img.startswith("/"):
                img = f"https://{host}{img}"
            seen[no] = {"no": no, "title": name, "imgs": [img], "detail": [],
                        "options": [],
                        "url": f"https://{host}/product/detail.html?product_no={no}"}
        if len(seen) > 500:
            break
    return list(seen.values())


def crawl_cafe24(brand, host):
    rows = cafe24_list(host)
    print(f"  {brand}: 列表頁收到 {len(rows)} 件")
    return rows


def crawl_shopify(brand, host):
    out = []
    for page in range(1, 8):
        try:
            d = json.loads(text(f"https://{host}/products.json?limit=250&page={page}"))
        except Exception:
            break
        ps = d.get("products", [])
        if not ps:
            break
        for p in ps:
            out.append({
                "no": p["id"], "title": p["title"],
                "imgs": [i["src"] for i in p.get("images", [])][:14],
                "detail": [],
                "barcodes": [(v.get("barcode") or "").strip() for v in p.get("variants", [])],
                "options": [v.get("title") for v in p.get("variants", [])],
                "url": f"https://{host}/products/{p['handle']}"})
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:] or list(SOURCES)
    for brand in only:
        kind, host = SOURCES[brand]
        dest = OUT / f"{brand}.json"
        if dest.exists():
            print(f"↷ {brand} 已經爬過（{len(json.loads(dest.read_text()))} 件）")
            continue
        print(f"▶ {brand} ({kind} {host})", flush=True)
        try:
            rows = crawl_cafe24(brand, host) if kind == "cafe24" else crawl_shopify(brand, host)
        except Exception as e:
            print(f"  ✗ {type(e).__name__}: {e}")
            continue
        dest.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
        print(f"  ✓ {brand}: {len(rows)} 件 → {dest}")


main()
