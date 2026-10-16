"""爬 Olive Young Global 目錄：由已知 prdtNo 出發，經 relation-list 搵相關／同品牌產品。
我哋有賣嘅品牌優先爬。4 線程，每線程一個 session。
輸出 work/oy-catalog-full.json：{prdtNo: {n, b, s, c}}"""
import json, os, re, sys, time, heapq, threading
from oyapi import OY

W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
OUT = f'{W}/oy-catalog-full.json'
MAX = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
NT = 4
flat = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())

ours = {flat(v['vendor']) for v in json.load(open(f'{W}/vendors.json'))}
ours |= {flat(p['v']) for p in json.load(open('/Volumes/core/Projects/OUJI/Website-and-Design/ouji-oy/our-products.json'))}
ours.discard('')

def mine(brand):
    b = flat(brand)
    return bool(b) and any(b == o or (len(o) > 3 and (b.startswith(o) or o.startswith(b))) for o in ours)

cat = json.load(open(OUT)) if os.path.exists(OUT) else {}
for p in json.load(open('/Volumes/core/Projects/OUJI/Website-and-Design/ouji-oy/oy-catalog.json')):
    cat.setdefault(p['no'], {'n': p['n'], 'b': p['b'], 's': p['s'], 'c': p['c']})
seen = set(json.load(open(f'{W}/oy-crawled.json'))) if os.path.exists(f'{W}/oy-crawled.json') else set()
sm = open('/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/probe/oysm.xml').read()
heap, queued = [], set()
def push(no, brand):
    if no in seen or no in queued: return
    queued.add(no)
    heapq.heappush(heap, (0 if mine(brand) else 1, no))
for no, v in cat.items(): push(no, v['b'])
for no in re.findall(r'prdtNo=(GA\d+)', sm): push(no, '')
lock = threading.Lock()
calls = [0]

def worker():
    oy = OY()
    while True:
        with lock:
            if not heap or calls[0] >= MAX: return
            pri, no = heapq.heappop(heap)
            seen.add(no)
        try:
            r = oy.post('/product/relation-list', {'prdtNo': no}, f'https://global.oliveyoung.com/product/detail?prdtNo={no}')
        except Exception as e:
            print('err', no, str(e)[:80], flush=True); time.sleep(10)
            try: oy = OY()
            except Exception: time.sleep(30)
            continue
        with lock:
            calls[0] += 1
            for k in ('ctgrRelation', 'brandRelation'):
                for x in r.get(k) or []:
                    p = x.get('prdtNo')
                    if not p: continue
                    if p not in cat:
                        cat[p] = {'n': x.get('prdtName'), 'b': x.get('brandName'), 's': x.get('avgScore'), 'c': x.get('reviewCnt')}
                    push(p, x.get('brandName'))
            if calls[0] % 200 == 0:
                json.dump(cat, open(OUT, 'w'), ensure_ascii=False)
                json.dump(sorted(seen), open(f'{W}/oy-crawled.json', 'w'))
                mineq = sum(1 for x in heap if x[0] == 0)
                print(f'calls={calls[0]} catalog={len(cat)} heap={len(heap)} mine_pending={mineq} brands={len({v["b"] for v in cat.values()})}', flush=True)
        time.sleep(0.3)

ts = [threading.Thread(target=worker) for _ in range(NT)]
for t in ts: t.start()
for t in ts: t.join()
json.dump(cat, open(OUT, 'w'), ensure_ascii=False)
json.dump(sorted(seen), open(f'{W}/oy-crawled.json', 'w'))
print('DONE', calls[0], len(cat), len(heap))
