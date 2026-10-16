"""攞 Olive Young Global 評分＋評論原文（headless API）。
python3 fetch_oy.py work/match-oy.json   # [{h, no}]  → work/raw-oy/<no>.json"""
import json, os, sys, time, threading
from oyapi import OY

W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
OUT = f'{W}/raw-oy'
os.makedirs(OUT, exist_ok=True)
jobs = list(dict.fromkeys(m['no'] for m in json.load(open(sys.argv[1])) if m.get('no')))
jobs = [n for n in jobs if not os.path.exists(f'{OUT}/{n}.json')]
print(len(jobs), 'to fetch', flush=True)
lock = threading.Lock()

def work():
    oy = OY()
    while True:
        with lock:
            if not jobs: return
            no = jobs.pop()
        try:
            p = oy.detail(no)
            s = oy.summary(p)
            revs = []
            for page in (1, 2, 3):
                r = oy.reviews(p, page=page, rows=20)
                revs += r.get('reviewList') or []
                if len(r.get('reviewList') or []) < 20: break
                time.sleep(0.3)
            json.dump({'no': no, 'name': p.get('prdtName'), 'brand': p.get('brandName'),
                       'summary': s, 'reviews': revs}, open(f'{OUT}/{no}.json', 'w'), ensure_ascii=False)
            print('ok', no, s.get('totalReviewCount'), len(revs), flush=True)
        except Exception as e:
            print('err', no, str(e)[:100], flush=True)
            time.sleep(8)
            try: oy = OY()
            except Exception: time.sleep(20)
        time.sleep(0.4)

ts = [threading.Thread(target=work) for _ in range(3)]
[t.start() for t in ts]; [t.join() for t in ts]
print('DONE')
