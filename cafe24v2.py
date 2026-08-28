"""Cafe24 通用爬蟲 v2 —— 由首頁自己搵分類頁。

點解要 v2：好多 Cafe24 主題唔用 /product/list.html?cate_no=N，
用嘅係 SEO 路徑 /category/<名>/<no>/。舊版 hardcode 咗前者，
撞到 botoacai、bouquetgarni 呢啲就爬到 0 件。
"""
import json, re, sys, time, urllib.request
from pathlib import Path
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'}
OUT=Path('/Volumes/core/ouji-ads/brandsrc'); OUT.mkdir(parents=True,exist_ok=True)
BAD=('logo','icon','banner','payment','favicon','placeholder','btn_','common/','shipping','sns')

def text(u,t=25):
    return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=t).read().decode('utf8','ignore')

def cats(host):
    h=text(f'https://{host}/')
    out=set(re.findall(r'href="(/category/[^"]+/\d+/?)"',h))
    out |= {f'/product/list.html?cate_no={n}' for n in set(re.findall(r'cate_no=(\d+)',h))}
    out.add('/')                       # 首頁本身通常已經排晒主打貨
    return sorted(out)[:60]

# ⚠️ Cafe24 有兩種產品連結：舊嘅 ?product_no=123，同 SEO 路徑
#    /product/<韓文 slug>/123/category/…。botoacai、frudia 呢類新主題
#    淨係出後者，淨係捉 product_no= 會爬到 0 件。
PNO = re.compile(r'product_no=(\d+)|/product/[^"\s/]+/(\d+)/')

def products(host, path):
    h=text(f'https://{host}{path}')
    seen={}
    for m in PNO.finditer(h):
        no=m.group(1) or m.group(2)
        if no in seen: continue
        chunk=h[m.end():m.end()+1800]
        im=re.search(r'<img[^>]+src="([^"]+)"[^>]*alt="([^"]{3,90})"',chunk) or \
           re.search(r'<img[^>]+alt="([^"]{3,90})"[^>]*src="([^"]+)"',chunk)
        if not im: continue
        g=im.groups()
        img,name=(g[0],g[1]) if g[0].startswith(('http','/','//')) else (g[1],g[0])
        name=name.strip()
        if any(k in name for k in ('장바구니','관심상품','이미지 보기')) or any(b in img.lower() for b in BAD):
            continue
        img='https:'+img if img.startswith('//') else (f'https://{host}{img}' if img.startswith('/') else img)
        seen[no]={'no':no,'title':name,'imgs':[img],'detail':[],'options':[],
                  'url':f'https://{host}/product/detail.html?product_no={no}'}
    return seen

def crawl(brand, host):
    allp={}
    for c in cats(host):
        try: allp.update(products(host,c))
        except Exception: pass
        time.sleep(0.5)
        if len(allp)>400: break
    (OUT/f'{brand}.json').write_text(json.dumps(list(allp.values()),ensure_ascii=False))
    print(f'{brand:<16}{host:<22}{len(allp)} 件',flush=True)

for arg in sys.argv[1:]:
    b,h=arg.split('=')
    try: crawl(b,h)
    except Exception as e: print(f'{b:<16}{h:<22}✗ {type(e).__name__}',flush=True)
