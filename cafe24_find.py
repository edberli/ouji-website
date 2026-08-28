#!/usr/bin/env python3
"""喺 Cafe24 站入面用關鍵詞搵貨，印返 product_no ＋ og:title。

點解要咁：好多 Cafe24 主題嘅列表頁 <img alt> 係通用字（「에센스 마스크」），
分唔到味道／規格。站內搜尋 + 逐個讀 og:title 就準。

  python3 cafe24_find.py <host> "<韓文關鍵詞>" ["<關鍵詞2>" ...]
"""
import re, sys, time, urllib.parse, urllib.request

UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}


def get(u, t=25):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA),
                                  timeout=t).read().decode("utf8", "ignore")


def og(host, no):
    try:
        h = get(f"https://{host}/product/detail.html?product_no={no}")
    except Exception as e:
        return f"✗{type(e).__name__}"
    m = re.search(r'<meta property="og:title" content="([^"]+)"', h)
    return m.group(1) if m else "?"


def main():
    host = sys.argv[1]
    for kw in sys.argv[2:]:
        u = f"https://{host}/product/search.html?keyword=" + urllib.parse.quote(kw)
        try:
            h = get(u, 30)
        except Exception as e:
            print(f"「{kw}」 ✗ {type(e).__name__}"); continue
        nos = list(dict.fromkeys(re.findall(r"product_no=(\d+)", h)))
        nos += [m.group(1) for m in re.finditer(r"/product/[^\"/]+/(\d+)/", h)
                if m.group(1) not in nos]
        print(f"\n「{kw}」 {nos[:6]}")
        for n in nos[:6]:
            print(f"   {n:<6} {og(host, n)[:64]}")
            time.sleep(0.35)


if __name__ == "__main__":
    main()
