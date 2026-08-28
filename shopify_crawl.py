"""爬任何 Shopify 店嘅 /products.json，出 <slug>_all.json。"""
import json, sys, time, urllib.request
from pathlib import Path
UA={'User-Agent':'Mozilla/5.0 Chrome/120'}
for host in sys.argv[1:]:
    slug=host.replace('www.','').split('.')[0]
    out=[]; page=1
    while page<=120:
        u=f'https://{host}/products.json?limit=250&page={page}'
        try:
            d=json.loads(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=40).read())
        except Exception:
            time.sleep(4); page+=1; continue
        ps=d.get('products',[])
        if not ps: break
        for p in ps:
            out.append({'title':p['title'],'vendor':p.get('vendor',''),
                        'url':f"https://{host}/products/{p['handle']}",
                        'images':[i['src'] for i in p.get('images',[])][:8],
                        'body':(p.get('body_html') or '')[:600]})
        page+=1; time.sleep(0.6)
    Path(f'{slug}_all.json').write_text(json.dumps(out,ensure_ascii=False))
    print(f'{host:<24}{len(out)} 件',flush=True)
