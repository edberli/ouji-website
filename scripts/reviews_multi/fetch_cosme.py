"""攞 @cosme 評論（評分由品牌目錄 cosme-cat 攞，唔使開產品頁）。
python3 fetch_cosme.py work/match-cosme.json   # [{h, id}] → work/raw-cosme/<id>.json
每件：評論列表頭 2 頁（20 則摘要）＋被截斷而又揀中嘅開全文（最多 5 則）。全程經 cosme.get 限速。"""
import glob, json, os, re, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cosme

W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
OUT = f'{W}/raw-cosme'
os.makedirs(OUT, exist_ok=True)
PRICE = re.compile(r'コスパ|安い|安く|高い|お得|セール|割引|値段|価格|プチプラ|\d+円|円で|値上|値下|安価|高価|クーポン|ポイント')
CAT = {}
for f in glob.glob(f'{W}/cosme-cat/*.json'):
    for c in json.load(open(f)): CAT[c['id']] = c
jobs = list(dict.fromkeys(str(m['id']) for m in json.load(open(sys.argv[1])) if m.get('id')))
jobs = [n for n in jobs if not os.path.exists(f'{OUT}/{n}.json')]
print(len(jobs), 'to fetch', flush=True)
lock = threading.Lock()


def choose(rows, n=8):
    ok = [r for r in rows if r['star'] and len(r['excerpt']) >= 20 and not PRICE.search(r['excerpt'])]
    low = [r for r in ok if r['star'] <= 4]
    chosen = [max(low, key=lambda r: len(r['excerpt']))] if low else []
    rest = sorted([r for r in ok if r not in chosen], key=lambda r: -len(r['excerpt']))
    return chosen + rest[:n + 3 - len(chosen)]     # 多揀 3 則後備（全文可能講價錢要剷）


def work():
    while True:
        with lock:
            if not jobs: return
            pid = jobs.pop()
        try:
            rows, total = [], None
            for page in (1, 2):
                rs, t = cosme.review_list(pid, page)
                total = total or t
                rows += rs
                if len(rs) < 10: break
            full, fetched = [], 0
            for r in choose(rows):
                if len(full) >= 8: break
                if r['excerpt'].endswith('…'):
                    if fetched >= 2: continue
                    f = cosme.review_full(r['rid']); fetched += 1
                    if not f or not f['text']: continue
                else:
                    f = {'rid': r['rid'], 'text': r['excerpt'], 'star': r['star'], 'date': r['date'], 'shade': '', 'pid': pid}
                if PRICE.search(f['text']): continue
                f.update(who=r['who'], profile=r['profile'], bought=r['bought'])
                full.append(f)
            c = CAT.get(pid) or {}
            p = {'id': pid, 'title': c.get('name', ''), 'star': c.get('star')}
            if p['star'] is None:
                p = cosme.product(pid) or p
            json.dump({'id': pid, 'product': p, 'total': total, 'list': rows, 'full': full},
                      open(f'{OUT}/{pid}.json', 'w'), ensure_ascii=False)
            print('ok', pid, p.get('star'), total, len(full), flush=True)
        except Exception as e:
            print('err', pid, str(e)[:120], flush=True)


ts = [threading.Thread(target=work) for _ in range(2)]
[t.start() for t in ts]; [t.join() for t in ts]
print('DONE')
