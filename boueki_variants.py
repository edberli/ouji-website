"""由 Bou Eki Market 抽**逐個規格**嘅條碼同專屬圖。

點解重要：佢個「系列頁」（例如 Fiancee「Body Mist 身體噴霧」）表面睇落
一版涵蓋 8 隻香味、得一組圖，所以我一開始當佢「一對多、唔安全」。
其實頁面入面 embed 咗成個 product JSON，每個 variation 有：
  fields_translations["zh-hant"] —— 中文規格名（例：Pure Shampoo 洗髮水香味）
  gtin                            —— **條碼**
  media.images.original.url       —— 嗰隻規格自己嘅 1200×1200 圖
即係可以**用條碼直接夾**，零猜測，仲要係官方代理嘅官方圖。

  python3 boueki_variants.py
"""
import gzip, json, re, time, urllib.parse, urllib.request
from pathlib import Path

UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}


def get(u, t=40):
    u = urllib.parse.quote(u, safe=":/?&=%#")
    b = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read()
    if b[:2] == b"\x1f\x8b":
        b = gzip.decompress(b)
    return b.decode("utf8", "ignore")


# 頁面把 JSON 用 \" escape 咗塞喺一個 HTML 屬性度，所以直接喺 raw HTML
# 度用 regex 抽，唔好嘗試 parse 成個 blob（試過，引號層數對唔返）。
VAR = re.compile(
    r'\\"fields_translations\\":\{[^}]*?\\"zh-hant\\":\[\\"(?P<zh>[^"\\]+)\\"\].*?'
    r'\\"gtin\\":\\"(?P<gtin>\d{8,14})\\"', re.S)
IMG = re.compile(r'\\"original\\":\{[^}]*?\\"url\\":\\"(?P<url>https://img\.shoplineapp\.com[^"\\]+)')


# 老闆 2026-08-29：Boueki 啲貨跟返佢官網個價（我哋零售價本身平過佢）
PRICE = re.compile(r'\\"dollars\\":(?P<d>[0-9.]+)')


def variants(html):
    """逐段切開嚟抽，唔好一次過 regex 成版 —— 唔同 variation 之間會夾錯。"""
    out = []
    parts = html.split('\\"variations\\":[')
    if len(parts) < 2:
        return out
    body = parts[1]
    for chunk in body.split('\\"price\\":{'):
        m = VAR.search(chunk)
        if not m:
            continue
        img = None
        # 圖要喺 variation 自己嗰段搵（media 喺 gtin 前面）
        for im in IMG.finditer(chunk):
            img = im.group("url")
        pm = PRICE.search(chunk)
        out.append({"name": m.group("zh"), "gtin": m.group("gtin"), "img": img,
                    "price": float(pm.group("d")) if pm else None})
    return out


def main():
    sm = get("https://www.bouekimarket.com/sitemap.xml?locale=zh-hant")
    urls = [u for u in re.findall(r"<loc>([^<]+)</loc>", sm) if "/products/" in u]
    print(f"產品頁 {len(urls)} 條", flush=True)
    out = []
    for i, u in enumerate(urls, 1):
        try:
            h = get(u)
        except Exception as e:
            print("✗", type(e).__name__, flush=True); continue
        t = re.search(r'<meta property="og:title" content="([^"]+)"', h)
        for v in variants(h):
            v["page"] = (t.group(1) if t else "").split(" | ")[0]
            v["url"] = u
            out.append(v)
        if i % 40 == 0:
            print(f"  {i}/{len(urls)}  收到 {len(out)} 個規格", flush=True)
        time.sleep(0.5)
    Path("boueki_variants.json").write_text(json.dumps(out, ensure_ascii=False))
    n = sum(1 for v in out if v["gtin"] and v["img"])
    print(f"搞掂：{len(out)} 個規格，其中 {n} 個有齊條碼同圖")


main()
