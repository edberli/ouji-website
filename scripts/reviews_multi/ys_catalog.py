"""YesStyle 品牌目錄：python3 ys_catalog.py <vendors.json>  [{vendor, q}]  → work/ys-cat/<slug>.json"""
import json, os, re, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ys
W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
os.makedirs(f'{W}/ys-cat', exist_ok=True)
for v in json.load(open(sys.argv[1])):
    slug = re.sub(r'[^A-Za-z0-9]+', '-', v['vendor']).strip('-').lower() or 'x'
    out = f'{W}/ys-cat/{slug}.json'
    if os.path.exists(out): continue
    items, seen = [], set()
    for pn in range(1, 6):
        q = v['q'] + (f'&pn={pn}' if pn > 1 else '')
        h = ys.get('https://www.yesstyle.com/en/list.html?q=' + urllib.parse.quote_plus(v['q']) + (f'&pn={pn}' if pn > 1 else ''))
        ys.token(h)
        import html as H
        new = 0
        for blk in re.split(r'<a class="[^"]*itemContainer[^"]*"', h)[1:]:
            m = re.search(r'href="(/en/([a-z0-9-]+)/info\.html/pid\.(\d+))"', blk[:600])
            if not m or m.group(3) in seen: continue
            seen.add(m.group(3)); new += 1
            cnt = re.search(r'newReviewCount[^>]*>([\d,]+)<', blk)
            items.append({'pid': m.group(3), 'name': m.group(2).replace('-', ' '),
                          'reviews': int(cnt.group(1).replace(',', '')) if cnt else 0})
        time.sleep(1.5)
        if new < 20: break
    json.dump(items, open(out, 'w'), ensure_ascii=False)
    print(v['vendor'], len(items), sum(1 for x in items if x['reviews']), flush=True)
print('DONE')
