"""爬 ABW（asianbeautywholesale.com）—— 老闆話大部分貨都係喺度入。

點解值得爬：佢係**真正嘅供應商**，而且產品頁有 EAN／JAN 條碼。
條碼夾條碼＝零猜測，唔使再靠夾名。
"""
import json, re, sys, time, urllib.request
from pathlib import Path
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'}
OUT=Path('/Volumes/core/ouji-ads/abw'); OUT.mkdir(parents=True, exist_ok=True)

def get(u,t=40,tries=4):
    """⚠️ 慢慢嚟。第一次爬 0.25 秒一版，爬到一半就 429 Too Many Requests。
    ABW 係老闆真正嘅供應商，畀人封 IP 就唔止影響上貨。"""
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=t).read().decode('utf8','ignore')
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(20 * (i + 1))    # 撞到限速就等耐啲
                continue
            if i==tries-1: raise
            time.sleep(2)
        except Exception:
            if i==tries-1: raise
            time.sleep(2)

def parse_list(h):
    return [{'pid':m.group(1),'name':m.group(2),'img':m.group(3),'brand':m.group(4),'url':m.group(5)}
            for m in re.finditer(r'"product":\{"productId":(\d+),"name":"([^"]+)","images":\{"m":"([^"]+)"\},"brandName":"([^"]*)"\}.*?"url":"([^"]+)"', h)]

def brand_ids():
    h=get('https://www.asianbeautywholesale.com/en/brands/list.html/bpt.300')
    # ⚠️ 個頁有兩處都似牌子清單：HTML 連結嗰堆只得 32 個（首頁精選），
    #    真正 1,031 個牌子喺埋入面嗰段 JSON。用 href 嗰個 regex 會靜靜哋
    #    少咗 97% 牌子，我第一次就係咁行到「要爬 0 個牌子」。
    # ⚠️ URL 要連牌子 slug（/en/ootd/list.html/…），淨係 /en/brands/ 會 404。
    #    所以直接由 JSON 攞返每個牌子個 url，唔好自己砌。
    out = {}
    for m in re.finditer(r'"brand":\{"brandId":(\d+),"name":"([^"]+)".*?"url":"([^"]+)".*?"m_productCount":(\d+)', h):
        out[m.group(2)] = {"id": m.group(1), "url": m.group(3), "n": int(m.group(4))}
    return out

def crawl_brand(info, name):
    out, pn = [], 1
    base = info["url"]
    # ⚠️ 唯一嘅分頁參數係 ?pn=N，一頁 36 件。加 ?oc=60 會令 totalCount 變 0
    #    ——頁面照回 200，但一件產品都冇，靜靜哋當「爬完」。第一版就係咁
    #    爬到 CORINGCO 243 件變 0 件。第 1 頁要用淨嘅 URL，唔好加 ?pn=1。
    while pn <= 30:
        h=get(base if pn == 1 else f'{base}?pn={pn}')
        ps=parse_list(h)
        if not ps: break
        out += ps
        tc=re.search(r'"totalCount":(\d+)',h)
        if tc and len(out) >= int(tc.group(1)): break
        pn += 1
        time.sleep(1.5)
    return out

BARCODE=re.compile(r'\b(\d{13})\b')
# ⚠️ 唔可以加 \b：gallery id 喺 HTML 度多數係 `L_g0220060132_000` 咁樣出現，
#    `_g` 之間根本冇 word boundary，加咗就成個 brand 爬到 0 張圖。
GID=re.compile(r'(g0\d{9})')

def gallery(html):
    """由 HTML 直接攞 gallery 圖 —— 唔好自己砌 URL。

    ⚠️ ABW 有兩種 gallery URL：一個 gid 配 `_000/_001/…`（FRUDIA 咁），
    同一個 gid 對一張圖、冇後綴（Lovisia 咁）。自己砌 `_000` 嘅話，
    第二種會全部 404 —— Lovisia 就係咁爬到 0 張。
    兩種喺 HTML 度都係現成寫住嘅，直接抽出嚟最穩陣。
    """
    base = 'https://d1flfk77wl2xk4.cloudfront.net/Assets/'
    return [base + u for u in dict.fromkeys(re.findall(r'GalleryImage/[^"\']+\.jpg', html))]


def detail(url):
    h=get(url)
    codes=[c for c in BARCODE.findall(h) if c[0] in '3489']   # EAN/JAN 前綴
    return list(dict.fromkeys(codes))[:4], gallery(h)[:28]

def main():
    want=[w.strip() for w in sys.argv[1:]] or None
    ids=brand_ids()
    Path(OUT/'brands.json').write_text(json.dumps(ids, ensure_ascii=False))
    targets={n:i for n,i in ids.items() if not want or any(w.lower() in n.lower() for w in want)}
    print(f'要爬 {len(targets)} 個牌子：' + ', '.join(f'{k}({v["n"]})' for k,v in targets.items()), flush=True)
    for n,i in targets.items():
        f=OUT/f'{re.sub(r"[^A-Za-z0-9]+","_",n)}.json'
        if f.exists(): print('↷', n); continue
        try:
            ps=crawl_brand(i,n)
        except Exception as e:
            print('✗',n,type(e).__name__); continue
        for p in ps:
            try:
                p['barcodes'], p['imgs'] = detail(p['url'])
            except Exception:
                p['barcodes'], p['imgs'] = [], []
            time.sleep(1.2)
        f.write_text(json.dumps(ps, ensure_ascii=False))
        nb=sum(1 for p in ps if p['barcodes'])
        print(f'✓ {n}: {len(ps)} 件，有條碼 {nb}', flush=True)

main()
