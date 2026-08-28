"""攞 Cafe24 detail 頁嘅大圖庫 ＋ 長圖（#prdDetail 入面嗰疊）。

老闆企硬要長圖：「長圖你都要有嘅，你明唔明啊？」
"""
import json, re, sys, time, urllib.request
from pathlib import Path
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'}
BAD=('logo','icon','banner','payment','favicon','placeholder','btn_','/common/','shipping','sns','/img/pc/','/img/mobile/')

def text(u,t=30):
    return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=t).read().decode('utf8','ignore')

def absu(host,u):
    return 'https:'+u if u.startswith('//') else (f'https://{host}{u}' if u.startswith('/') else u)

def grab(url):
    host=re.match(r'https://([^/]+)',url).group(1)
    h=text(url)
    # ⚠️ 有啲 Cafe24 店（chwi）啲圖庫係擺喺 ecimg.cafe24img.com 而唔係自己個
    #    domain，淨係 /web/product/… 咁寫。用鋪頭 host 補前綴會 404，
    #    攞到 0 張圖。og:image 有齊完整 URL，用佢個前綴砌返。
    og=re.search(r'og:image" content="(https://[^"/]+/[^"]*?)/web/product/', h)
    pre=og.group(1) if og else f'https://{host}'
    gal=[(u if u.startswith('http') else pre+u)
         for u in re.findall(r'["\'(]([^"\'()]*?/web/product/(?:big|extra/big)/[^"\'()]+)["\')]',h)]
    i=h.find('prdDetail')
    det=[]
    if i>0:
        det=[absu(host,u) for u in re.findall(r'src="([^"]+\.(?:jpg|jpeg|png|gif))"',h[i:i+400000])]
    f=lambda L: list(dict.fromkeys(x for x in L if not any(b in x.lower() for b in BAD)))
    return f(gal)[:8], f(det)[:14]

rows=json.loads(Path(sys.argv[1]).read_text())
for r in rows:
    try:
        g,d=grab(r['url'])
    except Exception as e:
        g,d=[],[]; print('✗',r['pos'][:30],type(e).__name__)
    if g: r['img']=g
    r['detail']=d
    print(f"  {r['pos'][:34]:<36} 相{len(r['img'])} 長{len(d)}",flush=True)
    time.sleep(0.8)
Path(sys.argv[1]).write_text(json.dumps(rows,ensure_ascii=False,indent=1))
print('更新咗',sys.argv[1])
