"""收 Cafe24 站嘅 product_no → 產品名，用 **SEO 路徑個 slug** 做名。

點解唔用列表頁 <img alt>：好多主題（vitaminvillage、fscos）啲 alt 係
「에센스 마스크」呢類通用字，認唔到味道／規格。SEO 路徑
`/product/<韓文-slug>/<no>/` 入面個 slug 反而係完整產品名。
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'}

def text(u,t=25):
    return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=t).read().decode('utf8','ignore')

def crawl(host):
    home=text(f'https://{host}/')
    cats=set(re.findall(r'href="(/category/[^"]+/\d+/?)"',home))
    cats |= {f'/product/list.html?cate_no={n}' for n in set(re.findall(r'cate_no=(\d+)',home))}
    cats.add('/')
    out={}
    for c in sorted(cats)[:70]:
        for pn in range(1,6):
            try: h=text(f'https://{host}{c}' + ('' if pn==1 else ('&' if '?' in c else '?')+f'page={pn}'))
            except Exception: break
            found=False
            for m in re.finditer(r'href="/product/([^"/]+)/(\d+)/', h):
                slug=urllib.parse.unquote(m.group(1)).replace('-',' ')
                if m.group(2) not in out: out[m.group(2)]=slug; found=True
            if not found: break
            time.sleep(0.4)
    return out

host=sys.argv[1]; name=sys.argv[2]
d=crawl(host)
Path(f'/tmp/{name}_slugs.json').write_text(json.dumps(d,ensure_ascii=False))
print(f'{name}: {len(d)} 件')
