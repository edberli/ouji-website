"""爬 Bou Eki Market（bouekimarket.com，SHOPLINE）—— Boueki 香港官方網店。

點解值得爬：佢係 IDA GROUP（Canmake／Fiancée／Country & Stream／
Rosy Rosa／Ducato／Mapepe）嘅港澳代理，**產品名係中文**，同我哋 POS
同一種語言 —— 夾名準過之前對韓文站。

⚠️ 冇條碼。JSON-LD 得 name／sku（內部 id）／price／image，
所以一定要人手睇圖對過先上。
"""
import json, re, time, urllib.parse, urllib.request, gzip
from pathlib import Path

UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}


def get(u, t=40):
    # ⚠️ sitemap 有唔少網址含中文（/products/…混合形狀化妝棉套裝…），
    #    直接掉俾 urllib 會 UnicodeEncodeError，84 條就係咁靜靜哋跌咗。
    u = urllib.parse.quote(u, safe=":/?&=%#")
    b = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read()
    if b[:2] == b"\x1f\x8b":
        b = gzip.decompress(b)
    return b.decode("utf8", "ignore")


def main():
    sm = get("https://www.bouekimarket.com/sitemap.xml?locale=zh-hant")
    urls = [u for u in re.findall(r"<loc>([^<]+)</loc>", sm) if "/products/" in u]
    print(f"產品頁 {len(urls)} 條", flush=True)
    out = []
    for i, u in enumerate(urls, 1):
        try:
            h = get(u)
        except Exception as e:
            print("✗", u[-40:], type(e).__name__); continue
        rec = None
        for m in re.finditer(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', h, re.S):
            try:
                d = json.loads(m.group(1))
            except Exception:
                continue
            if isinstance(d, dict) and d.get("@type") == "Product":
                img = d.get("image")
                rec = {"title": d.get("name", ""), "url": u,
                       "price": (d.get("offers") or {}).get("price"),
                       "images": [img] if isinstance(img, str) else (img or []),
                       "desc": (d.get("description") or "")[:300]}
                break
        if rec:
            out.append(rec)
        if i % 40 == 0:
            print(f"  {i}/{len(urls)}", flush=True)
        time.sleep(0.5)
    old = []
    f = Path("boueki_all.json")
    if f.exists():
        old = json.loads(f.read_text())
    seen = {r["url"] for r in out}
    out += [r for r in old if r["url"] not in seen]
    f.write_text(json.dumps(out, ensure_ascii=False))
    print(f"搞掂 {len(out)} 件")


main()
